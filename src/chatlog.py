"""Historique des conversations (SQLite) pour le tableau de bord."""

import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone

from src.users import DB_PATH, day_series, last_days


def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "CREATE TABLE IF NOT EXISTS chat_logs ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, user_email TEXT, question TEXT, "
        "answer TEXT, sources TEXT, refused INTEGER, top_score REAL, latency_ms INTEGER)"
    )
    return con


def log_chat(email, question, answer_text, sources, refused, latency_ms) -> None:
    top = max((s.get("score", 0) for s in sources), default=0)
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with closing(_connect()) as con:
        with con:
            con.execute(
                "INSERT INTO chat_logs (ts, user_email, question, answer, sources, refused, top_score, latency_ms) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (ts, email, question, answer_text, json.dumps(sources, ensure_ascii=False),
                 int(refused), top, latency_ms),
            )


def list_chats(q: str = "", limit: int = 200) -> list:
    like = f"%{q.strip().lower()}%"
    with closing(_connect()) as con:
        rows = con.execute(
            "SELECT id, ts, user_email, question, answer, sources, refused, top_score, latency_ms "
            "FROM chat_logs WHERE lower(question) LIKE ? OR lower(user_email) LIKE ? "
            "ORDER BY id DESC LIMIT ?",
            (like, like, limit),
        ).fetchall()
    return [
        {"id": r[0], "ts": r[1], "user": r[2], "question": r[3], "answer": r[4],
         "sources": json.loads(r[5] or "[]"), "refused": bool(r[6]),
         "top_score": r[7], "latency_ms": r[8]}
        for r in rows
    ]


def delete_chat(cid: int) -> int:
    with closing(_connect()) as con:
        with con:
            return con.execute("DELETE FROM chat_logs WHERE id=?", (cid,)).rowcount


def clear_chats() -> None:
    with closing(_connect()) as con:
        with con:
            con.execute("DELETE FROM chat_logs")


def chat_stats() -> dict:
    days = last_days()
    with closing(_connect()) as con:
        total = con.execute("SELECT COUNT(*) FROM chat_logs").fetchone()[0]
        refused = con.execute("SELECT COUNT(*) FROM chat_logs WHERE refused=1").fetchone()[0]
        avg = con.execute("SELECT AVG(latency_ms) FROM chat_logs").fetchone()[0] or 0
        per_day = dict(con.execute(
            "SELECT substr(ts,1,10), COUNT(*) FROM chat_logs WHERE ts >= ? GROUP BY 1", (days[0],)
        ).fetchall())
    return {
        "total": total, "refused": refused, "avg_latency_ms": int(avg),
        "today": per_day.get(days[-1], 0), "per_day": day_series(per_day),
    }