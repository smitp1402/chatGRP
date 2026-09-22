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


def _branch(fake_db, depth: int) -> str:
    """A straight chain `depth` nodes deep, two messages and one file per node."""
    parent = None
    for i in range(depth):
        parent = _node(fake_db, parent)
        mid = _say(fake_db, parent, "user", f"q{i}", f"2026-01-01T00:00:{i:02d}")
        fake_db.table("attachments").insert(
            {"message_id": mid, "session_id": SESSION_A, "file_name": f"f{i}.pdf"}
        ).execute()
        _say(fake_db, parent, "assistant", f"a{i}", f"2026-01-01T00:01:{i:02d}")
    return parent


def test_round_trips_do_not_grow_with_branch_depth(fake_db):
    """The whole context must load in a fixed number of queries.

    Iowa -> Oregon is ~40ms per round trip, so a query per node (and another
    per message) made a long branch progressively slower to answer. Depth must
    not change the count.
    """
    shallow = _branch(fake_db, 2)
    fake_db.queries.clear()
    build_context(SESSION_A, shallow)
    shallow_trips = len(fake_db.queries)

    deep = _branch(fake_db, 12)
    fake_db.queries.clear()
    build_context(SESSION_A, deep)
    deep_trips = len(fake_db.queries)

    assert shallow_trips == deep_trips, (
        f"depth changed the query count: {shallow_trips} -> {deep_trips}"
    )
    assert deep_trips <= 3, f"expected nodes+messages+attachments, got {fake_db.queries}"


def test_deep_branch_still_reads_root_to_parent_in_order(fake_db):
    """Batching must not disturb ordering: root first, user before assistant."""
    leaf = _branch(fake_db, 5)

    ctx = build_context(SESSION_A, leaf)

    assert [m["role"] for m in ctx] == ["user", "assistant"] * 5
    assert ctx[0]["content"].startswith("q0")
    assert ctx[1]["content"] == "a0"
    assert ctx[-1]["content"] == "a4"


def test_batched_attachments_stay_on_their_own_message(fake_db):
    """One query for every file must not smear notes across messages."""
    leaf = _branch(fake_db, 3)

    ctx = build_context(SESSION_A, leaf)
    notes = [m["content"] for m in ctx if "[attached earlier:" in m["content"]]

    assert notes == [
        "q0\n[attached earlier: f0.pdf]",
        "q1\n[attached earlier: f1.pdf]",
        "q2\n[attached earlier: f2.pdf]",
    ]
