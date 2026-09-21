"""Context trimming: root pair and current message survive, oldest middle goes."""
from app import budget
from app.attachments import IMAGE_TOKEN_ESTIMATE


def msg(role: str, chars: int, images: int = 0) -> dict:
    m = {"role": role, "content": "x" * chars}
    if images:
        m["images"] = [{"mime": "image/png", "data": ""}] * images
    return m


def test_approx_tokens_is_four_chars_per_token_rounded_up():
    assert budget.approx_tokens("") == 0
    assert budget.approx_tokens("abcd") == 1
    assert budget.approx_tokens("abcde") == 2


def test_images_are_charged_a_flat_estimate():
    assert budget.message_tokens(msg("user", 4, images=2)) == 1 + 2 * IMAGE_TOKEN_ESTIMATE


def test_under_budget_is_untouched(monkeypatch):
    monkeypatch.setattr(budget.settings, "max_input_tokens", 1000)
    messages = [msg("user", 40), msg("assistant", 40), msg("user", 40)]

    assert budget.enforce_budget(messages) == messages


def test_three_or_fewer_messages_are_never_trimmed(monkeypatch):
    """Root pair + current is the minimum a branch can carry."""
    monkeypatch.setattr(budget.settings, "max_input_tokens", 1)
    messages = [msg("user", 400), msg("assistant", 400), msg("user", 400)]

    assert budget.enforce_budget(messages) == messages


def test_oldest_middle_messages_are_dropped_first(monkeypatch):
    # Every message is 10 tokens; budget fits 5 of the 7.
    monkeypatch.setattr(budget.settings, "max_input_tokens", 50)
    root_u, root_a = msg("user", 40), msg("assistant", 40)
    old_u, old_a = {"role": "user", "content": "old" + "x" * 37}, msg("assistant", 40)
    new_u, new_a = {"role": "user", "content": "new" + "x" * 37}, msg("assistant", 40)
    current = {"role": "user", "content": "cur" + "x" * 37}

    trimmed = budget.enforce_budget([root_u, root_a, old_u, old_a, new_u, new_a, current])

    assert trimmed == [root_u, root_a, new_u, new_a, current]
    assert budget.total_tokens(trimmed) <= 50


def test_root_pair_and_current_survive_even_when_over_budget(monkeypatch):
    monkeypatch.setattr(budget.settings, "max_input_tokens", 25)
    root_u, root_a = msg("user", 40), msg("assistant", 40)
    current = {"role": "user", "content": "cur" + "x" * 37}
    middle = [msg("assistant", 40)] * 6

    trimmed = budget.enforce_budget([root_u, root_a, *middle, current])

    assert trimmed == [root_u, root_a, current]
