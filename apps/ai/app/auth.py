"""Supabase JWT verification.

FastAPI does not run its own session system — it trusts the Supabase-issued
JWT that the browser already holds. Every protected route depends on
`verify_user`, which validates the token and returns the user's id (`sub`).

Note: this verifies the classic HS256 token signed with the project's JWT
secret. If the Supabase project is migrated to asymmetric signing keys, swap
this for JWKS-based verification against the project's public keys.
"""
from fastapi import Header, HTTPException
from jose import JWTError, jwt

from .config import settings


async def verify_user(authorization: str = Header(default="")) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1]

    if not settings.supabase_jwt_secret:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    return user_id
