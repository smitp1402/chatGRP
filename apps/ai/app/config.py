"""Environment configuration for the ChatGRP AI layer.

Values come from the process environment, with apps/ai/.env (gitignored) as
the local-dev fallback. Required settings with no value fail at import — i.e.
at container start, before Cloud Run routes traffic — naming the variable,
instead of surfacing as a 500 on the first real request.
"""
from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase — JWKS discovery (auth.py) and service-role DB writes. Required.
    supabase_url: str = Field(min_length=1)
    supabase_service_role_key: str = Field(min_length=1)

    # Allowed browser origin for CORS (the Next.js web app).
    web_origin: str = "http://localhost:3000"

    # AI provider keys. Any left blank fall back to mock streaming.
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""

    # When true (default), always use the free mock streamer regardless of keys.
    # Set USE_MOCK_AI=false to call real providers.
    use_mock_ai: bool = True

    # Max input tokens per request (approximate; enforced by trimming context).
    max_input_tokens: int = Field(default=4096, gt=0)

    # Cap on tokens a provider may generate for one answer.
    max_output_tokens: int = Field(default=4096, gt=0)

    # Per-request timeout for the OpenAI and Anthropic SDKs. For streams this is
    # the longest wait between chunks (httpx read timeout), so a stalled
    # provider fails instead of holding the connection (and the credit
    # reservation) open forever.
    provider_timeout_seconds: float = Field(default=120.0, gt=0)

    # The Gemini SDK has no idle timeout — its `timeout` is a gRPC deadline for
    # the whole call. A healthy long answer must fit inside it, so it is a
    # separate, larger budget. Keep it below Cloud Run's request timeout (600).
    provider_stream_deadline_seconds: float = Field(default=540.0, gt=0)


def load_settings(**overrides) -> Settings:
    """Build Settings, turning validation failures into one readable error."""
    try:
        return Settings(**overrides)
    except ValidationError as exc:
        names = ", ".join(sorted({str(e["loc"][0]).upper() for e in exc.errors()}))
        raise RuntimeError(
            f"Invalid or missing environment configuration: {names}. "
            "See apps/ai/.env.example for every variable."
        ) from exc


settings = load_settings()
