"""Settings must fail at startup with a clear message, not 500 on first request."""
import pytest

from app.config import load_settings

REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]


@pytest.fixture
def clean_env(monkeypatch):
    for name in REQUIRED + ["USE_MOCK_AI", "MAX_INPUT_TOKENS", "PROVIDER_TIMEOUT_SECONDS"]:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "key")


@pytest.mark.parametrize("missing", REQUIRED)
def test_missing_required_var_names_it(clean_env, monkeypatch, missing):
    monkeypatch.delenv(missing)

    with pytest.raises(RuntimeError) as exc:
        load_settings(_env_file=None)

    assert missing in str(exc.value)
    assert ".env.example" in str(exc.value)


def test_defaults_are_dev_safe(clean_env):
    s = load_settings(_env_file=None)

    assert s.use_mock_ai is True
    assert s.max_input_tokens == 4096
    assert s.provider_timeout_seconds > 0
    assert s.provider_stream_deadline_seconds > s.provider_timeout_seconds
    assert s.provider_stream_deadline_seconds < 600  # Cloud Run request timeout
    assert s.max_output_tokens > 0
    assert s.openai_api_key == ""


def test_use_mock_ai_false_parses(clean_env, monkeypatch):
    monkeypatch.setenv("USE_MOCK_AI", "false")
    assert load_settings(_env_file=None).use_mock_ai is False


def test_bad_integer_is_rejected(clean_env, monkeypatch):
    monkeypatch.setenv("MAX_INPUT_TOKENS", "lots")
    with pytest.raises(RuntimeError) as exc:
        load_settings(_env_file=None)
    assert "MAX_INPUT_TOKENS" in str(exc.value)
