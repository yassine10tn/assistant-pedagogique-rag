"""Évaluation automatique du pipeline RAG : questions dans / hors du cours."""

import json
import sqlite3
import threading
import time
from contextlib import closing
from datetime import datetime, timezone

from src.rag import NO_ANSWER, answer
from src import settings
from src.retriever import search
from src.users import DB_PATH

DEFAULT_IN = [
    "Comment Word2Vec calcule les scores ?",
    "C'est quoi le skip-gram ?",
    "Quelles sont les limites de Word2Vec ?",
    "Qu'est-ce que le Masked Language Modeling ?",
    "Qu'est-ce que le Next Sentence Prediction ?",
    "Quelle est la différence entre BoW et TF-IDF ?",
    "Qu'est-ce que le TF-IDF ?",
    "Qu'est-ce qu'un N-gramme ?",
    "Que signifie l'encodage bidirectionnel dans BERT ?",
    "À quoi sert la vectorisation de texte ?",
]
DEFAULT_OUT = [
    "Comment faire un couscous ?",
    "Qui a gagné la Coupe du monde 2018 ?",
    "Quelle est la capitale du Japon ?",
    "Comment installer Windows 11 ?",
    "Quel est le meilleur club de football en Tunisie ?",
    "Quelle est la recette de la pizza margherita ?",
    "Comment changer un pneu de voiture ?",
    "Combien de planètes y a-t-il dans le système solaire ?",
    "Quel temps fera-t-il demain à Tunis ?",
    "Qui a peint la Joconde ?",
]

_JOB = {"running": False, "done": 0, "total": 0, "error": None, "run_id": None}
_LOCK = threading.Lock()


def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.execute(
        "CREATE TABLE IF NOT EXISTS eval_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, "
        "mode TEXT, min_score REAL, metrics TEXT, results TEXT)"
    )
    cols = {r[1] for r in con.execute("PRAGMA table_info(eval_runs)")}
    if "model" not in cols:
        con.execute("ALTER TABLE eval_runs ADD COLUMN model TEXT")
    return con


def status() -> dict:
    return dict(_JOB)


def start(in_q: list, out_q: list, full: bool) -> None:
    with _LOCK:
        if _JOB["running"]:
            raise RuntimeError("Une évaluation est déjà en cours.")
        _JOB.update(running=True, done=0, total=len(in_q) + len(out_q), error=None, run_id=None)
    threading.Thread(target=_run, args=(in_q, out_q, full), daemon=True).start()


def _pct(a, b):
    return round(100 * a / b, 1) if b else None


def _mean(xs):
    return round(sum(xs) / len(xs), 3) if xs else None


def compute(results: list) -> dict:
    ins = [r for r in results if r["kind"] == "in"]
    outs = [r for r in results if r["kind"] == "out"]
    ok_in = sum(1 for r in ins if not r["refused"])
    ok_out = sum(1 for r in outs if r["refused"])
    top_in = [r["top_score"] for r in ins]
    top_out = [r["top_score"] for r in outs]
    answered = [r for r in ins if not r["refused"] and r["cited"] is not None]
    sweep = []
    for i in range(11):
        t = round(0.70 + 0.02 * i, 2)
        a = sum(1 for x in top_in if x >= t)
        b = sum(1 for x in top_out if x < t)
        sweep.append({"threshold": t, "in_pass_pct": _pct(a, len(ins)),
                      "out_block_pct": _pct(b, len(outs)),
                      "accuracy_pct": _pct(a + b, len(results))})
    return {
        "n_in": len(ins), "n_out": len(outs),
        "accuracy_pct": _pct(ok_in + ok_out, len(results)),
        "in_answered_pct": _pct(ok_in, len(ins)),
        "out_refused_pct": _pct(ok_out, len(outs)),
        "avg_top_in": _mean(top_in), "avg_top_out": _mean(top_out),
        "gap": round(min(top_in) - max(top_out), 3) if top_in and top_out else None,
        "avg_latency_ms": int(sum(r["latency_ms"] for r in results) / len(results)) if results else 0,
        "citation_pct": _pct(sum(1 for r in answered if r["cited"]), len(answered)) if answered else None,
        "sweep": sweep,
    }


def _run(in_q: list, out_q: list, full: bool) -> None:
    try:
        MIN_SCORE = settings.get("min_score")
        results = []
        for kind, q in [("in", x) for x in in_q] + [("out", x) for x in out_q]:
            t0 = time.time()
            hits = search(q, k=4)
            top = hits[0]["score"] if hits else 0.0
            refused, cited, text = top < MIN_SCORE, None, ""
            if full and not refused:
                text = answer(q)["answer"]
                refused = NO_ANSWER in text
                cited = "[Source" in text
            results.append({
                "kind": kind, "question": q, "top_score": round(top, 3), "refused": refused,
                "correct": (not refused) if kind == "in" else refused, "cited": cited,
                "latency_ms": int((time.time() - t0) * 1000), "answer": text[:600],
            })
            _JOB["done"] += 1
        metrics = compute(results)
        with closing(_connect()) as con:
            with con:
                cur = con.execute(
                    "INSERT INTO eval_runs (ts, mode, min_score, metrics, results, model) VALUES (?, ?, ?, ?, ?, ?)",
                    (datetime.now(timezone.utc).isoformat(timespec="seconds"),
                     "complet" if full else "retrieval", MIN_SCORE,
                     json.dumps(metrics), json.dumps(results, ensure_ascii=False), settings.get("model")),
                )
                _JOB["run_id"] = cur.lastrowid
    except FileNotFoundError:
        _JOB["error"] = "Aucun index disponible : ajoutez un PDF dans Documents."
    except Exception as e:
        _JOB["error"] = str(e)
    finally:
        _JOB["running"] = False


def list_runs(limit: int = 20) -> list:
    with closing(_connect()) as con:
        rows = con.execute("SELECT id, ts, mode, min_score, metrics, model FROM eval_runs "
                           "ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [{"id": r[0], "ts": r[1], "mode": r[2], "min_score": r[3], "model": r[5] or "?",
             "accuracy_pct": json.loads(r[4]).get("accuracy_pct")} for r in rows]


def get_run(run_id: int):
    with closing(_connect()) as con:
        r = con.execute("SELECT id, ts, mode, min_score, metrics, results, model FROM eval_runs WHERE id=?",
                        (run_id,)).fetchone()
    if not r:
        return None
    return {"id": r[0], "ts": r[1], "mode": r[2], "min_score": r[3], "model": r[6] or "?",
            "metrics": json.loads(r[4]), "results": json.loads(r[5])}