"""Branch context: root -> parent in order, siblings never leak."""
from app.context import build_context
from tests.conftest import SESSION_A


def _node(fake_db, parent_id=None) -> str:
    return fake_db.table("nodes").insert({"session_id": SESSION_A, "parent_id": parent_id}).execute().data[0]["id"]


def _say(fake_db, node_id: str, role: str, content: str, at: str) -> str:
    return (
        fake_db.table("messages")
        .insert({"node_id": node_id, "session_id": SESSION_A, "role": role, "content": content, "created_at": at})
        .execute()
        .data[0]["id"]
    )


def test_root_request_has_no_context(fake_db):
    assert build_context(SESSION_A, None) == []


def test_path_is_root_to_parent_in_message_order(fake_db):
    root = _node(fake_db)
    _say(fake_db, root, "user", "q1", "2026-01-01T00:00:00")
    _say(fake_db, root, "assistant", "a1", "2026-01-01T00:00:01")
    child = _node(fake_db, root)
    _say(fake_db, child, "user", "q2", "2026-01-01T00:00:02")
    _say(fake_db, child, "assistant", "a2", "2026-01-01T00:00:03")

    ctx = build_context(SESSION_A, child)

    assert [(m["role"], m["content"]) for m in ctx] == [
        ("user", "q1"), ("assistant", "a1"), ("user", "q2"), ("assistant", "a2"),
    ]


def test_sibling_branches_are_excluded(fake_db):
    """A fork must not see what happened on its sibling."""
    root = _node(fake_db)
    _say(fake_db, root, "user", "root-q", "2026-01-01T00:00:00")
    left = _node(fake_db, root)
    _say(fake_db, left, "user", "LEFT-SECRET", "2026-01-01T00:00:01")
    right = _node(fake_db, root)
    _say(fake_db, right, "user", "right-q", "2026-01-01T00:00:02")

    ctx = build_context(SESSION_A, right)
    contents = [m["content"] for m in ctx]

    assert contents == ["root-q", "right-q"]
    assert "LEFT-SECRET" not in contents


def test_earlier_attachments_are_summarised_not_resent(fake_db):
    root = _node(fake_db)
    mid = _say(fake_db, root, "user", "see the file", "2026-01-01T00:00:00")
    fake_db.table("attachments").insert(
        {"message_id": mid, "session_id": SESSION_A, "file_name": "spec.pdf"}
    ).execute()

    ctx = build_context(SESSION_A, root)

    assert ctx[0]["content"] == "see the file\n[attached earlier: spec.pdf]"
    assert "images" not in ctx[0]


def test_cycle_in_parent_chain_does_not_hang(fake_db):
    a = _node(fake_db)
    b = _node(fake_db, a)
    fake_db.table("nodes").update({"parent_id": b}).eq("id", a).execute()  # corrupt: a -> b -> a
    _say(fake_db, a, "user", "qa", "2026-01-01T00:00:00")
    _say(fake_db, b, "user", "qb", "2026-01-01T00:00:01")

    ctx = build_context(SESSION_A, b)

    assert len(ctx) == 2
