"""Maps ChatGRP's internal model ids to a provider + provider-specific model.

Provider model names move fast — if a call 404s, update the string here (or
override via env, e.g. MODEL_GEMINI_FLASH=gemini-2.5-flash). The defaults
below were checked against each provider's /models listing on 2026-09-21;
the Claude 3 and Gemini 1.5/2.0 names they replace had been retired, and
Gemini 2.5 is listed but refused for new accounts. Gemini Pro uses Google's
`-latest` alias because the only versioned Pro name is a preview; it needs a
billing-enabled Google AI project (the free tier has no Pro quota).
"""
import os

# internal_id -> (provider, provider_model_name)
PROVIDER_MODELS: dict[str, tuple[str, str]] = {
    "gpt-4o-mini": ("openai", os.environ.get("MODEL_GPT_4O_MINI", "gpt-4o-mini")),
    "gpt-4o": ("openai", os.environ.get("MODEL_GPT_4O", "gpt-4o")),
    "claude-sonnet": ("anthropic", os.environ.get("MODEL_CLAUDE_SONNET", "claude-sonnet-5")),
    "claude-opus": ("anthropic", os.environ.get("MODEL_CLAUDE_OPUS", "claude-opus-5")),
    "gemini-flash": ("google", os.environ.get("MODEL_GEMINI_FLASH", "gemini-3.6-flash")),
    "gemini-pro": ("google", os.environ.get("MODEL_GEMINI_PRO", "gemini-pro-latest")),
}


def resolve(model_id: str) -> tuple[str, str]:
    return PROVIDER_MODELS.get(model_id, ("mock", model_id))
