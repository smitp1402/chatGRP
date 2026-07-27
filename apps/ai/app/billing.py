"""Credit accounting and plan gating.

usage_ledger is the source of truth for credits spent. Before a generation we
check the user's plan allows the model and that they have credits left; after a
successful generation we write a ledger row. No charge on failure/cancel.
"""
from datetime import datetime, timezone

from fastapi import HTTPException

from .db import db

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


def month_usage(user_id: str) -> int:
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()
    res = (
        db()
        .table("usage_ledger")
        .select("credits_used")
        .eq("user_id", user_id)
        .gte("created_at", start)
        .execute()
    )
    return sum(row["credits_used"] for row in res.data)


def assert_can_generate(user_id: str, model_id: str) -> None:
    plan = get_plan(user_id)

    if plan == "free" and model_id not in FREE_MODELS:
        raise HTTPException(
            status_code=403,
            detail="This model requires Pro. Upgrade to use it, or pick GPT-4o mini / Gemini Flash.",
        )

    cost = CREDIT_TABLE.get(model_id, 0)
    cap = PLAN_CREDITS.get(plan, 0)
    used = month_usage(user_id)
    if used + cost > cap:
        raise HTTPException(
            status_code=402,
            detail=f"Out of credits ({used}/{cap} used this month). Upgrade for more.",
        )


def record_usage(user_id: str, attempt_id: str, model_id: str) -> None:
    db().table("usage_ledger").insert(
        {
            "user_id": user_id,
            "generation_attempt_id": attempt_id,
            "credits_used": CREDIT_TABLE.get(model_id, 0),
            "model_id": model_id,
        }
    ).execute()
