"""Model router — turns a model_id + messages into a stream of text chunks.

Falls back to the free mock streamer when USE_MOCK_AI is true or the relevant
provider key is missing, so development never requires paid keys.
"""
import asyncio
from collections.abc import AsyncIterator

from .config import settings
from .models import resolve


async def stream_completion(model_id: str, messages: list[dict]) -> AsyncIterator[str]:
    provider, provider_model = resolve(model_id)

    if settings.use_mock_ai:
        async for chunk in _mock(model_id, messages):
            yield chunk
        return

    try:
        if provider == "openai" and settings.openai_api_key:
            async for chunk in _openai(provider_model, messages):
                yield chunk
        elif provider == "anthropic" and settings.anthropic_api_key:
            async for chunk in _anthropic(provider_model, messages):
                yield chunk
        elif provider == "google" and settings.google_api_key:
            async for chunk in _google(provider_model, messages):
                yield chunk
        else:
            async for chunk in _mock(model_id, messages, note="no API key set"):
                yield chunk
    except Exception as exc:  # provider/network error -> surface, don't crash the stream
        yield f"\n[provider error: {exc}]"


async def _mock(model_id: str, messages: list[dict], note: str = "") -> AsyncIterator[str]:
    last = messages[-1]["content"] if messages else ""
    prior = max(len(messages) - 1, 0)
    suffix = f" ({note})" if note else ""
    reply = (
        f"(mock · {model_id}{suffix}) Considering {prior} prior message(s) in this branch. "
        f'You asked: "{last}". Set USE_MOCK_AI=false with a provider key for real answers.'
    )
    for word in reply.split(" "):
        await asyncio.sleep(0.03)
        yield word + " "


async def _openai(model: str, messages: list[dict]) -> AsyncIterator[str]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    stream = await client.chat.completions.create(
        model=model, messages=messages, stream=True
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def _anthropic(model: str, messages: list[dict]) -> AsyncIterator[str]:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    async with client.messages.stream(model=model, max_tokens=1024, messages=messages) as stream:
        async for text in stream.text_stream:
            yield text


async def _google(model: str, messages: list[dict]) -> AsyncIterator[str]:
    import google.generativeai as genai

    genai.configure(api_key=settings.google_api_key)
    gmodel = genai.GenerativeModel(model)
    contents = [
        {"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
        for m in messages
    ]
    response = await gmodel.generate_content_async(contents, stream=True)
    async for chunk in response:
        if chunk.text:
            yield chunk.text
