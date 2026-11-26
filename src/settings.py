"""Paramètres modifiables depuis l'administration (SQLite)."""

import sqlite3
from contextlib import closing

from src.users import DB_PATH

DEFAULTS = {"model": "llama3.1:8b", "min_score": "0.78", "top_k": "4"}


def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)")
    return con


def get_all() -> dict:
    with closing(_connect()) as con:
        rows = dict(con.execute("SELECT key, value FROM settings").fetchall())
    s = {**DEFAULTS, **rows}
    return {"model": s["model"], "min_score": float(s["min_score"]), "top_k": int(s["top_k"])}


def get(key: str):
    return get_all()[key]


def update(values: dict) -> dict:
    with closing(_connect()) as con:
        with con:
            for k, v in values.items():
                if k in DEFAULTS and v is not None:
                    con.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, str(v)))
    return get_all()