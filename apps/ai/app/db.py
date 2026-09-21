"""Supabase client using the service-role key.

The service-role key bypasses Row Level Security, so every write path MUST
first verify that the row being touched belongs to the authenticated user
(see `session_belongs_to` / `attempt_belongs_to`). FastAPI already knows the
user id from the JWT.
"""
from functools import lru_cache

from supabase import Client, create_client

from .config import settings


@lru_cache(maxsize=1)
def db() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase URL / service-role key not configured in apps/ai/.env")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def session_belongs_to(session_id: str, user_id: str) -> bool:
    res = (
        db()
        .table("sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return bool(res.data)


def attempt_belongs_to(attempt_id: str, user_id: str) -> bool:
    """Walk attempt -> node -> session and check the session's owner."""
    attempt = (
        db()
        .table("generation_attempts")
        .select("node_id")
        .eq("id", attempt_id)
        .limit(1)
        .execute()
        .data
    )
    if not attempt:
        return False
    node = (
        db()
        .table("nodes")
        .select("session_id")
        .eq("id", attempt[0]["node_id"])
        .limit(1)
        .execute()
        .data
    )
    if not node:
        return False
    return session_belongs_to(node[0]["session_id"], user_id)
