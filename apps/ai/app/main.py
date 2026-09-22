"""ChatGRP AI layer (FastAPI).

Owns everything that touches an AI model: streaming, context building, model
routing, generation-attempt tracking, and credit accounting.

/generate lifecycle:
  rate limit -> session ownership -> attachment ownership -> plan gate
  -> reserve credits (atomic in Postgres, may 402)
  -> build prompt (may 413)
  -> create node + messages + attempt
  -> stream -> completed | failed | cancelled

Credits are reserved before any row exists and refunded on every path that
does not end in a completed answer, so a user is never charged for an answer
they did not receive.
"""
import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from . import attachments as att
from .auth import verify_user
from .billing import assert_plan_allows, link_attempt, refund_quietly, reserve_credits
from .budget import approx_tokens, enforce_budget, message_tokens, total_tokens
from .config import settings
from .context import build_context
from .db import attempt_belongs_to, db, session_belongs_to
from .observability import cloud_run_revision, default_environment, init_sentry, tag_user
from .ratelimit import check_rate_limit
from .router import stream_completion

log = logging.getLogger(__name__)

# Before the app exists, so the Starlette/FastAPI integrations wrap it.
init_sentry(settings.sentry_dsn, default_environment(), cloud_run_revision())

app = FastAPI(title="ChatGRP AI Layer", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# How often a running stream re-reads its attempt row to notice a cancel.
# Polling (rather than in-process signalling) works across Cloud Run instances.
#
# Every tick is a round trip to us-west-2 and almost every one answers "no" -
# a 30s answer cost 30 queries to catch a click that usually never comes, per
# concurrent stream. Three seconds costs a third of that and delays a cancel
# by at most two, which nobody perceives mid-stream. The real fix is to stop
# asking: LISTEN/NOTIFY would let the cancel endpoint wake the stream.
CANCEL_POLL_SECONDS = 3.0

# Statuses a cancel request is allowed to interrupt.
ACTIVE_STATUSES = ("pending", "streaming")

# Shown to the user on provider failure; the real error is logged server-side.
PROVIDER_ERROR_MESSAGE = "The model provider returned an error. You were not charged."


class AttachmentRef(BaseModel):
    """A file the client has already uploaded to the attachments bucket."""

    storage_path: str
    file_name: str
    mime_type: str
    size_bytes: int
    kind: str


class GenerateRequest(BaseModel):
    session_id: str
    message: str
    model_id: str = "gpt-4o-mini"
    parent_id: str | None = None
    is_fork: bool = False
    attachments: list[AttachmentRef] = []


@dataclass(frozen=True)
class Turn:
    """Everything the streaming generator needs to know about one generation."""

    node_id: str
    parent_id: str | None
    assistant_id: str
    attempt_id: str
    ledger_id: str
    model_id: str
    context: list[dict]
    tokens_input: int


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "chatgrp-ai"}


@app.post("/generate")
async def generate(body: GenerateRequest, user_id: str = Depends(verify_user)):
    """Create a node (reply to parent_id), then stream the assistant answer."""
    tag_user(user_id)

    # Rate limit, ownership and plan are three independent reads of three
    # different tables. Run at once they cost one round trip instead of three
    # (~40ms each: the service is in us-central1, the database in us-west-2).
    #
    # to_thread matters as much as the concurrency: supabase-py is synchronous,
    # so calling it directly from this async handler blocks the event loop for
    # every other request on the worker.
    rate, owns, plan_or_error = await asyncio.gather(
        asyncio.to_thread(check_rate_limit, user_id),
        asyncio.to_thread(session_belongs_to, body.session_id, user_id),
        asyncio.to_thread(assert_plan_allows, user_id, body.model_id),
        return_exceptions=True,
    )

    # Resolve in a fixed order. Without this the error a client sees would
    # depend on which query happened to finish first.
    if isinstance(rate, BaseException):
        raise rate
    if isinstance(owns, BaseException):
        raise owns
    if not owns:
        raise HTTPException(status_code=403, detail="Session not found")

    files = [a.model_dump() for a in body.attachments]
    if not body.message.strip() and not files:
        raise HTTPException(status_code=422, detail="Message or attachment required")

    # Attachment paths are client-supplied and the service-role key ignores RLS,
    # so ownership must be proven before any object is fetched.
    try:
        att.verify_ownership(files, user_id, body.session_id)
    except att.AttachmentError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Checked above, alongside the rate limit and ownership; raised here so a
    # plan failure still reports after the 422s, exactly as it did when these
    # ran one after another.
    if isinstance(plan_or_error, BaseException):
        raise plan_or_error
    plan = plan_or_error

    # Reserve before anything is persisted. Postgres serialises this per user,
    # so parallel requests cannot overshoot the cap (migration 0008).
    ledger_id = reserve_credits(user_id, plan, body.model_id)
    try:
        context = _build_prompt(body, files)
        node_id, assistant_id, attempt_id = _create_turn(body, files, user_id)
        link_attempt(ledger_id, attempt_id)
    except Exception:
        refund_quietly(ledger_id)
        raise

    turn = Turn(
        node_id=node_id,
        parent_id=body.parent_id,
        assistant_id=assistant_id,
        attempt_id=attempt_id,
        ledger_id=ledger_id,
        model_id=body.model_id,
        context=context,
        tokens_input=total_tokens(context),
    )
    return EventSourceResponse(_stream_events(turn))


def _build_prompt(body: GenerateRequest, files: list[dict]) -> list[dict]:
    """Branch context (root -> parent) + the new message, trimmed to budget."""
    context = build_context(body.session_id, body.parent_id)
    try:
        current = att.build_message_content(body.message, files)
    except att.AttachmentError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # A single message that busts the cap on its own can never be trimmed to
    # fit, so reject it up front rather than silently sending a truncated one.
    if message_tokens(current) > settings.max_input_tokens:
        raise HTTPException(
            status_code=413,
            detail="This message and its attachments exceed the input limit. "
            "Try fewer or smaller files.",
        )

    return enforce_budget([*context, current])


def _create_turn(body: GenerateRequest, files: list[dict], user_id: str) -> tuple[str, str, str]:
    """Persist node + user message + empty assistant message + pending attempt."""
    # order_index = number of existing siblings under the same parent.
    existing = (
        db().table("nodes").select("parent_id").eq("session_id", body.session_id).execute().data
    )
    order_index = sum(1 for n in existing if n["parent_id"] == body.parent_id)

    node = (
        db()
        .table("nodes")
        .insert(
            {
                "session_id": body.session_id,
                "parent_id": body.parent_id,
                "is_fork": body.is_fork,
                "order_index": order_index,
                "position_x": 0,
                "position_y": 0,
            }
        )
        .execute()
        .data[0]
    )
    node_id = node["id"]

    user_message = (
        db()
        .table("messages")
        .insert(
            {
                "node_id": node_id,
                "session_id": body.session_id,
                "role": "user",
                "content": body.message,
            }
        )
        .execute()
        .data[0]
    )
    att.persist(files, user_message["id"], body.session_id, user_id)

    assistant = (
        db()
        .table("messages")
        .insert(
            {"node_id": node_id, "session_id": body.session_id, "role": "assistant", "content": ""}
        )
        .execute()
        .data[0]
    )

    attempt = (
        db()
        .table("generation_attempts")
        .insert(
            {
                "message_id": assistant["id"],
                "node_id": node_id,
                "model_id": body.model_id,
                "status": "pending",
            }
        )
        .execute()
        .data[0]
    )
    return node_id, assistant["id"], attempt["id"]


async def _stream_events(turn: Turn) -> AsyncIterator[dict]:
    """SSE generator: node -> token* -> done | error | cancelled.

    Every DB write after the reservation lives inside one try, so any failure
    — provider, network, or our own bookkeeping — ends in a refund. The final
    event is yielded *outside* the try so a client that disconnects at that
    exact moment cannot re-enter the handlers and finish the attempt twice.
    """
    # Tell the client which node/attempt was created so it can render and cancel.
    yield {
        "event": "node",
        "data": json.dumps(
            {"node_id": turn.node_id, "parent_id": turn.parent_id, "attempt_id": turn.attempt_id}
        ),
    }

    full = ""
    outcome: str | None = None  # "done" | "cancelled" | "error" once bookkeeping has run
    try:
        _set_status(turn.attempt_id, "streaming")
        last_poll = time.monotonic()
        cancelled = False
        async for chunk in stream_completion(turn.model_id, turn.context):
            full += chunk
            yield {"event": "token", "data": chunk}

            if time.monotonic() - last_poll >= CANCEL_POLL_SECONDS:
                last_poll = time.monotonic()
                if _is_cancelled(turn.attempt_id):
                    cancelled = True
                    break

        if cancelled:
            _finish_cancelled(turn, full)
            outcome = "cancelled"
        else:
            _finish_completed(turn, full)
            outcome = "done"
    except (asyncio.CancelledError, GeneratorExit):
        # The client went away mid-stream. Keep what was generated, charge nothing.
        if outcome is None:
            _finish_cancelled(turn, full)
        raise
    except Exception as exc:
        log.exception("generation failed (attempt %s, model %s)", turn.attempt_id, turn.model_id)
        _finish_failed(turn, exc)
        outcome = "error"

    if outcome == "error":
        yield {"event": "error", "data": PROVIDER_ERROR_MESSAGE}
    else:
        yield {"event": outcome, "data": json.dumps({"node_id": turn.node_id})}


def _set_status(attempt_id: str, status: str, error: str | None = None) -> None:
    patch: dict = {"status": status}
    if status != "streaming":
        patch["completed_at"] = _now()
    if error is not None:
        patch["error"] = error
    db().table("generation_attempts").update(patch).eq("id", attempt_id).execute()


def _is_cancelled(attempt_id: str) -> bool:
    rows = (
        db().table("generation_attempts").select("status").eq("id", attempt_id).limit(1).execute().data
    )
    return bool(rows) and rows[0]["status"] == "cancelled"


def _finish_completed(turn: Turn, full: str) -> None:
    db().table("messages").update({"content": full}).eq("id", turn.assistant_id).execute()
    db().table("generation_attempts").update(
        {
            "status": "completed",
            "completed_at": _now(),
            "tokens_input": turn.tokens_input,
            "tokens_output": approx_tokens(full),
        }
    ).eq("id", turn.attempt_id).execute()


def _finish_cancelled(turn: Turn, partial: str) -> None:
    """Keep the partial answer so the user sees what they got; release the credits."""
    db().table("messages").update({"content": partial}).eq("id", turn.assistant_id).execute()
    _set_status(turn.attempt_id, "cancelled")
    refund_quietly(turn.ledger_id)


def _finish_failed(turn: Turn, exc: Exception) -> None:
    """Record the failure and refund. Must not raise: we are already handling an error."""
    try:
        _set_status(turn.attempt_id, "failed", error=str(exc))
    except Exception:  # the DB may be the thing that is failing
        log.exception("could not mark attempt %s failed", turn.attempt_id)
    refund_quietly(turn.ledger_id)


@app.delete("/generate/{attempt_id}/cancel")
async def cancel(attempt_id: str, user_id: str = Depends(verify_user)) -> dict:
    """Ask a running generation to stop. The stream notices on its next poll.

    Only pending/streaming attempts flip; a finished one is left alone so a
    late cancel cannot un-complete an answer that was already billed.
    """
    if not attempt_belongs_to(attempt_id, user_id):
        raise HTTPException(status_code=404, detail="Attempt not found")

    updated = (
        db()
        .table("generation_attempts")
        .update({"status": "cancelled", "completed_at": _now()})
        .eq("id", attempt_id)
        .in_("status", list(ACTIVE_STATUSES))
        .execute()
        .data
    )
    return {"cancelled": bool(updated), "attempt_id": attempt_id}
