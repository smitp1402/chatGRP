"""ChatGRP AI layer (FastAPI).

Owns everything that touches an AI model: streaming, context building, model
routing, generation-attempt tracking, and credit deduction. This skeleton
implements health + auth + a MOCK streaming /generate; real provider calls are
wired at Phase 3 (Multi-Model).
"""
import asyncio

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from .auth import verify_user
from .config import settings

app = FastAPI(title="ChatGRP AI Layer", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    message: str
    model_id: str = "gpt-4o-mini"
    node_id: str | None = None
    session_id: str | None = None
    parent_id: str | None = None


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "chatgrp-ai"}


@app.post("/generate")
async def generate(body: GenerateRequest, user_id: str = Depends(verify_user)):
    """Stream a MOCK assistant response over SSE.

    Phase 3 replaces the mock with: build context (walk parent_id), route to the
    provider for model_id, stream real tokens, persist the assistant message,
    record the generation_attempt, and deduct credits.
    """

    async def event_stream():
        preview = (
            f"(mock:{body.model_id}) Received your message "
            f"— real providers are wired at Phase 3. You said: {body.message!r}"
        )
        for word in preview.split(" "):
            await asyncio.sleep(0.06)
            yield {"event": "token", "data": word + " "}
        yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(event_stream())


@app.delete("/generate/{attempt_id}/cancel")
async def cancel(attempt_id: str, user_id: str = Depends(verify_user)) -> dict:
    """Cancel an in-progress generation.

    Phase 2/3 marks the generation_attempt as `cancelled`, discards partial
    content, and charges no credits.
    """
    return {"cancelled": True, "attempt_id": attempt_id}
