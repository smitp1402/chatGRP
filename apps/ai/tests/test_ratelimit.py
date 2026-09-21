"""Rate limit: shared counter via RPC, 429 past the cap, fail-open on DB error."""
import pytest
from fastapi import HTTPException

from app import ratelimit
from tests.conftest import USER_A


def test_allowed_when_under_cap(fake_db):
    fake_db.rpc_handlers["hit_rate_limit"] = lambda _db, _p: {"allowed": True, "hits": 3}

    ratelimit.check_rate_limit(USER_A)  # must not raise

    name, params = fake_db.rpc_calls[-1]
    assert name == "hit_rate_limit"
    assert params == {
        "p_key": f"generate:{USER_A}",
        "p_max": ratelimit.MAX_PER_WINDOW,
        "p_window_seconds": ratelimit.WINDOW_SECONDS,
    }


def test_429_with_retry_after_when_over_cap(fake_db):
    fake_db.rpc_handlers["hit_rate_limit"] = lambda _db, _p: {
        "allowed": False,
        "hits": 31,
        "retry_after": 17,
    }

    with pytest.raises(HTTPException) as exc:
        ratelimit.check_rate_limit(USER_A)

    assert exc.value.status_code == 429
    assert exc.value.headers["Retry-After"] == "17"


def test_fails_open_when_database_errors(fake_db):
    def boom(_db, _p):
        raise ConnectionError("postgrest 503")

    fake_db.rpc_handlers["hit_rate_limit"] = boom

    ratelimit.check_rate_limit(USER_A)  # allowed, logged, no exception


def test_generate_returns_429_before_reserving_credits(client, fake_db):
    fake_db.rpc_handlers["hit_rate_limit"] = lambda _db, _p: {"allowed": False, "retry_after": 5}

    res = client.post(
        "/generate",
        json={"session_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "message": "hi"},
    )

    assert res.status_code == 429
    assert fake_db.rows("usage_ledger") == []
    assert all(name != "reserve_credits" for name, _ in fake_db.rpc_calls)
