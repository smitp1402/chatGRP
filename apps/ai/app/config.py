"""Environment configuration for the ChatGRP AI layer.

Secrets are read from apps/ai/.env (gitignored). Never commit real values.
"""
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Supabase — used for JWT verification and (later) service-role DB writes.
    supabase_url: str = os.environ.get("SUPABASE_URL", "")
    supabase_service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_jwt_secret: str = os.environ.get("SUPABASE_JWT_SECRET", "")

    # Allowed browser origin for CORS (the Next.js web app).
    web_origin: str = os.environ.get("WEB_ORIGIN", "http://localhost:3000")

    # AI provider keys. Any left blank fall back to mock streaming.
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.environ.get("ANTHROPIC_API_KEY", "")
    google_api_key: str = os.environ.get("GOOGLE_API_KEY", "")

    # When true (default), always use the free mock streamer regardless of keys.
    # Set USE_MOCK_AI=false in apps/ai/.env to call real providers.
    use_mock_ai: bool = os.environ.get("USE_MOCK_AI", "true").lower() != "false"

    # Max input tokens per request (approximate; enforced by truncating context).
    max_input_tokens: int = int(os.environ.get("MAX_INPUT_TOKENS", "4096"))


settings = Settings()
