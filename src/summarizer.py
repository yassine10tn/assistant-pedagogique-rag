"""Résumés de documents longs (map-reduce)."""

from pathlib import Path

from src.llm import generate

RAW_DIR = Path("data/raw")

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
    """Résume un texte long au niveau demandé."""
    instruction = LEVELS[level]
    blocks = split_text(text)

    if len(blocks) == 1:
        return generate(f"{instruction}\n\nTexte :\n{blocks[0]}", system=SYSTEM)

    partial = [
        generate(f"Résume ce passage en quelques phrases claires.\n\nTexte :\n{b}", system=SYSTEM)
        for b in blocks
    ]
    combined = "\n\n".join(partial)
    return generate(f"{instruction}\n\nVoici des résumés de parties du cours :\n{combined}", system=SYSTEM)


def summarize_pdf(filename: str, level: str = "moyen") -> str:
    """Résume un PDF de data/raw par son nom de fichier."""
    from src.ingestion import load_pdf

    path = RAW_DIR / Path(filename).name
    if not path.exists():
        raise FileNotFoundError(filename)

    pages = [p for p in load_pdf(str(path)) if p["page"] > 1]
    text = "\n\n".join(p["text"] for p in pages)
    return summarize(text, level)


if __name__ == "__main__":
    pdf = next(RAW_DIR.glob("Chapitre_3*.pdf"))
    for level in LEVELS:
        print(f"\n=== Résumé {level} ===")
        print(summarize_pdf(pdf.name, level))