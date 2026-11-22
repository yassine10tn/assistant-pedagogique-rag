"""Retriever : index FAISS et recherche de passages."""

import json
from pathlib import Path

import faiss
import numpy as np

from src.embeddings import embed_chunks, embed_query

INDEX_DIR = Path("data/processed")
INDEX_FILE = INDEX_DIR / "index.faiss"
CHUNKS_FILE = INDEX_DIR / "chunks.json"


def build_index(chunks: list[dict]) -> None:
    """Calcule les embeddings, crée l'index FAISS et le sauvegarde."""
    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    vectors = embed_chunks(chunks).astype("float32")
    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)

    faiss.write_index(index, str(INDEX_FILE))
    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)


def load_index():
    """Charge l'index FAISS et la liste des chunks depuis le disque."""
    index = faiss.read_index(str(INDEX_FILE))
    with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    return index, chunks


def search(question: str, k: int = 3) -> list[dict]:
    """Retourne les k chunks les plus proches de la question."""
    index, chunks = load_index()
    q = embed_query(question).astype("float32")
    scores, ids = index.search(q, k)

    results = []
    for score, i in zip(scores[0], ids[0]):
        chunk = dict(chunks[i])
        chunk["score"] = float(score)
        results.append(chunk)
    return results


if __name__ == "__main__":
    from src.ingestion import load_pdf, chunk_pages

    # 1. Construire l'index (une seule fois)
    all_chunks = []
    for pdf in Path("data/raw").glob("*.pdf"):
        all_chunks.extend(chunk_pages(load_pdf(str(pdf)), source=pdf.name))
    build_index(all_chunks)
    print(f"Index créé avec {len(all_chunks)} chunks")

    # 2. Tester la recherche
    question = "Comment Word2Vec calcule les scores ?"
    print("Question :", question)
    for r in search(question, k=3):
        print(f"- score {r['score']:.3f} | {r['source']} | page {r['page']} | {r['text'][:100]}...")