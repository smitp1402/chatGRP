"""ChatGRP AI layer (FastAPI).

Owns everything that touches an AI model: streaming, context building, model
routing, generation-attempt tracking, and (later) credit deduction. This phase
implements a real node/message lifecycle with MOCK token streaming; real
provider calls arrive at Phase 3 (Multi-Model).
"""
import json
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from .auth import verify_user
from .billing import assert_can_generate, record_usage
from .budget import approx_tokens, enforce_budget, total_tokens
from .config import settings
from .context import build_context
from .db import db, session_belongs_to
from .ratelimit import check_rate_limit
from .router import stream_completion

app = FastAPI(title="ChatGRP AI Layer", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    session_id: str
    message: str
    model_id: str = "gpt-4o-mini"
    parent_id: str | None = None
    is_fork: bool = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "chatgrp-ai"}


@app.post("/generate")
async def generate(body: GenerateRequest, user_id: str = Depends(verify_user)):
    """Create a node (reply to parent_id), then stream a mock assistant answer.

    Lifecycle: user message saved + attempt(pending) -> streaming -> assistant
    content saved + attempt(completed). Sibling branches never leak into context.
    """
    check_rate_limit(user_id)

    if not session_belongs_to(body.session_id, user_id):
        raise HTTPException(status_code=403, detail="Session not found")

    # Plan gating + credit check (raises 402/403 before any work is done).
    assert_can_generate(user_id, body.model_id)

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

    db().table("messages").insert(
        {"node_id": node_id, "session_id": body.session_id, "role": "user", "content": body.message}
    ).execute()

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

    # Build the branch context (root -> parent), append the new message, and
    # trim it to the input-token budget (oldest pairs dropped, root preserved).
    context = build_context(body.session_id, body.parent_id)
    context.append({"role": "user", "content": body.message})
    context = enforce_budget(context)
    tokens_input = total_tokens(context)

    async def event_stream():
        # Tell the client which node was created so it can add it to the canvas.
        yield {"event": "node", "data": json.dumps({"node_id": node_id, "parent_id": body.parent_id})}

        db().table("generation_attempts").update({"status": "streaming"}).eq(
            "id", attempt["id"]
        ).execute()

        full = ""
        try:
            async for chunk in stream_completion(body.model_id, context):
                full += chunk
                yield {"event": "token", "data": chunk}
        except Exception as exc:
            db().table("generation_attempts").update(
                {"status": "failed", "error": str(exc), "completed_at": _now()}
            ).eq("id", attempt["id"]).execute()
            yield {"event": "error", "data": str(exc)}
            return

        db().table("messages").update({"content": full}).eq("id", assistant["id"]).execute()
        db().table("generation_attempts").update(
            {
                "status": "completed",
                "completed_at": _now(),
                "tokens_input": tokens_input,
                "tokens_output": approx_tokens(full),
            }
        ).eq("id", attempt["id"]).execute()

        # Deduct credits only after a successful completion.
        record_usage(user_id, attempt["id"], body.model_id)

        yield {"event": "done", "data": json.dumps({"node_id": node_id})}

    return EventSourceResponse(event_stream())


@app.delete("/generate/{attempt_id}/cancel")
async def cancel(attempt_id: str, user_id: str = Depends(verify_user)) -> dict:
    """Mark an in-progress generation as cancelled."""
    db().table("generation_attempts").update(
        {"status": "cancelled", "completed_at": _now()}
    ).eq("id", attempt_id).execute()
    return {"cancelled": True, "attempt_id": attempt_id}
