"""Shared fixtures: a fake Supabase, a seeded user/session, and a test client.

The reserve/refund RPCs are re-implemented here against the fake tables with
the same semantics as supabase/migrations/0008_reserve_credits.sql — month
window included — minus the row lock (no concurrency in a single-threaded test).
"""
import os
import re
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from tests.fake_db import FakeDB

USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"
SESSION_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

# Settings are read at import time; give them non-empty values so db() and
# verify_user do not refuse to construct. Nothing here reaches the network.
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role")


def month_start() -> str:
    now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()


def fake_reserve(db: FakeDB, p: dict) -> dict:
    start = month_start()
    used = sum(
        r["credits_used"]
        for r in db.rows("usage_ledger")
        if r["user_id"] == p["p_user_id"] and r["created_at"] >= start
    )
    if used + p["p_cost"] > p["p_cap"]:
        return {"ok": False, "used": used, "cap": p["p_cap"]}
    row = (
        db.table("usage_ledger")
        .insert(
            {
                "user_id": p["p_user_id"],
                "credits_used": p["p_cost"],
                "model_id": p["p_model_id"],
                "generation_attempt_id": None,
            }
        )
        .execute()
        .data[0]
    )
    return {"ok": True, "used": used + p["p_cost"], "cap": p["p_cap"], "ledger_id": row["id"]}


def fake_refund(db: FakeDB, p: dict) -> None:
    db.table("usage_ledger").delete().eq("id", p["p_ledger_id"]).execute()
    return None


@pytest.fixture
def fake_db(monkeypatch: pytest.MonkeyPatch) -> FakeDB:
    """Replace every module's ``db`` with one shared in-memory instance."""
    from app import attachments, billing, context, db as dbmod, main, ratelimit

    fake = FakeDB()
    fake.rpc_handlers["reserve_credits"] = fake_reserve
    fake.rpc_handlers["refund_credits"] = fake_refund
    fake.rpc_handlers["hit_rate_limit"] = lambda _db, _p: {"allowed": True, "hits": 1}

    for module in (attachments, billing, context, dbmod, main, ratelimit):
        monkeypatch.setattr(module, "db", lambda: fake)

    fake.table("profiles").insert({"user_id": USER_A, "plan": "free"}).execute()
    fake.table("profiles").insert({"user_id": USER_B, "plan": "free"}).execute()
    fake.table("sessions").insert({"id": SESSION_A, "user_id": USER_A, "name": "A"}).execute()
    return fake


@pytest.fixture
def client(fake_db: FakeDB, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Authenticated as USER_A, rate limit allowing, cancel polled every chunk."""
    from app import main
    from app.auth import verify_user

    main.app.dependency_overrides[verify_user] = lambda: USER_A
    monkeypatch.setattr(main, "CANCEL_POLL_SECONDS", 0.0)
    try:
        yield TestClient(main.app)
    finally:
        main.app.dependency_overrides.clear()


def as_user(client: TestClient, user_id: str) -> TestClient:
    from app import main
    from app.auth import verify_user

    main.app.dependency_overrides[verify_user] = lambda: user_id
    return client


_BLOCK = re.compile(r"\r?\n\r?\n")
_LINE = re.compile(r"\r?\n")


def parse_sse(body: str) -> list[tuple[str, str]]:
    """Turn a raw SSE body into [(event, data), ...], ignoring comments/pings."""
    events: list[tuple[str, str]] = []
    for block in _BLOCK.split(body):
        event: str | None = None
        data: list[str] = []
        for line in _LINE.split(block):
            if line.startswith("event:"):
                event = line[6:].strip()
            elif line.startswith("data:"):
                data.append(line[5:].lstrip(" "))
        if event:
            events.append((event, "\n".join(data)))
    return events


async def stream_of(*chunks: str, fail_after: int | None = None):
    """Fake provider stream. Optionally raises after N chunks."""
    for i, chunk in enumerate(chunks):
        if fail_after is not None and i == fail_after:
            raise RuntimeError("upstream provider 500")
        yield chunk
