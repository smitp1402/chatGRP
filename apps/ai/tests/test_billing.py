"""Credit reservation and plan gating (unit, no HTTP)."""
import pytest
from fastapi import HTTPException

from app import billing
from tests.conftest import USER_A


def test_reserve_ok_writes_ledger_row_and_returns_its_id(fake_db):
    ledger_id = billing.reserve_credits(USER_A, "free", "gpt-4o-mini")

    rows = fake_db.rows("usage_ledger")
    assert len(rows) == 1
    assert rows[0]["id"] == ledger_id
    assert rows[0]["credits_used"] == billing.CREDIT_TABLE["gpt-4o-mini"]
    assert rows[0]["user_id"] == USER_A


def test_reserve_denied_raises_402_and_writes_nothing(fake_db):
    # Free cap is 100; 99 already used, gpt-4o-mini costs 2 -> over.
    fake_db.table("usage_ledger").insert(
        {"user_id": USER_A, "credits_used": 99, "model_id": "gpt-4o-mini"}
    ).execute()

    with pytest.raises(HTTPException) as exc:
        billing.reserve_credits(USER_A, "free", "gpt-4o-mini")

    assert exc.value.status_code == 402
    assert "99/100" in exc.value.detail
    assert len(fake_db.rows("usage_ledger")) == 1  # nothing added


def test_reserve_calls_atomic_rpc_not_python_arithmetic(fake_db):
    """The cap must be enforced in Postgres — that is the whole race fix."""
    billing.reserve_credits(USER_A, "pro", "gpt-4o")

    assert fake_db.rpc_calls == [
        (
            "reserve_credits",
            {
                "p_user_id": USER_A,
                "p_model_id": "gpt-4o",
                "p_cost": billing.CREDIT_TABLE["gpt-4o"],
                "p_cap": billing.PLAN_CREDITS["pro"],
            },
        )
    ]


def test_refund_removes_the_ledger_row(fake_db):
    ledger_id = billing.reserve_credits(USER_A, "free", "gpt-4o-mini")

    billing.refund_credits(ledger_id)

    assert fake_db.rows("usage_ledger") == []


def test_link_attempt_stamps_attempt_id_on_ledger_row(fake_db):
    ledger_id = billing.reserve_credits(USER_A, "free", "gpt-4o-mini")

    billing.link_attempt(ledger_id, "attempt-1")

    assert fake_db.rows("usage_ledger")[0]["generation_attempt_id"] == "attempt-1"


def test_free_plan_cannot_use_pro_models(fake_db):
    with pytest.raises(HTTPException) as exc:
        billing.assert_plan_allows(USER_A, "claude-opus")
    assert exc.value.status_code == 403


def test_plan_gate_returns_plan_for_allowed_model(fake_db):
    assert billing.assert_plan_allows(USER_A, "gpt-4o-mini") == "free"


def test_last_months_usage_does_not_count(fake_db):
    fake_db.table("usage_ledger").insert(
        {
            "user_id": USER_A,
            "credits_used": 100,
            "model_id": "gpt-4o-mini",
            "created_at": "2000-01-01T00:00:00+00:00",
        }
    ).execute()

    billing.reserve_credits(USER_A, "free", "gpt-4o-mini")  # must not raise 402

    assert len(fake_db.rows("usage_ledger")) == 2
