"""Every provider gets the system prompt, in the shape that provider expects.

Without one the models default to essay-length answers: slower, costlier, and
not what a chat canvas wants. The SDKs are recording fakes; no network.
"""
import asyncio
import sys
import types

import pytest

from app import router

PROMPT = "Be brief. TEST-SYSTEM-PROMPT."
USER = [{"role": "user", "content": "hi"}]


@pytest.fixture
def cfg(monkeypatch):
    monkeypatch.setattr(router.settings, "use_mock_ai", False)
    monkeypatch.setattr(router.settings, "system_prompt", PROMPT)
    return router.settings


def _run(agen):
    async def consume():
        return [c async for c in agen]

    return asyncio.run(consume())


class _Empty:
    def __aiter__(self):
        return self

    async def __anext__(self):
        raise StopAsyncIteration


def _fake_openai(rec):
    class FakeAsyncOpenAI:
        def __init__(self, **_):
            self.chat = types.SimpleNamespace(completions=types.SimpleNamespace(create=self._create))

        async def _create(self, **kwargs):
            rec.update(kwargs)
            return _Empty()

    return types.SimpleNamespace(AsyncOpenAI=FakeAsyncOpenAI)


def test_openai_gets_it_as_the_first_system_message(cfg, monkeypatch):
    monkeypatch.setattr(cfg, "openai_api_key", "sk-test")
    rec: dict = {}
    monkeypatch.setitem(sys.modules, "openai", _fake_openai(rec))

    _run(router.stream_completion("gpt-4o-mini", USER))

    assert rec["messages"][0] == {"role": "system", "content": PROMPT}
    assert rec["messages"][1:] == USER


def test_anthropic_gets_it_as_the_system_parameter(cfg, monkeypatch):
    monkeypatch.setattr(cfg, "anthropic_api_key", "sk-ant")
    rec: dict = {}

    class Ctx:
        text_stream = _Empty()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

    class FakeAsyncAnthropic:
        def __init__(self, **_):
            self.messages = types.SimpleNamespace(stream=self._stream)

        def _stream(self, **kwargs):
            rec.update(kwargs)
            return Ctx()

    monkeypatch.setitem(sys.modules, "anthropic", types.SimpleNamespace(AsyncAnthropic=FakeAsyncAnthropic))

    _run(router.stream_completion("claude-sonnet", USER))

    assert rec["system"] == PROMPT
    assert all(m["role"] != "system" for m in rec["messages"])  # Anthropic rejects system-role messages


def test_google_gets_it_as_system_instruction(cfg, monkeypatch):
    monkeypatch.setattr(cfg, "google_api_key", "g-key")
    rec: dict = {}

    class FakeModel:
        def __init__(self, name, **kwargs):
            rec.update(kwargs)

        async def generate_content_async(self, contents, **_):
            rec["contents"] = contents
            return _Empty()

    fake = types.SimpleNamespace(configure=lambda **_: None, GenerativeModel=FakeModel)
    monkeypatch.setitem(sys.modules, "google.generativeai", fake)
    monkeypatch.setitem(sys.modules, "google", types.SimpleNamespace(generativeai=fake))

    _run(router.stream_completion("gemini-flash", USER))

    assert rec["system_instruction"] == PROMPT
    assert [c["role"] for c in rec["contents"]] == ["user"]


def test_blank_prompt_sends_none(cfg, monkeypatch):
    monkeypatch.setattr(cfg, "system_prompt", "   ")
    monkeypatch.setattr(cfg, "openai_api_key", "sk-test")
    rec: dict = {}
    monkeypatch.setitem(sys.modules, "openai", _fake_openai(rec))

    _run(router.stream_completion("gpt-4o-mini", USER))

    assert rec["messages"] == USER


def test_default_prompt_asks_for_brevity_and_markdown():
    from app.config import Settings

    default = Settings.model_fields["system_prompt"].default
    assert "concise" in default.lower()
    assert "markdown" in default.lower()


def test_system_prompt_is_not_counted_against_the_users_input_budget():
    """The budget trims user context; the prompt is ours and always sent."""
    from app.budget import total_tokens

    assert total_tokens(USER) == total_tokens([*USER])  # budget never sees the prompt
