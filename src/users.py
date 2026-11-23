"""Gestion des utilisateurs (SQLite) : comptes email et comptes Google."""

import hashlib
import hmac
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path("data/users.db")


def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "CREATE TABLE IF NOT EXISTS users ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, "
        "email TEXT UNIQUE NOT NULL, salt BLOB, hash BLOB, "
        "provider TEXT NOT NULL DEFAULT 'email', created_at TEXT)"
    )
    # Migration : anciennes bases sans les nouvelles colonnes
    cols = {r[1] for r in con.execute("PRAGMA table_info(users)")}
    if "provider" not in cols:
        con.execute("ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'email'")
    if "created_at" not in cols:
        con.execute("ALTER TABLE users ADD COLUMN created_at TEXT")
    con.commit()
    return con


def _hash(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def create_user(name: str, email: str, password: str) -> dict:
    """Crée un compte email. Lève ValueError si l'email existe déjà."""
    email = email.strip().lower()
    name = name.strip()
    salt = os.urandom(16)
    try:
        with closing(_connect()) as con:
            with con:
                cur = con.execute(
                    "INSERT INTO users (name, email, salt, hash, provider, created_at) "
                    "VALUES (?, ?, ?, ?, 'email', ?)",
                    (name, email, salt, _hash(password, salt), _now()),
                )
                return {"id": str(cur.lastrowid), "name": name, "email": email}
    except sqlite3.IntegrityError:
        raise ValueError("Cet email est déjà utilisé.")


def verify_user(email: str, password: str):
    """Retourne l'utilisateur si les identifiants sont corrects, sinon None."""
    with closing(_connect()) as con:
        row = con.execute(
            "SELECT id, name, email, salt, hash FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()
    if row and row[3] and row[4] and hmac.compare_digest(row[4], _hash(password, row[3])):
        return {"id": str(row[0]), "name": row[1], "email": row[2]}
    return None


def upsert_google_user(name: str, email: str) -> dict:
    """Enregistre un utilisateur Google (ou le retrouve s'il existe déjà)."""
    email = email.strip().lower()
    with closing(_connect()) as con:
        with con:
            row = con.execute("SELECT id, name FROM users WHERE email = ?", (email,)).fetchone()
            if row:
                return {"id": str(row[0]), "name": row[1], "email": email}
            cur = con.execute(
                "INSERT INTO users (name, email, provider, created_at) VALUES (?, ?, 'google', ?)",
                (name.strip() or email.split("@")[0], email, _now()),
            )
            return {"id": str(cur.lastrowid), "name": name, "email": email}