"""Provider errors must propagate, not be rewritten as answer text."""
import asyncio

import pytest

from app import router


def test_provider_error_propagates_to_caller(monkeypatch):
    monkeypatch.setattr(router.settings, "use_mock_ai", False)
    monkeypatch.setattr(router.settings, "openai_api_key", "sk-test")

    async def boom(_model, _messages):
        raise RuntimeError("upstream provider 500")
        yield  # pragma: no cover — makes this an async generator

    monkeypatch.setattr(router, "_openai", boom)

    async def consume():
        async for _ in router.stream_completion("gpt-4o-mini", [{"role": "user", "content": "hi"}]):
            pass

    with pytest.raises(RuntimeError, match="upstream provider 500"):
        asyncio.run(consume())


def test_mock_stream_still_works_when_mocking_enabled(monkeypatch):
    monkeypatch.setattr(router.settings, "use_mock_ai", True)

    async def consume() -> str:
        out = ""
        async for chunk in router.stream_completion("gpt-4o-mini", [{"role": "user", "content": "hi"}]):
            out += chunk
        return out

    assert "mock" in asyncio.run(consume())
