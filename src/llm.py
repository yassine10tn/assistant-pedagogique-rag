"""LLM : communication avec Ollama (le modèle est réglable depuis l'admin)."""

import ollama

from src import settings


def generate(prompt: str, system: str = "", temperature: float = 0.2) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    response = ollama.chat(
        model=settings.get("model"),
        messages=messages,
        options={"temperature": temperature},
    )
    return response["message"]["content"]


def generate_stream(prompt: str, system: str = "", temperature: float = 0.2):
    """Générateur : renvoie la réponse morceau par morceau."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    stream = ollama.chat(
        model=settings.get("model"),
        messages=messages,
        options={"temperature": temperature},
        stream=True,
    )
    for part in stream:
        piece = part["message"]["content"]
        if piece:
            yield piece


def installed_models() -> list:
    """Modèles installés dans Ollama (liste vide si Ollama est arrêté)."""
    try:
        res = ollama.list()
    except Exception:
        return []
    items = res["models"] if isinstance(res, dict) else getattr(res, "models", [])
    names = []
    for m in items:
        name = (m.get("model") or m.get("name")) if isinstance(m, dict) else (getattr(m, "model", None) or getattr(m, "name", None))
        if name:
            names.append(name)
    return sorted(set(names))


if __name__ == "__main__":
    print(generate("C'est quoi Word2Vec en une phrase ?"))