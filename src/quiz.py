"""Génération de QCM à partir des documents."""

import json
import re

from src.llm import generate
from src.retriever import retrieve, format_context

SYSTEM = (
    "Tu es un professeur qui crée des QCM en français. "
    "Tu utilises uniquement les extraits fournis, sans rien inventer. "
    "Tu réponds uniquement avec du JSON valide, sans texte avant ni après."
)

DIFFICULTY = {
    "facile": "Questions simples sur les définitions et les faits de base.",
    "moyen": "Questions de compréhension qui demandent d'expliquer un concept.",
    "difficile": "Questions d'application ou de raisonnement, avec des distracteurs plausibles.",
}


def build_quiz_prompt(context: str, n: int, difficulty: str) -> str:
    return f"""Extraits du cours :

{context}

Crée {n} QCM. Niveau : {DIFFICULTY[difficulty]}

Chaque question a 4 choix, dont un seul correct.
Règles :
- Les 4 choix doivent être courts (maximum 10 mots) et ne pas répéter la question.
- Un seul choix est correct. Les 3 autres sont plausibles mais faux.
- Un choix ne doit jamais contenir un autre choix.
- "explanation" explique POURQUOI la réponse est correcte, sans répéter le choix.
- Les choix faux doivent être clairement faux : aucun ne doit être partiellement correct.
Réponds avec ce format JSON exact :
[
  {{"question": "...", "choices": ["...", "...", "...", "..."], "answer": 0, "explanation": "..."}}
]
"answer" est l'indice (0 à 3) du bon choix."""


def parse_quiz(raw: str) -> list[dict]:
    """Extrait la liste JSON de la réponse du LLM (tolérant aux erreurs)."""
    start = raw.find("[")
    if start == -1:
        raise ValueError("Aucun JSON trouvé dans la réponse du LLM")

    # raw_decode lit le premier JSON valide et ignore tout ce qui suit
    decoder = json.JSONDecoder()
    data, _ = decoder.raw_decode(raw[start:])
    return data


def generate_quiz(topic: str, n: int = 3, difficulty: str = "moyen", retries: int = 3) -> list[dict]:
    """Génère n QCM sur un sujet. Réessaie si le JSON est invalide."""
    chunks = retrieve(topic, k=5, min_score=0.0)
    context = format_context(chunks)
    prompt = build_quiz_prompt(context, n, difficulty)

    for attempt in range(retries):
        raw = generate(prompt, system=SYSTEM, temperature=0.4)
        try:
            return parse_quiz(raw)
        except (ValueError, json.JSONDecodeError):
            print(f"JSON invalide (tentative {attempt + 1}/{retries}), nouvel essai...")
    raise ValueError("Le LLM n'a pas produit un JSON valide après plusieurs essais")


if __name__ == "__main__":
    quiz = generate_quiz("Word2Vec", n=3, difficulty="moyen")
    for i, q in enumerate(quiz, start=1):
        print(f"\nQ{i}. {q['question']}")
        for j, c in enumerate(q["choices"]):
            print(f"   {'ABCD'[j]}. {c}")
        print(f"   Réponse : {'ABCD'[q['answer']]}")
        print(f"   Explication : {q['explanation']}")