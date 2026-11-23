"""Sécurité : création/vérification des tokens JWT, rôles, secret interne."""

import hmac
import os
import time

import jwt
from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException

from src.users import get_user

load_dotenv()

ALGO = "HS256"
TTL_SECONDS = 24 * 3600  # 24 h


def _secret() -> str:
    s = os.getenv("JWT_SECRET")
    if not s:
        raise RuntimeError("JWT_SECRET manquant dans .env")
    return s


def create_token(user: dict) -> str:
    payload = {"sub": user["id"], "exp": int(time.time()) + TTL_SECONDS}
    return jwt.encode(payload, _secret(), algorithm=ALGO)


def current_user(authorization: str = Header(default="")) -> dict:
    """Dépendance FastAPI : exige un token valide et un compte actif."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentification requise.")
    try:
        data = jwt.decode(authorization[7:], _secret(), algorithms=[ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expirée ou invalide.")
    user = get_user(data["sub"])
    if not user or not user["active"]:
        raise HTTPException(status_code=401, detail="Compte introuvable ou désactivé.")
    return user


def require_admin(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")
    return user


def require_internal(x_internal_secret: str = Header(default="")) -> None:
    """Réservé aux appels serveur-à-serveur (Next.js -> FastAPI)."""
    expected = os.getenv("INTERNAL_API_SECRET", "")
    if not expected or not hmac.compare_digest(x_internal_secret, expected):
        raise HTTPException(status_code=403, detail="Interdit.")