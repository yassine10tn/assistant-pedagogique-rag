"""Embeddings : transformer les chunks en vecteurs."""

from sentence_transformers import SentenceTransformer

MODEL_NAME = "intfloat/multilingual-e5-small"
_model = None


def get_model():
    """Charge le modèle une seule fois."""
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed_chunks(chunks: list[dict]):
    """Transforme chaque chunk en vecteur."""
    model = get_model()
    texts = ["passage: " + c["text"] for c in chunks]
    return model.encode(texts, normalize_embeddings=True, show_progress_bar=True)


def embed_query(question: str):
    """Transforme la question en vecteur."""
    model = get_model()
    return model.encode(["query: " + question], normalize_embeddings=True)


if __name__ == "__main__":
    from pathlib import Path
    from src.ingestion import load_pdf, chunk_pages

    chunks = []
    for pdf in Path("data/raw").glob("*.pdf"):
        chunks.extend(chunk_pages(load_pdf(str(pdf)), source=pdf.name))

    vectors = embed_chunks(chunks)
    print("Forme des vecteurs :", vectors.shape)

    question = "Comment Word2Vec calcule les scores ?"
    q = embed_query(question)
    scores = (vectors @ q.T).flatten()
    best = scores.argsort()[::-1][:3]

    print("Question :", question)
    for i in best:
        print(f"- score {scores[i]:.3f} | page {chunks[i]['page']} | {chunks[i]['text'][:100]}...")