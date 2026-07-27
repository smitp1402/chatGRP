"""Simple in-memory per-user rate limiter.

A dev/single-instance safeguard against runaway request loops. Production
should use Redis (Upstash) so the limit is shared across instances — see
PROJECT_PLAN.md §8.3.
"""
import time
from collections import defaultdict

from fastapi import HTTPException

_WINDOW_SECONDS = 60.0
_MAX_PER_WINDOW = 30

_hits: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(user_id: str, max_per_window: int = _MAX_PER_WINDOW) -> None:
    now = time.monotonic()
    cutoff = now - _WINDOW_SECONDS
    recent = [t for t in _hits[user_id] if t > cutoff]

    if len(recent) >= max_per_window:
        raise HTTPException(
            status_code=429,
            detail="Too many requests — slow down and try again in a moment.",
        )

    recent.append(now)
    _hits[user_id] = recent
