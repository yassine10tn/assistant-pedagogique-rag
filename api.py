"""API FastAPI : RAG + authentification sécurisée (rôles, JWT, verrouillage, audit)."""

from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.quiz import generate_quiz
from src.rag import answer
from src.ratelimit import hit
from src.retriever import rebuild_index
from src.security import create_token, current_user, require_admin, require_internal
from src.summarizer import summarize_pdf
from src.users import (
    change_password, create_user, delete_user, list_audit,
    update_name, upsert_google_user, verify_user,
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


# ---------- Public ----------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/register")
def register(req: RegisterRequest, request: Request):
    hit(f"register:{request.client.host}", 10, 3600)
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="Email invalide.")
    try:
        return create_user(req.name or req.email.split("@")[0], req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.post("/auth/login")
def login(req: LoginRequest):
    hit(f"login:{req.email.strip().lower()}", 10, 60)
    try:
        user = verify_user(req.email, req.password)
    except PermissionError as e:
        raise HTTPException(status_code=423, detail=str(e))
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects ou compte désactivé.")
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
    return {"filename": name, "chunks": n_chunks}


@app.post("/chat")
def chat(req: ChatRequest, user: dict = Depends(current_user)):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="La question est vide.")
    return answer(req.question)


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
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"topic": req.topic, "questions": questions}


# ---------- Admin ----------

@app.get("/admin/ping")
def admin_ping(user: dict = Depends(require_admin)):
    return {"ok": True, "admin": user["email"]}


@app.get("/admin/audit")
def admin_audit(user: dict = Depends(require_admin)):
    return {"events": list_audit(100)}