"""Every provider call carries a timeout and an output cap.

The SDKs are replaced with recording fakes; nothing here touches the network.
"""
import asyncio
import sys
import types

import pytest

from app import router


class _Recorder:
    """Captures constructor kwargs and call kwargs of a fake SDK client."""

    def __init__(self):
        self.init_kwargs: dict = {}
        self.call_kwargs: dict = {}


@pytest.fixture
def cfg(monkeypatch):
    monkeypatch.setattr(router.settings, "use_mock_ai", False)
    monkeypatch.setattr(router.settings, "provider_timeout_seconds", 42.0)
    monkeypatch.setattr(router.settings, "provider_stream_deadline_seconds", 543.0)
    monkeypatch.setattr(router.settings, "max_output_tokens", 777)
    return router.settings


def _run(agen):
    async def consume():
        return [c async for c in agen]

    return asyncio.run(consume())


def test_openai_gets_timeout_and_max_tokens(cfg, monkeypatch):
    monkeypatch.setattr(cfg, "openai_api_key", "sk-test")
    rec = _Recorder()

    class FakeStream:
        def __aiter__(self):
            return self

        async def __anext__(self):
            raise StopAsyncIteration

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            rec.init_kwargs = kwargs
            self.chat = types.SimpleNamespace(
                completions=types.SimpleNamespace(create=self._create)
            )

        async def _create(self, **kwargs):
            rec.call_kwargs = kwargs
            return FakeStream()

    monkeypatch.setitem(sys.modules, "openai", types.SimpleNamespace(AsyncOpenAI=FakeAsyncOpenAI))

    _run(router.stream_completion("gpt-4o-mini", [{"role": "user", "content": "hi"}]))

    assert rec.init_kwargs["timeout"] == 42.0
    assert rec.call_kwargs["max_tokens"] == 777
    assert rec.call_kwargs["stream"] is True


def test_anthropic_gets_timeout_and_max_tokens(cfg, monkeypatch):
    monkeypatch.setattr(cfg, "anthropic_api_key", "sk-ant")
    rec = _Recorder()

    class FakeTextStream:
        def __aiter__(self):
            return self

        async def __anext__(self):
            raise StopAsyncIteration

    class FakeStreamCtx:
        text_stream = FakeTextStream()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

    class FakeAsyncAnthropic:
        def __init__(self, **kwargs):
            rec.init_kwargs = kwargs
            self.messages = types.SimpleNamespace(stream=self._stream)

        def _stream(self, **kwargs):
            rec.call_kwargs = kwargs
            return FakeStreamCtx()

    monkeypatch.setitem(
        sys.modules, "anthropic", types.SimpleNamespace(AsyncAnthropic=FakeAsyncAnthropic)
    )

    _run(router.stream_completion("claude-sonnet", [{"role": "user", "content": "hi"}]))

    assert rec.init_kwargs["timeout"] == 42.0
    assert rec.call_kwargs["max_tokens"] == 777


def test_google_gets_whole_call_deadline_and_max_tokens(cfg, monkeypatch):
    """Gemini's timeout is a total deadline, so it gets the larger budget."""
    monkeypatch.setattr(cfg, "google_api_key", "g-key")
    rec = _Recorder()

    class FakeResponse:
        def __aiter__(self):
            return self

        async def __anext__(self):
            raise StopAsyncIteration

    class FakeModel:
        def __init__(self, name, **kwargs):
            rec.init_kwargs = kwargs

        async def generate_content_async(self, contents, **kwargs):
            rec.call_kwargs = kwargs
            return FakeResponse()

    fake_genai = types.SimpleNamespace(configure=lambda **_: None, GenerativeModel=FakeModel)
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai)
    monkeypatch.setitem(sys.modules, "google", types.SimpleNamespace(generativeai=fake_genai))

    _run(router.stream_completion("gemini-flash", [{"role": "user", "content": "hi"}]))

    assert rec.call_kwargs["request_options"]["timeout"] == 543.0
    assert rec.init_kwargs["generation_config"]["max_output_tokens"] == 777
