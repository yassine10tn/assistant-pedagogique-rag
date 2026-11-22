"""API FastAPI : expose le pipeline RAG (chat, résumé, quiz, upload) au front-end."""

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.quiz import generate_quiz
from src.rag import answer
from src.retriever import rebuild_index
from src.summarizer import summarize_pdf

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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/documents")
def documents():
    return {"documents": sorted(p.name for p in RAW_DIR.glob("*.pdf"))}


@app.post("/upload")
def upload(file: UploadFile = File(...)):
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
def chat(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="La question est vide.")
    return answer(req.question)


@app.post("/summary")
def summary(req: SummaryRequest):
    try:
        text = summarize_pdf(req.filename, req.level)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF introuvable.")
    return {"filename": req.filename, "level": req.level, "summary": text}


@app.post("/quiz")
def quiz(req: QuizRequest):
    if not 1 <= req.n <= 10:
        raise HTTPException(status_code=400, detail="n doit être entre 1 et 10.")
    try:
        questions = generate_quiz(req.topic, n=req.n, difficulty=req.difficulty)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"topic": req.topic, "questions": questions}