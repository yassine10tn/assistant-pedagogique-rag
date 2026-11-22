"""LLM : communication avec Ollama."""

import ollama

MODEL_NAME = "llama3.1:8b"


def generate(prompt: str, system: str = "", temperature: float = 0.2) -> str:
    """Envoie un prompt au LLM et retourne la réponse (texte)."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = ollama.chat(
        model=MODEL_NAME,
        messages=messages,
        options={"temperature": temperature},
    )
    return response["message"]["content"]


if __name__ == "__main__":
    print(generate("C'est quoi Word2Vec en une phrase ?"))