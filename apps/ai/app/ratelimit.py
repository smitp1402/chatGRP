"""Per-user rate limiter backed by Postgres.

The counter lives in the `rate_limits` table and is bumped by the
`hit_rate_limit` function (migration 0009), so every Cloud Run instance sees
the same number and a deploy does not reset it. Fixed window: N requests per
WINDOW_SECONDS, then 429 until the window rolls over.

If the database call itself fails we let the request through and log it —
a limiter outage should degrade to "unlimited", not "down", and the request
is about to hit the same database anyway.
"""
import logging

from fastapi import HTTPException

from .db import db

log = logging.getLogger(__name__)

WINDOW_SECONDS = 60
MAX_PER_WINDOW = 30


def check_rate_limit(user_id: str, max_per_window: int = MAX_PER_WINDOW) -> None:
    try:
        result = (
            db()
            .rpc(
                "hit_rate_limit",
                {
                    "p_key": f"generate:{user_id}",
                    "p_max": max_per_window,
                    "p_window_seconds": WINDOW_SECONDS,
                },
            )
            .execute()
            .data
        )
    except Exception:
        log.exception("rate limit check failed for user %s; allowing request", user_id)
        return

    if result and not result.get("allowed", True):
        retry_after = int(result.get("retry_after", WINDOW_SECONDS))
        raise HTTPException(
            status_code=429,
            detail="Too many requests — slow down and try again in a moment.",
            headers={"Retry-After": str(retry_after)},
        )
