"""Context builder.

Walks the parent_id chain from a node up to the root and returns the messages
along that path in order. Because we only follow parent_id, sibling branches
are never included — branches are fully isolated.
"""
from .db import db


def build_context(session_id: str, parent_id: str | None) -> list[dict]:
    """Return [{role, content}, ...] for the path root -> parent_id."""
    if parent_id is None:
        return []

    # Load the graph structure once, then walk parents in memory.
    nodes = db().table("nodes").select("id, parent_id").eq("session_id", session_id).execute().data
    parent_of = {n["id"]: n["parent_id"] for n in nodes}

    path: list[str] = []
    cursor: str | None = parent_id
    seen: set[str] = set()
    while cursor and cursor not in seen:
        seen.add(cursor)
        path.append(cursor)
        cursor = parent_of.get(cursor)
    path.reverse()  # root -> ... -> parent

    messages: list[dict] = []
    for node_id in path:
        rows = (
            db()
            .table("messages")
            .select("role, content, created_at")
            .eq("node_id", node_id)
            .order("created_at")
            .execute()
            .data
        )
        for m in rows:
            messages.append({"role": m["role"], "content": m["content"]})
    return messages
