"""Retriever : index FAISS et recherche de passages."""

import json
from pathlib import Path

import faiss
import numpy as np

from src.embeddings import embed_chunks, embed_query

RAW_DIR = Path("data/raw")
INDEX_DIR = Path("data/processed")
INDEX_FILE = INDEX_DIR / "index.faiss"
CHUNKS_FILE = INDEX_DIR / "chunks.json"

MIN_SCORE = 0.78


def build_index(chunks: list[dict]) -> None:
    """Calcule les embeddings, crée l'index FAISS et le sauvegarde."""
    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    vectors = embed_chunks(chunks).astype("float32")
    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)

    INDEX_FILE.write_bytes(faiss.serialize_index(index).tobytes())
    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)


def load_index():
    """Charge l'index FAISS et la liste des chunks depuis le disque."""
    index = faiss.deserialize_index(np.frombuffer(INDEX_FILE.read_bytes(), dtype="uint8"))
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


def retrieve(question: str, k: int = 4, min_score: float = MIN_SCORE) -> list[dict]:
    """Retourne les chunks pertinents. Liste vide si rien n'est assez proche."""
    results = search(question, k=k)
    return [r for r in results if r["score"] >= min_score]


def format_context(chunks: list[dict]) -> str:
    """Construit le texte de contexte envoyé au LLM, avec les sources."""
    parts = []
    for n, c in enumerate(chunks, start=1):
        parts.append(f"[Source {n} : {c['source']}, page {c['page']}]\n{c['text']}")
    return "\n\n".join(parts)


def rebuild_index() -> int:
    """Reconstruit l'index à partir de tous les PDF de data/raw."""
    from src.ingestion import load_pdf, chunk_pages

    all_chunks = []
    for pdf in sorted(RAW_DIR.glob("*.pdf")):
        pages = [p for p in load_pdf(str(pdf)) if p["page"] > 1]
        all_chunks.extend(chunk_pages(pages, source=pdf.name))

    if not all_chunks:
        raise ValueError("Aucun PDF trouvé dans data/raw")

    build_index(all_chunks)
    return len(all_chunks)


if __name__ == "__main__":
    n = rebuild_index()
    print(f"Index créé avec {n} chunks\n")

    for q in ["Comment Word2Vec calcule les scores ?", "Comment faire un couscous ?"]:
        best = search(q, k=3)[0]
        print(f"Q : {q}\n   score : {best['score']:.3f} | {best['source']} | page {best['page']}")