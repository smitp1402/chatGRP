"""/generate lifecycle: reserve -> stream -> complete | fail, with refunds."""
import json

from app import main
from tests.conftest import SESSION_A, USER_A, parse_sse, stream_of


def _generate(client, **overrides):
    body = {"session_id": SESSION_A, "message": "hello", "model_id": "gpt-4o-mini"}
    body.update(overrides)
    return client.post("/generate", json=body)


def test_out_of_credits_returns_402_before_creating_anything(client, fake_db):
    fake_db.table("usage_ledger").insert(
        {"user_id": USER_A, "credits_used": 100, "model_id": "gpt-4o-mini"}
    ).execute()

    res = _generate(client)

    assert res.status_code == 402
    assert fake_db.rows("nodes") == []
    assert fake_db.rows("messages") == []
    assert fake_db.rows("generation_attempts") == []
    assert len(fake_db.rows("usage_ledger")) == 1  # only the seeded row


def test_success_completes_attempt_and_links_ledger(client, fake_db, monkeypatch):
    monkeypatch.setattr(main, "stream_completion", lambda *_: stream_of("Hel", "lo"))

    res = _generate(client)
    events = parse_sse(res.text)

    assert res.status_code == 200
    names = [e for e, _ in events]
    assert names[0] == "node" and names[-1] == "done"
    assert "".join(d for e, d in events if e == "token") == "Hello"

    attempt = fake_db.rows("generation_attempts")[0]
    assert attempt["status"] == "completed"
    assert attempt["tokens_output"] > 0

    ledger = fake_db.rows("usage_ledger")
    assert len(ledger) == 1
    assert ledger[0]["generation_attempt_id"] == attempt["id"]

    assistant = [m for m in fake_db.rows("messages") if m["role"] == "assistant"][0]
    assert assistant["content"] == "Hello"


def test_node_event_carries_attempt_id_so_client_can_cancel(client, fake_db, monkeypatch):
    monkeypatch.setattr(main, "stream_completion", lambda *_: stream_of("x"))

    events = parse_sse(_generate(client).text)
    node = json.loads(dict(events)["node"])

    assert node["attempt_id"] == fake_db.rows("generation_attempts")[0]["id"]
    assert node["node_id"] == fake_db.rows("nodes")[0]["id"]


def test_provider_error_marks_failed_refunds_and_hides_internals(client, fake_db, monkeypatch):
    monkeypatch.setattr(
        main, "stream_completion", lambda *_: stream_of("par", "tial", "never-sent", fail_after=2)
    )

    events = parse_sse(_generate(client).text)

    assert events[-1][0] == "error"
    assert "upstream provider 500" not in events[-1][1]  # no raw SDK error to the user

    attempt = fake_db.rows("generation_attempts")[0]
    assert attempt["status"] == "failed"
    assert "upstream provider 500" in attempt["error"]  # but it is recorded server-side
    assert fake_db.rows("usage_ledger") == []  # refunded


def test_input_too_large_refunds_and_creates_no_rows(client, fake_db, monkeypatch):
    monkeypatch.setattr(main.settings, "max_input_tokens", 4)

    res = _generate(client, message="this message is far longer than four tokens")

    assert res.status_code == 413
    assert fake_db.rows("usage_ledger") == []
    assert fake_db.rows("nodes") == []


def test_other_users_session_is_rejected(client, fake_db):
    res = _generate(client, session_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

    assert res.status_code == 403
    assert fake_db.rows("usage_ledger") == []


def test_db_failure_after_reservation_still_refunds(client, fake_db, monkeypatch):
    """A Supabase hiccup between reserving and streaming must not leave a charge."""
    real_set_status = main._set_status

    def flaky_set_status(attempt_id, status, error=None):
        if status == "streaming":
            raise ConnectionError("postgrest 503")
        real_set_status(attempt_id, status, error)

    monkeypatch.setattr(main, "_set_status", flaky_set_status)
    monkeypatch.setattr(main, "stream_completion", lambda *_: stream_of("never"))

    events = parse_sse(_generate(client).text)

    assert events[-1][0] == "error"
    assert fake_db.rows("generation_attempts")[0]["status"] == "failed"
    assert fake_db.rows("usage_ledger") == []


def test_bookkeeping_failure_after_full_answer_refunds(client, fake_db, monkeypatch):
    """If we cannot persist the answer, the user cannot see it later — so no charge."""
    monkeypatch.setattr(main, "stream_completion", lambda *_: stream_of("ok"))

    def broken_finish(_turn, _full):
        raise ConnectionError("postgrest 503")

    monkeypatch.setattr(main, "_finish_completed", broken_finish)

    events = parse_sse(_generate(client).text)

    assert events[-1][0] == "error"
    assert fake_db.rows("usage_ledger") == []


# ── precedence of the concurrent pre-flight checks ───────────────────────────
#
# Rate limit, ownership and plan now run together under asyncio.gather rather
# than one after another. Whichever query finishes first must not decide which
# error the client sees, so each of these fails two checks at once and pins the
# status the caller gets.


def _deny_rate_limit(fake_db) -> None:
    fake_db.rpc_handlers["hit_rate_limit"] = lambda _db, _p: {
        "allowed": False,
        "retry_after": 30,
    }


def test_rate_limit_is_reported_before_a_foreign_session(client, fake_db):
    _deny_rate_limit(fake_db)

    # SESSION_B belongs to nobody; ownership would also fail.
    res = _generate(client, session_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

    assert res.status_code == 429


def test_rate_limit_is_reported_before_a_forbidden_model(client, fake_db):
    _deny_rate_limit(fake_db)

    res = _generate(client, model_id="claude-opus")  # Pro-only, user is free

    assert res.status_code == 429


def test_foreign_session_is_reported_before_a_forbidden_model(client):
    res = _generate(
        client,
        session_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        model_id="claude-opus",
    )

    assert res.status_code == 403
    assert "Session not found" in res.json()["detail"]


def test_empty_message_is_reported_before_a_forbidden_model(client):
    # The 422 is pure validation and used to run before the plan lookup; the
    # plan result is now computed earlier but must still be raised after it.
    res = _generate(client, message="   ", model_id="claude-opus")

    assert res.status_code == 422


def test_a_forbidden_model_still_reports_403_on_its_own(client, fake_db):
    res = _generate(client, model_id="claude-opus")

    assert res.status_code == 403
    assert "Pro" in res.json()["detail"]
    assert fake_db.rows("usage_ledger") == []  # nothing reserved
