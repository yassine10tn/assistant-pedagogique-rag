"""Utilisateurs (SQLite) : comptes, rôles, verrouillage, journal d'audit."""

import hashlib
import hmac
import os
import re
import sqlite3
import time
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DB_PATH = Path("data/users.db")
MAX_ATTEMPTS = 5
LOCK_SECONDS = 15 * 60

_NEEDED = {
    "provider": "TEXT NOT NULL DEFAULT 'email'",
    "created_at": "TEXT",
    "role": "TEXT NOT NULL DEFAULT 'user'",
    "active": "INTEGER NOT NULL DEFAULT 1",
    "failed_attempts": "INTEGER NOT NULL DEFAULT 0",
    "locked_until": "INTEGER NOT NULL DEFAULT 0",
}


def admin_emails() -> set:
    raw = os.getenv("ADMIN_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "CREATE TABLE IF NOT EXISTS users ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, "
        "email TEXT UNIQUE NOT NULL, salt BLOB, hash BLOB, "
        "provider TEXT NOT NULL DEFAULT 'email', created_at TEXT, "
        "role TEXT NOT NULL DEFAULT 'user', active INTEGER NOT NULL DEFAULT 1, "
        "failed_attempts INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0)"
    )
    cols = {r[1] for r in con.execute("PRAGMA table_info(users)")}
    for col, ddl in _NEEDED.items():
        if col not in cols:
            con.execute(f"ALTER TABLE users ADD COLUMN {col} {ddl}")
    con.execute(
        "CREATE TABLE IF NOT EXISTS audit_log ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, actor TEXT, action TEXT, detail TEXT)"
    )
    for e in admin_emails():
        con.execute("UPDATE users SET role='admin' WHERE email=? AND provider='google'", (e,))
    con.commit()
    return con


def _hash(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


_COLS = "id, name, email, role, active"


def _user(row) -> dict:
    return {"id": str(row[0]), "name": row[1], "email": row[2], "role": row[3], "active": bool(row[4])}


# ---------- Audit ----------

def log_event(actor: str, action: str, detail: str = "") -> None:
    with closing(_connect()) as con:
        with con:
            con.execute(
                "INSERT INTO audit_log (ts, actor, action, detail) VALUES (?, ?, ?, ?)",
                (_now(), actor, action, detail),
            )


def list_audit(limit: int = 100) -> list:
    with closing(_connect()) as con:
        rows = con.execute(
            "SELECT ts, actor, action, detail FROM audit_log ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [{"ts": r[0], "actor": r[1], "action": r[2], "detail": r[3]} for r in rows]


# ---------- Mot de passe ----------

def check_password_strength(password: str) -> None:
    """Lève ValueError si le mot de passe est trop faible."""
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise ValueError("Mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.")


# ---------- Comptes ----------

def create_user(name: str, email: str, password: str) -> dict:
    email = email.strip().lower()
    if email in admin_emails():
        raise ValueError("Cet email est réservé : connectez-vous avec Google.")
    check_password_strength(password)
    salt = os.urandom(16)
    try:
        with closing(_connect()) as con:
            with con:
                cur = con.execute(
                    "INSERT INTO users (name, email, salt, hash, provider, created_at, role, active) "
                    "VALUES (?, ?, ?, ?, 'email', ?, 'user', 1)",
                    (name.strip(), email, salt, _hash(password, salt), _now()),
                )
                uid = cur.lastrowid
    except sqlite3.IntegrityError:
        raise ValueError("Cet email est déjà utilisé.")
    log_event(email, "register")
    return {"id": str(uid), "name": name.strip(), "email": email, "role": "user", "active": True}


def verify_user(email: str, password: str):
    """Retourne l'utilisateur si OK. Lève PermissionError si le compte est verrouillé."""
    email = email.strip().lower()
    now = int(time.time())
    with closing(_connect()) as con:
        row = con.execute(
            f"SELECT {_COLS}, salt, hash, failed_attempts, locked_until FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if not row:
            log_event(email, "login_failed", "compte inconnu")
            return None
        if row[8] > now:
            minutes = (row[8] - now) // 60 + 1
            log_event(email, "login_blocked", "compte verrouillé")
            raise PermissionError(f"Compte verrouillé. Réessayez dans {minutes} min.")
        if not row[4] or not row[5] or not row[6]:
            log_event(email, "login_failed", "compte désactivé ou sans mot de passe")
            return None
        if not hmac.compare_digest(row[6], _hash(password, row[5])):
            attempts = row[7] + 1
            locked = now + LOCK_SECONDS if attempts >= MAX_ATTEMPTS else 0
            with con:
                con.execute(
                    "UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?",
                    (0 if locked else attempts, locked, row[0]),
                )
            log_event(email, "login_failed", "verrouillé 15 min" if locked else f"tentative {attempts}")
            return None
        with con:
            con.execute("UPDATE users SET failed_attempts=0, locked_until=0 WHERE id=?", (row[0],))
    log_event(email, "login_ok")
    return _user(row)


def upsert_google_user(name: str, email: str) -> dict:
    email = email.strip().lower()
    is_admin = email in admin_emails()
    with closing(_connect()) as con:
        with con:
            row = con.execute(f"SELECT {_COLS} FROM users WHERE email = ?", (email,)).fetchone()
            if row:
                if is_admin and row[3] != "admin":
                    con.execute("UPDATE users SET role='admin' WHERE email=?", (email,))
                    row = con.execute(f"SELECT {_COLS} FROM users WHERE email = ?", (email,)).fetchone()
                user = _user(row)
            else:
                cur = con.execute(
                    "INSERT INTO users (name, email, provider, created_at, role, active) "
                    "VALUES (?, ?, 'google', ?, ?, 1)",
                    (name.strip() or email.split("@")[0], email, _now(), "admin" if is_admin else "user"),
                )
                row = con.execute(f"SELECT {_COLS} FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
                user = _user(row)
    log_event(email, "login_google")
    return user


def get_user(user_id: str):
    with closing(_connect()) as con:
        row = con.execute(f"SELECT {_COLS} FROM users WHERE id = ?", (user_id,)).fetchone()
    return _user(row) if row else None


def update_name(user_id: str, name: str) -> dict:
    name = name.strip()
    if not name:
        raise ValueError("Le nom ne peut pas être vide.")
    with closing(_connect()) as con:
        with con:
            con.execute("UPDATE users SET name=? WHERE id=?", (name, user_id))
    user = get_user(user_id)
    log_event(user["email"], "profile_updated")
    return user


def change_password(user_id: str, current: str, new: str) -> None:
    check_password_strength(new)
    with closing(_connect()) as con:
        row = con.execute("SELECT email, salt, hash FROM users WHERE id=?", (user_id,)).fetchone()
        if not row or not row[1] or not row[2]:
            raise ValueError("Compte Google : pas de mot de passe à modifier.")
        if not hmac.compare_digest(row[2], _hash(current, row[1])):
            log_event(row[0], "password_change_failed")
            raise ValueError("Mot de passe actuel incorrect.")
        salt = os.urandom(16)
        with con:
            con.execute("UPDATE users SET salt=?, hash=? WHERE id=?", (salt, _hash(new, salt), user_id))
    log_event(row[0], "password_changed")


def delete_user(user_id: str) -> None:
    user = get_user(user_id)
    if not user:
        return
    with closing(_connect()) as con:
        with con:
            con.execute("DELETE FROM users WHERE id=?", (user_id,))
    log_event(user["email"], "account_deleted")