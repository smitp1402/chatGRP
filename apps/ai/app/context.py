"""Context builder.

Walks the parent_id chain from a node up to the root and returns the messages
along that path in order. Because we only follow parent_id, sibling branches
are never included — branches are fully isolated.

Attachments from *earlier* messages are summarised as a text note rather than
re-sent as image data. Re-uploading every screenshot on every follow-up would
multiply the token cost of a long branch; the model still knows a file was
part of the conversation.

Three queries, whatever the branch looks like: the node graph, every message
on the path, every attachment on those messages. This used to be one query per
node plus one per message — ~31 round trips for a ten-message branch, growing
without limit as a conversation went on. The service runs in us-central1 and
the database in us-west-2, so each of those was ~40ms of pure travel. Ordering
and grouping are done here in memory, where they cost nothing.
"""
from .db import db


def build_context(session_id: str, parent_id: str | None) -> list[dict]:
    """Return [{role, content}, ...] for the path root -> parent_id."""
    if parent_id is None:
        return []

    path = _path_to_root(session_id, parent_id)
    if not path:
        return []

    messages = _messages_on(path)
    notes = _attachment_notes([m["id"] for m in messages])

    return [{"role": m["role"], "content": _content_of(m, notes)} for m in messages]


def _path_to_root(session_id: str, parent_id: str) -> list[str]:
    """Node ids from the root down to parent_id. Tolerates a corrupt cycle."""
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
    return path


def _messages_on(path: list[str]) -> list[dict]:
    """Every message on the path, ordered root -> parent, then by time."""
    rows = (
        db()
        .table("messages")
        .select("id, node_id, role, content, created_at")
        .in_("node_id", path)
        .order("created_at")
        .execute()
        .data
    )

    # `in_` returns the rows in no meaningful order, so the branch order has to
    # be reimposed here: position in the path first, then time within a node.
    depth_of = {node_id: depth for depth, node_id in enumerate(path)}
    rows.sort(key=lambda m: (depth_of[m["node_id"]], m["created_at"] or ""))
    return rows


def _attachment_notes(message_ids: list[str]) -> dict[str, str]:
    """message_id -> the file names it carried, as one comma-separated string."""
    if not message_ids:
        return {}

    rows = (
        db()
        .table("attachments")
        .select("message_id, file_name")
        .in_("message_id", message_ids)
        .execute()
        .data
    )

    names: dict[str, list[str]] = {}
    for row in rows:
        names.setdefault(row["message_id"], []).append(row["file_name"])
    return {message_id: ", ".join(files) for message_id, files in names.items()}


def _content_of(message: dict, notes: dict[str, str]) -> str:
    """The message text, with a one-line note naming any files it carried."""
    files = notes.get(message["id"])
    if not files:
        return message["content"]
    return f"{message['content']}\n[attached earlier: {files}]"
