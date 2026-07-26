"""Maps ChatGRP's internal model ids to a provider + provider-specific model.

Provider model names move fast — if a call 404s, update the string here (or
override via env, e.g. MODEL_GEMINI_FLASH=gemini-2.5-flash).
"""
import os

# internal_id -> (provider, provider_model_name)
PROVIDER_MODELS: dict[str, tuple[str, str]] = {
    "gpt-4o-mini": ("openai", os.environ.get("MODEL_GPT_4O_MINI", "gpt-4o-mini")),
    "gpt-4o": ("openai", os.environ.get("MODEL_GPT_4O", "gpt-4o")),
    "claude-sonnet": ("anthropic", os.environ.get("MODEL_CLAUDE_SONNET", "claude-3-5-sonnet-latest")),
    "claude-opus": ("anthropic", os.environ.get("MODEL_CLAUDE_OPUS", "claude-3-opus-latest")),
    "gemini-flash": ("google", os.environ.get("MODEL_GEMINI_FLASH", "gemini-2.0-flash")),
    "gemini-pro": ("google", os.environ.get("MODEL_GEMINI_PRO", "gemini-1.5-pro")),
}


def resolve(model_id: str) -> tuple[str, str]:
    return PROVIDER_MODELS.get(model_id, ("mock", model_id))
