"""Credit accounting and plan gating.

usage_ledger is the source of truth for credits spent. A charge is *reserved*
(ledger row written) before generation starts, inside one Postgres function
that locks the user's profile row — so parallel requests from one user are
serialised and the monthly cap cannot be overshot. If generation fails or is
cancelled the row is deleted again (refund). See
supabase/migrations/0008_reserve_credits.sql.
"""
import logging

from fastapi import HTTPException

from .db import db

log = logging.getLogger(__name__)

# Mirror of packages/shared/credits.ts (adjusted values).
CREDIT_TABLE = {
    "gpt-4o-mini": 2,
    "gemini-flash": 3,
    "gpt-4o": 10,
    "claude-opus": 15,
    "claude-sonnet": 10,
    "gemini-pro": 7,
}

PLAN_CREDITS = {"free": 100, "pro": 2000, "team": 10000}

# Models available on the Free tier; Pro/Team get everything.
FREE_MODELS = {"gpt-4o-mini", "gemini-flash"}


def get_plan(user_id: str) -> str:
    res = db().table("profiles").select("plan").eq("user_id", user_id).limit(1).execute()
    return res.data[0]["plan"] if res.data else "free"


def assert_plan_allows(user_id: str, model_id: str) -> str:
    """Raise 403 if the user's plan cannot use this model; return the plan."""
    plan = get_plan(user_id)
    if plan == "free" and model_id not in FREE_MODELS:
        raise HTTPException(
            status_code=403,
            detail="This model requires Pro. Upgrade to use it, or pick GPT-4o mini / Gemini Flash.",
        )
    return plan


def reserve_credits(user_id: str, plan: str, model_id: str) -> str:
    """Atomically charge for one generation; return the ledger row id.

    Raises 402 when the user is at their monthly cap. The decision and the
    insert happen inside Postgres under a lock, never in Python arithmetic.
    """
    result = (
        db()
        .rpc(
            "reserve_credits",
            {
                "p_user_id": user_id,
                "p_model_id": model_id,
                "p_cost": CREDIT_TABLE.get(model_id, 0),
                "p_cap": PLAN_CREDITS.get(plan, 0),
            },
        )
        .execute()
        .data
    )
    if not result or not result.get("ok"):
        used = result.get("used", "?") if result else "?"
        cap = result.get("cap", "?") if result else "?"
        raise HTTPException(
            status_code=402,
            detail=f"Out of credits ({used}/{cap} used this month). Upgrade for more.",
        )
    return result["ledger_id"]


def link_attempt(ledger_id: str, attempt_id: str) -> None:
    """Stamp the reservation with the attempt it paid for (audit trail)."""
    db().table("usage_ledger").update({"generation_attempt_id": attempt_id}).eq(
        "id", ledger_id
    ).execute()


def refund_credits(ledger_id: str) -> None:
    """Release a reservation whose generation did not complete."""
    db().rpc("refund_credits", {"p_ledger_id": ledger_id}).execute()


def refund_quietly(ledger_id: str) -> None:
    """Refund without masking the error that caused it; log if the refund fails."""
    try:
        refund_credits(ledger_id)
    except Exception:  # a failed refund must never hide the original failure
        log.exception("refund failed for ledger row %s", ledger_id)
