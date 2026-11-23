"""Limiteur de requêtes simple (en mémoire)."""

import time
from collections import defaultdict, deque

from fastapi import HTTPException

_hits = defaultdict(deque)


def hit(key: str, max_calls: int, window: int) -> None:
    """Lève 429 si plus de max_calls appels en `window` secondes pour cette clé."""
    now = time.time()
    q = _hits[key]
    while q and q[0] < now - window:
        q.popleft()
    if len(q) >= max_calls:
        raise HTTPException(status_code=429, detail="Trop de tentatives, réessayez dans un moment.")
    q.append(now)