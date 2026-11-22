"""Ingestion : extraction du texte des PDF et nettoyage."""

import re
from pathlib import Path

import pymupdf


def extract_pages(pdf_path: str) -> list[dict]:
    """Extrait le texte page par page.

    Retourne une liste de dictionnaires :
    [{"page": 1, "text": "..."}, ...]
    On garde le numéro de page pour pouvoir citer les sources plus tard.
    """
    pages = []
    with pymupdf.open(pdf_path) as doc:
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text")
            pages.append({"page": i, "text": text})
    return pages


def clean_text(text: str) -> str:
    """Nettoie le texte brut extrait d'un PDF."""
    # Recoller les mots coupés par un tiret en fin de ligne
    text = re.sub(r"-\n(\w)", r"\1", text)
    # Remplacer les retours à la ligne simples par des espaces
    # (mais garder les paragraphes, séparés par une ligne vide)
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
    # Réduire les espaces multiples
    text = re.sub(r"[ \t]+", " ", text)
    # Réduire les lignes vides multiples
    text = re.sub(r"\n{3,}", "\n\n", text)
        # Supprimer les points de suite de la table des matières ( . . . . . )
    text = re.sub(r"(\s?\.){3,}", " ", text)
    # Corriger les accents mal encodés (´e -> é, `e -> è)
    for bad, good in {"´e": "é", "´E": "É", "`e": "è", "`a": "à", "ˆe": "ê", "´a": "á"}.items():
        text = text.replace(bad, good)
    return text.strip()


def load_pdf(pdf_path: str) -> list[dict]:
    """Extrait puis nettoie un PDF. Retourne une liste de pages propres."""
    pages = extract_pages(pdf_path)
    for p in pages:
        p["text"] = clean_text(p["text"])
    # Supprimer les pages vides
    pages = [p for p in pages if p["text"]]
    return pages


if __name__ == "__main__":
    # Test rapide : traite tous les PDF du dossier data/raw
    for pdf in Path("data/raw").glob("*.pdf"):
        pages = load_pdf(str(pdf))
        total_chars = sum(len(p["text"]) for p in pages)
        print(f"{pdf.name} : {len(pages)} pages, {total_chars} caractères")
        print("--- Extrait de la page 1 ---")
        print(pages[0]["text"][:500])