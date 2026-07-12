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

    # AI provider keys — wired at Phase 3 (Multi-Model). Empty until then.
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.environ.get("ANTHROPIC_API_KEY", "")
    google_api_key: str = os.environ.get("GOOGLE_API_KEY", "")


settings = Settings()
