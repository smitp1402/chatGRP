"""Model router — turns a model_id + messages into a stream of text chunks.

Messages arrive as {"role", "content"} with an optional "images" list of
{"mime", "data" (base64), "name"}. Each provider takes multimodal input in its
own shape, so every adapter below converts before calling out.

Falls back to the free mock streamer when USE_MOCK_AI is true or the relevant
provider key is missing, so development never requires paid keys.
"""
import asyncio
import base64
from collections.abc import AsyncIterator

from .config import settings
from .models import resolve


async def stream_completion(model_id: str, messages: list[dict]) -> AsyncIterator[str]:
    provider, provider_model = resolve(model_id)

    if settings.use_mock_ai:
        async for chunk in _mock(model_id, messages):
            yield chunk
        return

    # Provider/network errors propagate on purpose: main.py marks the attempt
    # failed and refunds the reservation. Rewriting them as answer text here
    # would bill the user for an error and show them a raw SDK message.
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


def _system_prompt() -> str | None:
    """The configured system prompt, or None when blank (then nothing is sent)."""
    return settings.system_prompt.strip() or None


async def _mock(model_id: str, messages: list[dict], note: str = "") -> AsyncIterator[str]:
    last = messages[-1]["content"] if messages else ""
    prior = max(len(messages) - 1, 0)
    suffix = f" ({note})" if note else ""
    images = messages[-1].get("images", []) if messages else []
    seen = (
        f" Received {len(images)} image(s): "
        + ", ".join(i.get("name", "image") for i in images)
        + "."
        if images
        else ""
    )
    reply = (
        f"(mock · {model_id}{suffix}) Considering {prior} prior message(s) in this branch.{seen} "
        f'You asked: "{last}". Set USE_MOCK_AI=false with a provider key for real answers.'
    )
    for word in reply.split(" "):
        await asyncio.sleep(0.03)
        yield word + " "


async def _openai(model: str, messages: list[dict]) -> AsyncIterator[str]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.provider_timeout_seconds,
        max_retries=1,
    )
    system = _system_prompt()
    stream = await client.chat.completions.create(
        model=model,
        # OpenAI takes the system prompt as the first message.
        messages=([{"role": "system", "content": system}] if system else [])
        + _openai_messages(messages),
        stream=True,
        max_tokens=settings.max_output_tokens,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def _openai_messages(messages: list[dict]) -> list[dict]:
    """OpenAI takes content as a list of {type: text|image_url} parts."""
    out: list[dict] = []
    for m in messages:
        images = m.get("images")
        if not images:
            out.append({"role": m["role"], "content": m["content"]})
            continue
        parts: list[dict] = [{"type": "text", "text": m["content"]}]
        parts += [
            {
                "type": "image_url",
                "image_url": {"url": f"data:{i['mime']};base64,{i['data']}"},
            }
            for i in images
        ]
        out.append({"role": m["role"], "content": parts})
    return out


async def _anthropic(model: str, messages: list[dict]) -> AsyncIterator[str]:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        timeout=settings.provider_timeout_seconds,
        max_retries=1,
    )
    # Anthropic takes it as a top-level parameter and rejects system-role messages.
    system = _system_prompt()
    async with client.messages.stream(
        model=model,
        max_tokens=settings.max_output_tokens,
        messages=_anthropic_messages(messages),
        **({"system": system} if system else {}),
    ) as stream:
        async for text in stream.text_stream:
            yield text


def _anthropic_messages(messages: list[dict]) -> list[dict]:
    """Anthropic takes content blocks with base64 image sources."""
    out: list[dict] = []
    for m in messages:
        images = m.get("images")
        if not images:
            out.append({"role": m["role"], "content": m["content"]})
            continue
        blocks: list[dict] = [
            {
                "type": "image",
                "source": {"type": "base64", "media_type": i["mime"], "data": i["data"]},
            }
            for i in images
        ]
        # Anthropic reads images best when they precede the question about them.
        blocks.append({"type": "text", "text": m["content"]})
        out.append({"role": m["role"], "content": blocks})
    return out


async def _google(model: str, messages: list[dict]) -> AsyncIterator[str]:
    import google.generativeai as genai

    genai.configure(api_key=settings.google_api_key)
    # Gemini takes it as the model's system_instruction.
    system = _system_prompt()
    gmodel = genai.GenerativeModel(
        model,
        generation_config={"max_output_tokens": settings.max_output_tokens},
        **({"system_instruction": system} if system else {}),
    )
    contents = []
    for m in messages:
        parts: list = [m["content"]]
        # Gemini takes inline image blobs alongside the text part.
        parts += [
            {"mime_type": i["mime"], "data": base64.b64decode(i["data"])}
            for i in m.get("images", [])
        ]
        contents.append(
            {"role": "user" if m["role"] == "user" else "model", "parts": parts}
        )
    # Whole-call deadline, not a per-chunk timeout (see config.py). A stalled
    # Gemini stream is only cut off when this budget runs out.
    response = await gmodel.generate_content_async(
        contents,
        stream=True,
        request_options={"timeout": settings.provider_stream_deadline_seconds},
    )
    async for chunk in response:
        if chunk.text:
            yield chunk.text
