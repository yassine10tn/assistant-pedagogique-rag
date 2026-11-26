"""Historique des conversations (SQLite) + feedback utilisateur."""

import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone

from src.users import DB_PATH, day_series, last_days

_COLS = "id, ts, user_email, question, answer, sources, refused, top_score, latency_ms, feedback"


def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.execute(
        "CREATE TABLE IF NOT EXISTS chat_logs ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, user_email TEXT, question TEXT, "
        "answer TEXT, sources TEXT, refused INTEGER, top_score REAL, latency_ms INTEGER, "
        "feedback INTEGER NOT NULL DEFAULT 0)"
    )
    cols = {r[1] for r in con.execute("PRAGMA table_info(chat_logs)")}
    if "feedback" not in cols:
        con.execute("ALTER TABLE chat_logs ADD COLUMN feedback INTEGER NOT NULL DEFAULT 0")
    return con


def _row(r) -> dict:
    return {"id": r[0], "ts": r[1], "user": r[2], "question": r[3], "answer": r[4],
            "sources": json.loads(r[5] or "[]"), "refused": bool(r[6]),
            "top_score": r[7], "latency_ms": r[8], "feedback": r[9]}


def log_chat(email, question, answer_text, sources, refused, latency_ms) -> int:
    """Enregistre une conversation et retourne son id."""
    top = max((s.get("score", 0) for s in sources), default=0)
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with closing(_connect()) as con:
        with con:
            cur = con.execute(
                "INSERT INTO chat_logs (ts, user_email, question, answer, sources, refused, top_score, latency_ms) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (ts, email, question, answer_text, json.dumps(sources, ensure_ascii=False),
                 int(refused), top, latency_ms),
            )
            return cur.lastrowid


def list_chats(q: str = "", limit: int = 200) -> list:
    like = f"%{q.strip().lower()}%"
    with closing(_connect()) as con:
        rows = con.execute(
            f"SELECT {_COLS} FROM chat_logs WHERE lower(question) LIKE ? OR lower(user_email) LIKE ? "
            "ORDER BY id DESC LIMIT ?", (like, like, limit)).fetchall()
    return [_row(r) for r in rows]


def delete_chat(cid: int) -> int:
    with closing(_connect()) as con:
        with con:
            return con.execute("DELETE FROM chat_logs WHERE id=?", (cid,)).rowcount


def clear_chats() -> None:
    with closing(_connect()) as con:
        with con:
            con.execute("DELETE FROM chat_logs")


def set_feedback(cid: int, email: str, value: int) -> bool:
    """Un utilisateur ne peut noter que ses propres réponses."""
    with closing(_connect()) as con:
        with con:
            return con.execute("UPDATE chat_logs SET feedback=? WHERE id=? AND user_email=?",
                               (value, cid, email)).rowcount > 0


def chat_stats() -> dict:
    days = last_days()
    with closing(_connect()) as con:
        def q(sql, *a):
            return con.execute(sql, a).fetchone()[0]
        total = q("SELECT COUNT(*) FROM chat_logs")
        refused = q("SELECT COUNT(*) FROM chat_logs WHERE refused=1")
        up = q("SELECT COUNT(*) FROM chat_logs WHERE feedback=1")
        down = q("SELECT COUNT(*) FROM chat_logs WHERE feedback=-1")
        avg = q("SELECT AVG(latency_ms) FROM chat_logs") or 0
        per_day = dict(con.execute(
            "SELECT substr(ts,1,10), COUNT(*) FROM chat_logs WHERE ts >= ? GROUP BY 1", (days[0],)
        ).fetchall())
    return {
        "total": total, "refused": refused, "avg_latency_ms": int(avg),
        "today": per_day.get(days[-1], 0), "per_day": day_series(per_day),
        "up": up, "down": down,
        "satisfaction": round(100 * up / (up + down)) if (up + down) else None,
    }