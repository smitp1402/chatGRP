"""Approximate token budgeting.

We avoid a per-provider tokenizer and use a ~4 chars/token heuristic. If the
context exceeds the input cap, the oldest message pairs are dropped first while
the root pair is always preserved (branch origin stays in context).

Attached images are not text, so they are charged a flat per-image estimate
(see IMAGE_TOKEN_ESTIMATE). Providers bill images by tile count; the constant is
deliberately pessimistic so we never under-charge a user's credits.
"""
from .attachments import IMAGE_TOKEN_ESTIMATE
from .config import settings


def approx_tokens(text: str) -> int:
    return (len(text) + 3) // 4


def message_tokens(message: dict) -> int:
    """Text tokens plus a flat estimate for each attached image."""
    return approx_tokens(message["content"]) + IMAGE_TOKEN_ESTIMATE * len(
        message.get("images", [])
    )


def total_tokens(messages: list[dict]) -> int:
    return sum(message_tokens(m) for m in messages)


def enforce_budget(messages: list[dict]) -> list[dict]:
    """Return messages trimmed to fit settings.max_input_tokens.

    messages is [root_user, root_assistant, ..., current_user]. We keep the
    first pair (root) and the last message (current), dropping the oldest
    middle messages until under budget.
    """
    budget = settings.max_input_tokens
    if total_tokens(messages) <= budget or len(messages) <= 3:
        return messages

    head = messages[:2]  # root pair
    tail = messages[2:]  # everything after root, incl. current user message

    # Drop from the front of `tail` (oldest) until it fits, always keeping the
    # final (current) message.
    while len(tail) > 1 and total_tokens(head + tail) > budget:
        tail = tail[1:]

    return head + tail
