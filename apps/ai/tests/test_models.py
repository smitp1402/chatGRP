"""Every model we price must route to a real provider, never silently to mock."""
from app import billing
from app.models import PROVIDER_MODELS, resolve

RETIRED = ("claude-3", "gemini-1.5", "gemini-2.0", "gemini-2.5")


def test_every_priced_model_has_a_provider():
    for model_id in billing.CREDIT_TABLE:
        provider, name = resolve(model_id)
        assert provider in {"openai", "anthropic", "google"}, f"{model_id} is unmapped"
        assert name


def test_no_unpriced_models_are_routable():
    assert set(PROVIDER_MODELS) == set(billing.CREDIT_TABLE)


def test_unknown_id_falls_back_to_mock():
    assert resolve("not-a-model") == ("mock", "not-a-model")


def test_defaults_do_not_name_retired_models():
    for model_id, (_, name) in PROVIDER_MODELS.items():
        assert not name.startswith(RETIRED), f"{model_id} -> {name} was retired by its provider"
