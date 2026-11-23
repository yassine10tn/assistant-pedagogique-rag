"""Utilisateurs (SQLite) : comptes, rôles, verrouillage, audit, administration."""

import hashlib
import hmac
import os
import re
import sqlite3
import time
from contextlib import closing
from datetime import datetime, timedelta, timezone
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


class InvalidCredentials(Exception):
    def __init__(self, remaining=None):
        super().__init__("invalid")
        self.remaining = remaining


class AccountLocked(Exception):
    def __init__(self, seconds):
        super().__init__("locked")
        self.seconds = seconds


class AccountDisabled(Exception):
    pass


class GoogleOnlyAccount(Exception):
    pass


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


def last_days(n: int = 7) -> list:
    today = datetime.now(timezone.utc).date()
    return [(today - timedelta(days=i)).isoformat() for i in range(n - 1, -1, -1)]


def day_series(counts: dict, n: int = 7) -> list:
    return [{"label": f"{d[8:10]}/{d[5:7]}", "value": counts.get(d, 0)} for d in last_days(n)]


_COLS = "id, name, email, role, active, provider"


def _user(row) -> dict:
    return {
        "id": str(row[0]), "name": row[1], "email": row[2],
        "role": row[3], "active": bool(row[4]), "provider": row[5],
    }


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
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise ValueError("Mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.")


# ---------- Comptes ----------

def create_user(name: str, email: str, password: str, role: str = "user", actor: str = None) -> dict:
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
                    "VALUES (?, ?, ?, ?, 'email', ?, ?, 1)",
                    (name.strip(), email, salt, _hash(password, salt), _now(), role),
                )
                uid = cur.lastrowid
    except sqlite3.IntegrityError:
        raise ValueError("Cet email est déjà utilisé.")
    if actor:
        log_event(actor, "admin_create_user", f"{email} ({role})")
    else:
        log_event(email, "register")
    return get_user(str(uid))


def verify_user(email: str, password: str) -> dict:
    """Retourne l'utilisateur, ou lève InvalidCredentials / AccountLocked / AccountDisabled / GoogleOnlyAccount."""
    email = email.strip().lower()
    now = int(time.time())
    with closing(_connect()) as con:
        row = con.execute(
            f"SELECT {_COLS}, salt, hash, failed_attempts, locked_until FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if not row:
            log_event(email, "login_failed", "compte inconnu")
            raise InvalidCredentials(None)
        uid, salt, pwd_hash, failed, locked_until = row[0], row[6], row[7], row[8], row[9]
        if locked_until > now:
            log_event(email, "login_blocked", "compte verrouillé")
            raise AccountLocked(locked_until - now)
        if not salt or not pwd_hash:
            log_event(email, "login_failed", "compte Google sans mot de passe")
            raise GoogleOnlyAccount()
        if not hmac.compare_digest(pwd_hash, _hash(password, salt)):
            attempts = failed + 1
            if attempts >= MAX_ATTEMPTS:
                with con:
                    con.execute("UPDATE users SET failed_attempts=0, locked_until=? WHERE id=?", (now + LOCK_SECONDS, uid))
                log_event(email, "account_locked", f"{MAX_ATTEMPTS} échecs, verrouillé 15 min")
                raise AccountLocked(LOCK_SECONDS)
            with con:
                con.execute("UPDATE users SET failed_attempts=? WHERE id=?", (attempts, uid))
            log_event(email, "login_failed", f"tentative {attempts}/{MAX_ATTEMPTS}")
            raise InvalidCredentials(MAX_ATTEMPTS - attempts)
        if not row[4]:
            log_event(email, "login_failed", "compte désactivé")
            raise AccountDisabled()
        with con:
            con.execute("UPDATE users SET failed_attempts=0, locked_until=0 WHERE id=?", (uid,))
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
            else:
                cur = con.execute(
                    "INSERT INTO users (name, email, provider, created_at, role, active) "
                    "VALUES (?, ?, 'google', ?, ?, 1)",
                    (name.strip() or email.split("@")[0], email, _now(), "admin" if is_admin else "user"),
                )
                row = con.execute(f"SELECT {_COLS} FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    log_event(email, "login_google")
    return _user(row)


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


def delete_user(user_id: str, actor: str = None) -> None:
    user = get_user(user_id)
    if not user:
        return
    with closing(_connect()) as con:
        with con:
            con.execute("DELETE FROM users WHERE id=?", (user_id,))
    if actor:
        log_event(actor, "admin_delete_user", user["email"])
    else:
        log_event(user["email"], "account_deleted")


# ---------- Administration ----------

def list_users(q: str = "") -> list:
    now = int(time.time())
    like = f"%{q.strip().lower()}%"
    with closing(_connect()) as con:
        rows = con.execute(
            f"SELECT {_COLS}, created_at, failed_attempts, locked_until FROM users "
            "WHERE lower(email) LIKE ? OR lower(COALESCE(name,'')) LIKE ? ORDER BY id DESC",
            (like, like),
        ).fetchall()
    admins = admin_emails()
    out = []
    for r in rows:
        u = _user(r)
        u.update(created_at=r[6], failed_attempts=r[7], locked=r[8] > now, protected=u["email"] in admins)
        out.append(u)
    return out


def admin_update(uid: str, name=None, role=None, active=None) -> dict:
    sets, vals = [], []
    if name is not None:
        if not name.strip():
            raise ValueError("Le nom ne peut pas être vide.")
        sets.append("name=?")
        vals.append(name.strip())
    if role is not None:
        sets.append("role=?")
        vals.append(role)
    if active is not None:
        sets.append("active=?")
        vals.append(1 if active else 0)
    if sets:
        with closing(_connect()) as con:
            with con:
                con.execute(f"UPDATE users SET {', '.join(sets)} WHERE id=?", (*vals, uid))
    return get_user(uid)


def unlock_user(uid: str) -> None:
    with closing(_connect()) as con:
        with con:
            con.execute("UPDATE users SET failed_attempts=0, locked_until=0 WHERE id=?", (uid,))


def count_admins() -> int:
    with closing(_connect()) as con:
        return con.execute("SELECT COUNT(*) FROM users WHERE role='admin' AND active=1").fetchone()[0]


def user_stats() -> dict:
    now = int(time.time())
    days = last_days()
    with closing(_connect()) as con:
        def q(sql, *a):
            return con.execute(sql, a).fetchone()[0]
        total = q("SELECT COUNT(*) FROM users")
        google = q("SELECT COUNT(*) FROM users WHERE provider='google'")
        signups = dict(con.execute(
            "SELECT substr(created_at,1,10), COUNT(*) FROM users WHERE created_at >= ? GROUP BY 1", (days[0],)
        ).fetchall())
        return {
            "total": total,
            "active": q("SELECT COUNT(*) FROM users WHERE active=1"),
            "admins": q("SELECT COUNT(*) FROM users WHERE role='admin'"),
            "google": google,
            "email": total - google,
            "locked": q("SELECT COUNT(*) FROM users WHERE locked_until > ?", now),
            "signups": day_series(signups),
        }