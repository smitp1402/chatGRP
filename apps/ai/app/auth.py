"""Supabase token verification.

FastAPI does not run its own session system — it trusts the Supabase-issued
JWT the browser holds. Rather than decode the JWT locally (which breaks when a
project uses asymmetric signing keys), we validate the token against Supabase's
own auth endpoint, which works regardless of the signing method.
"""
import httpx
from fastapi import Header, HTTPException

from .config import settings


async def verify_user(authorization: str = Header(default="")) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1]

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Supabase not configured in apps/ai/.env")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_service_role_key,
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach Supabase auth") from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = resp.json().get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id")

    return user_id
