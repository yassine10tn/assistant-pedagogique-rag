"""Résumés de documents longs (map-reduce)."""

from src.llm import generate

LEVELS = {
    "court": "Fais un résumé très court : 3 à 4 phrases, uniquement l'idée principale.",
    "moyen": "Fais un résumé moyen : 1 à 2 paragraphes avec les idées essentielles.",
    "detaille": "Fais un résumé détaillé et structuré : titres et puces, avec les concepts et définitions importants.",
}

SYSTEM = (
    "Tu es un assistant pédagogique. Tu résumes des cours en français. "
    "Tu utilises uniquement le texte fourni, sans rien inventer."
)


def split_text(text: str, max_chars: int = 6000) -> list[str]:
    """Découpe un long texte en gros blocs (pour le 'map')."""
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(chunk_size=max_chars, chunk_overlap=200)
    return splitter.split_text(text)


def summarize(text: str, level: str = "moyen") -> str:
    """Résume un texte long au niveau demandé (court / moyen / detaille)."""
    instruction = LEVELS[level]
    blocks = split_text(text)

    # Texte court : un seul appel suffit
    if len(blocks) == 1:
        return generate(f"{instruction}\n\nTexte :\n{blocks[0]}", system=SYSTEM)

    # MAP : résumer chaque bloc
    partial = []
    for b in blocks:
        partial.append(
            generate(f"Résume ce passage en quelques phrases claires.\n\nTexte :\n{b}", system=SYSTEM)
        )

    # REDUCE : résumer les résumés
    combined = "\n\n".join(partial)
    return generate(f"{instruction}\n\nVoici des résumés de parties du cours :\n{combined}", system=SYSTEM)


if __name__ == "__main__":
    from pathlib import Path
    from src.ingestion import load_pdf

    pdf = next(Path("data/raw").glob("Chapitre_3*.pdf"))
    pages = [p for p in load_pdf(str(pdf)) if p["page"] > 1]
    text = "\n\n".join(p["text"] for p in pages)

    for level in LEVELS:
        print(f"\n=== Résumé {level} ===")
        print(summarize(text, level))