"""RAG : retrieval + génération avec citations."""

from src.llm import generate
from src.retriever import retrieve, format_context

NO_ANSWER = "Je ne trouve pas la réponse dans les documents."

SYSTEM_PROMPT = f"""Tu es un assistant pédagogique. Tu réponds en français.

Règles strictes :
1. Réponds UNIQUEMENT à partir des extraits fournis. N'utilise pas tes connaissances personnelles.
2. Cite tes sources avec le format [Source n] après chaque information.
3. Si les extraits ne contiennent pas la réponse, réponds exactement : "{NO_ANSWER}"
4. Sois clair et concis, comme pour expliquer à un étudiant."""


def build_prompt(question: str, context: str) -> str:
    """Construit le prompt utilisateur : extraits + question."""
    return f"""Extraits des documents :

{context}

Question : {question}

Réponse (avec [Source n]) :"""


def answer(question: str) -> dict:
    """Répond à une question avec le pipeline RAG.

    Retourne {"answer": str, "sources": list[dict]}.
    """
    chunks = retrieve(question)

    # Aucun passage assez proche : pas besoin d'appeler le LLM
    if not chunks:
        return {"answer": NO_ANSWER, "sources": []}

    context = format_context(chunks)
    prompt = build_prompt(question, context)
    text = generate(prompt, system=SYSTEM_PROMPT, temperature=0.2)

    sources = [
        {"source": c["source"], "page": c["page"], "score": round(c["score"], 3)}
        for c in chunks
    ]
    return {"answer": text, "sources": sources}


if __name__ == "__main__":
    questions = [
        "Comment Word2Vec calcule les scores ?",
        "Qu'est-ce que le Masked Language Modeling ?",
        "Comment faire un couscous ?",
    ]
    for q in questions:
        result = answer(q)
        print(f"\nQ : {q}")
        print(f"R : {result['answer']}")
        for s in result["sources"]:
            print(f"   - {s['source']}, page {s['page']} (score {s['score']})")