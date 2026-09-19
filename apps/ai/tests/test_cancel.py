"""Cancel: ownership is enforced, and a running stream actually stops."""
import json

from app import main
from tests.conftest import SESSION_A, USER_A, USER_B, as_user, parse_sse, stream_of


def _seed_attempt(fake_db, owner=USER_A, status="streaming") -> str:
    session_id = SESSION_A if owner == USER_A else "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    if owner != USER_A:
        fake_db.table("sessions").insert({"id": session_id, "user_id": owner}).execute()
    node = fake_db.table("nodes").insert({"session_id": session_id}).execute().data[0]
    attempt = (
        fake_db.table("generation_attempts")
        .insert({"node_id": node["id"], "status": status, "model_id": "gpt-4o-mini"})
        .execute()
        .data[0]
    )
    return attempt["id"]


def test_cannot_cancel_another_users_attempt(client, fake_db):
    attempt_id = _seed_attempt(fake_db, owner=USER_B)

    res = client.delete(f"/generate/{attempt_id}/cancel")

    assert res.status_code == 404
    assert fake_db.rows("generation_attempts")[0]["status"] == "streaming"


def test_unknown_attempt_is_404(client):
    assert client.delete("/generate/does-not-exist/cancel").status_code == 404


def test_owner_can_cancel_running_attempt(client, fake_db):
    attempt_id = _seed_attempt(fake_db)

    res = client.delete(f"/generate/{attempt_id}/cancel")

    assert res.status_code == 200
    assert res.json() == {"cancelled": True, "attempt_id": attempt_id}
    assert fake_db.rows("generation_attempts")[0]["status"] == "cancelled"


def test_cancelling_finished_attempt_is_a_noop(client, fake_db):
    attempt_id = _seed_attempt(fake_db, status="completed")

    res = client.delete(f"/generate/{attempt_id}/cancel")

    assert res.json()["cancelled"] is False
    assert fake_db.rows("generation_attempts")[0]["status"] == "completed"


def test_stream_stops_and_refunds_when_cancelled(client, fake_db, monkeypatch):
    """Simulate the user hitting cancel from another request mid-stream."""

    # The cancel is issued from inside the fake provider stream, i.e. while the
    # same TestClient's POST is in flight. Starlette's TestClient runs each call
    # to completion without a shared portal, so the nested call is safe here;
    # if a future TestClient deadlocks on this, move the cancel to a thread.
    async def slow_stream(*_):
        for i in range(100):
            if i == 3:
                as_user(client, USER_A)
                attempt_id = fake_db.rows("generation_attempts")[0]["id"]
                client.delete(f"/generate/{attempt_id}/cancel")
            yield f"w{i} "

    monkeypatch.setattr(main, "stream_completion", slow_stream)

    res = client.post(
        "/generate", json={"session_id": SESSION_A, "message": "go", "model_id": "gpt-4o-mini"}
    )
    events = parse_sse(res.text)

    assert events[-1][0] == "cancelled"
    tokens = [d for e, d in events if e == "token"]
    assert len(tokens) < 10  # stopped early, did not run all 100

    attempt = fake_db.rows("generation_attempts")[0]
    assert attempt["status"] == "cancelled"
    assert fake_db.rows("usage_ledger") == []  # refunded

    # Partial answer is kept so the user sees what they got.
    assistant = [m for m in fake_db.rows("messages") if m["role"] == "assistant"][0]
    assert assistant["content"].startswith("w0 w1")
    assert json.loads(events[-1][1])["node_id"] == fake_db.rows("nodes")[0]["id"]
