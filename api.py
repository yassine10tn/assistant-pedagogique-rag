"""API FastAPI : RAG + authentification sécurisée + administration."""

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.chatlog import chat_stats, clear_chats, delete_chat, list_chats, log_chat
from src.quiz import generate_quiz
from src.rag import NO_ANSWER, answer
from src.ratelimit import hit
from src.retriever import CHUNKS_FILE, INDEX_FILE, rebuild_index
from src.security import create_token, current_user, require_admin, require_internal
from src.summarizer import summarize_pdf
from src.users import (
    AccountDisabled, AccountLocked, GoogleOnlyAccount, InvalidCredentials,
    admin_emails, admin_update, change_password, check_password_strength, count_admins,
    create_user, delete_user, get_user, list_audit, list_users, log_event,
    unlock_user, update_name, upsert_google_user, user_stats, verify_user,
)

RAW_DIR = Path("data/raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Assistant pédagogique RAG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Modèles ----------

class ChatRequest(BaseModel):
    question: str


class SummaryRequest(BaseModel):
    filename: str
    level: Literal["court", "moyen", "detaille"] = "moyen"


class QuizRequest(BaseModel):
    topic: str
    n: int = 3
    difficulty: Literal["facile", "moyen", "difficile"] = "moyen"


class RegisterRequest(BaseModel):
    name: str = ""
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleUser(BaseModel):
    name: str = ""
    email: str


class ProfileRequest(BaseModel):
    name: str


class PasswordRequest(BaseModel):
    current: str
    new: str


class UserCreate(BaseModel):
    name: str = ""
    email: str
    password: str
    role: Literal["user", "admin"] = "user"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["user", "admin"]] = None
    active: Optional[bool] = None


def _minutes(seconds: int) -> str:
    m = max(1, -(-seconds // 60))
    return f"{m} minute{'s' if m > 1 else ''}"


# ---------- Public ----------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/register")
def register(req: RegisterRequest, request: Request):
    hit(f"register:{request.client.host if request.client else '?'}", 10, 3600)
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="Email invalide.")
    try:
        check_password_strength(req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        user = create_user(req.name or req.email.split("@")[0], req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {**user, "token": create_token(user)}


@app.post("/auth/login")
def login(req: LoginRequest, request: Request):
    hit(f"login-ip:{request.client.host if request.client else '?'}", 30, 60)
    hit(f"login:{req.email.strip().lower()}", 10, 60)
    try:
        user = verify_user(req.email, req.password)
    except AccountDisabled:
        raise HTTPException(status_code=403, detail={
            "code": "disabled", "message": "Ce compte a été désactivé. Contactez un administrateur."})
    except GoogleOnlyAccount:
        raise HTTPException(status_code=401, detail={
            "code": "google_only", "message": "Ce compte utilise Google. Cliquez sur « Continuer avec Google »."})
    except InvalidCredentials:
        raise HTTPException(status_code=401, detail={
            "code": "invalid", "message": "Email ou mot de passe incorrect."})
    return {**user, "token": create_token(user)}

@app.post("/auth/google", dependencies=[Depends(require_internal)])
def google_user(req: GoogleUser):
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="Email invalide.")
    user = upsert_google_user(req.name, req.email)
    if not user["active"]:
        raise HTTPException(status_code=403, detail="Compte désactivé.")
    return {**user, "token": create_token(user)}


# ---------- Utilisateur connecté ----------

@app.get("/auth/me")
def me(user: dict = Depends(current_user)):
    return user


@app.patch("/auth/profile")
def profile(req: ProfileRequest, user: dict = Depends(current_user)):
    try:
        return update_name(user["id"], req.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/password")
def password(req: PasswordRequest, user: dict = Depends(current_user)):
    try:
        change_password(user["id"], req.current, req.new)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}


@app.delete("/auth/me")
def delete_me(user: dict = Depends(current_user)):
    if user["email"] in admin_emails():
        raise HTTPException(status_code=400, detail="Le compte administrateur principal ne peut pas être supprimé.")
    delete_user(user["id"])
    return {"ok": True}


@app.get("/documents")
def documents(user: dict = Depends(current_user)):
    return {"documents": sorted(p.name for p in RAW_DIR.glob("*.pdf"))}


@app.post("/upload")
def upload(file: UploadFile = File(...), user: dict = Depends(current_user)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés.")
    name = Path(file.filename).name
    with open(RAW_DIR / name, "wb") as f:
        f.write(file.file.read())
    try:
        n_chunks = rebuild_index()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'indexation : {e}")
    log_event(user["email"], "document_uploaded", name)
    return {"filename": name, "chunks": n_chunks}


from src.chatlog import set_feedback


class FeedbackRequest(BaseModel):
    value: Literal[-1, 0, 1]


from src.chatlog import set_feedback


class FeedbackRequest(BaseModel):
    value: Literal[-1, 0, 1]


@app.post("/chat")
def chat(req: ChatRequest, user: dict = Depends(current_user)):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="La question est vide.")
    t0 = time.time()
    try:
        result = answer(req.question)
    except FileNotFoundError:
        raise HTTPException(status_code=409, detail="Aucun document indexé. Ajoutez un PDF dans « Documents ».")
    ms = int((time.time() - t0) * 1000)
    cid = None
    try:
        cid = log_chat(user["email"], req.question, result["answer"], result["sources"],
                       NO_ANSWER in result["answer"], ms)
    except Exception:
        pass
    return {**result, "id": cid}


@app.post("/chat/{cid}/feedback")
def feedback(cid: int, req: FeedbackRequest, user: dict = Depends(current_user)):
    if not set_feedback(cid, user["email"], req.value):
        raise HTTPException(status_code=404, detail="Conversation introuvable.")
    return {"ok": True}


@app.post("/summary")
def summary(req: SummaryRequest, user: dict = Depends(current_user)):
    try:
        text = summarize_pdf(req.filename, req.level)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF introuvable.")
    return {"filename": req.filename, "level": req.level, "summary": text}


@app.post("/quiz")
def quiz(req: QuizRequest, user: dict = Depends(current_user)):
    if not 1 <= req.n <= 10:
        raise HTTPException(status_code=400, detail="n doit être entre 1 et 10.")
    try:
        questions = generate_quiz(req.topic, n=req.n, difficulty=req.difficulty)
    except FileNotFoundError:
        raise HTTPException(status_code=409, detail="Aucun document indexé.")
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"topic": req.topic, "questions": questions}


# ---------- Admin : général ----------

@app.get("/admin/ping")
def admin_ping(admin: dict = Depends(require_admin)):
    return {"ok": True, "admin": admin["email"]}


@app.get("/admin/stats")
def admin_stats(admin: dict = Depends(require_admin)):
    n_chunks = 0
    if CHUNKS_FILE.exists():
        n_chunks = len(json.loads(CHUNKS_FILE.read_text(encoding="utf-8")))
    return {
        "users": user_stats(),
        "chats": chat_stats(),
        "documents": len(list(RAW_DIR.glob("*.pdf"))),
        "chunks": n_chunks,
    }


@app.get("/admin/audit")
def admin_audit(limit: int = 200, admin: dict = Depends(require_admin)):
    return {"events": list_audit(min(limit, 1000))}


# ---------- Admin : utilisateurs ----------

@app.get("/admin/users")
def admin_users(q: str = "", admin: dict = Depends(require_admin)):
    return {"users": list_users(q)}


@app.post("/admin/users")
def admin_create_user(req: UserCreate, admin: dict = Depends(require_admin)):
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="Email invalide.")
    try:
        check_password_strength(req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        return create_user(req.name or req.email.split("@")[0], req.email, req.password, req.role, actor=admin["email"])
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.patch("/admin/users/{uid}")
def admin_patch_user(uid: str, req: UserUpdate, admin: dict = Depends(require_admin)):
    target = get_user(uid)
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if req.role is not None or req.active is not None:
        if target["id"] == admin["id"]:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre rôle ou statut.")
        if target["email"] in admin_emails():
            raise HTTPException(status_code=400, detail="Compte administrateur principal : protégé.")
    if target["role"] == "admin" and count_admins() <= 1 and (req.role == "user" or req.active is False):
        raise HTTPException(status_code=400, detail="Impossible : c'est le dernier administrateur.")
    try:
        user = admin_update(uid, req.name, req.role, req.active)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    log_event(admin["email"], "admin_update_user", f"{target['email']} : {req.model_dump(exclude_none=True)}")
    return user


@app.post("/admin/users/{uid}/unlock")
def admin_unlock(uid: str, admin: dict = Depends(require_admin)):
    target = get_user(uid)
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    unlock_user(uid)
    log_event(admin["email"], "admin_unlock_user", target["email"])
    return {"ok": True}


@app.delete("/admin/users/{uid}")
def admin_delete_user(uid: str, admin: dict = Depends(require_admin)):
    target = get_user(uid)
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if target["id"] == admin["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte ici.")
    if target["email"] in admin_emails():
        raise HTTPException(status_code=400, detail="Compte administrateur principal : protégé.")
    if target["role"] == "admin" and count_admins() <= 1:
        raise HTTPException(status_code=400, detail="Impossible : c'est le dernier administrateur.")
    delete_user(uid, actor=admin["email"])
    return {"ok": True}


# ---------- Admin : documents ----------

def _reindex() -> int:
    if any(RAW_DIR.glob("*.pdf")):
        return rebuild_index()
    for f in (INDEX_FILE, CHUNKS_FILE):
        f.unlink(missing_ok=True)
    return 0


@app.get("/admin/documents")
def admin_documents(admin: dict = Depends(require_admin)):
    docs = []
    for p in sorted(RAW_DIR.glob("*.pdf")):
        st = p.stat()
        docs.append({
            "name": p.name, "size": st.st_size,
            "modified": datetime.fromtimestamp(st.st_mtime, timezone.utc).isoformat(timespec="seconds"),
        })
    return {"documents": docs}


@app.delete("/admin/documents/{name}")
def admin_delete_document(name: str, admin: dict = Depends(require_admin)):
    path = RAW_DIR / Path(name).name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Document introuvable.")
    path.unlink()
    try:
        chunks = _reindex()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de réindexation : {e}")
    log_event(admin["email"], "admin_delete_document", path.name)
    return {"ok": True, "chunks": chunks}


@app.post("/admin/reindex")
def admin_reindex(admin: dict = Depends(require_admin)):
    try:
        chunks = _reindex()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de réindexation : {e}")
    log_event(admin["email"], "admin_reindex", f"{chunks} chunks")
    return {"chunks": chunks}


# ---------- Admin : historique du chat ----------

@app.get("/admin/chats")
def admin_chats(q: str = "", limit: int = 200, admin: dict = Depends(require_admin)):
    return {"chats": list_chats(q, min(limit, 1000))}


@app.delete("/admin/chats/{cid}")
def admin_delete_chat(cid: int, admin: dict = Depends(require_admin)):
    if not delete_chat(cid):
        raise HTTPException(status_code=404, detail="Entrée introuvable.")
    return {"ok": True}


@app.delete("/admin/chats")
def admin_clear_chats(admin: dict = Depends(require_admin)):
    clear_chats()
    log_event(admin["email"], "admin_clear_chats")
    return {"ok": True}

# ---------- Ollama arrêté : message clair au lieu d'une erreur 500 ----------
from fastapi.responses import JSONResponse


@app.exception_handler(ConnectionError)
async def ollama_down(request: Request, exc: ConnectionError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Ollama n'est pas démarré. Lancez l'application Ollama puis réessayez."},
    )

# ---------- Admin : évaluation du RAG ----------
from src import evaluation


class EvalRequest(BaseModel):
    in_questions: list[str]
    out_questions: list[str]
    full: bool = True


@app.get("/admin/eval/defaults")
def eval_defaults(admin: dict = Depends(require_admin)):
    return {"in": evaluation.DEFAULT_IN, "out": evaluation.DEFAULT_OUT}


@app.post("/admin/eval/run")
def eval_run(req: EvalRequest, admin: dict = Depends(require_admin)):
    ins = [q.strip() for q in req.in_questions if q.strip()][:30]
    outs = [q.strip() for q in req.out_questions if q.strip()][:30]
    if not ins or not outs:
        raise HTTPException(status_code=400, detail="Fournissez des questions dans et hors du cours.")
    try:
        evaluation.start(ins, outs, req.full)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    log_event(admin["email"], "admin_eval_run", f"{len(ins)}+{len(outs)} questions")
    return {"started": True}


@app.get("/admin/eval/status")
def eval_status(admin: dict = Depends(require_admin)):
    return evaluation.status()


@app.get("/admin/eval/runs")
def eval_runs(admin: dict = Depends(require_admin)):
    return {"runs": evaluation.list_runs()}


@app.get("/admin/eval/runs/{run_id}")
def eval_get_run(run_id: int, admin: dict = Depends(require_admin)):
    run = evaluation.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Évaluation introuvable.")
    return {"run": run}


# ---------- Admin : parametres ----------
import json as _json
from typing import Optional
from pydantic import Field

from src import settings
from src.llm import installed_models


class SettingsUpdate(BaseModel):
    model: Optional[str] = None
    min_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    top_k: Optional[int] = Field(default=None, ge=1, le=10)


@app.get("/admin/settings")
def admin_get_settings(admin: dict = Depends(require_admin)):
    return {"settings": settings.get_all(), "models": installed_models()}


@app.put("/admin/settings")
def admin_put_settings(req: SettingsUpdate, admin: dict = Depends(require_admin)):
    if req.model is not None:
        models = installed_models()
        if models and req.model not in models:
            raise HTTPException(status_code=400, detail="Modele non installe dans Ollama (ollama pull ...).")
    new = settings.update(req.model_dump(exclude_none=True))
    log_event(admin["email"], "admin_update_settings", _json.dumps(new))
    return {"settings": new}
