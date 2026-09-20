"""Pricing has one source: packages/shared/pricing.json. Python reads it."""
import json
import pathlib

from app import billing, pricing

SHARED_JSON = pathlib.Path(__file__).resolve().parents[3] / "packages" / "shared" / "pricing.json"


def test_python_tables_match_shared_json():
    data = json.loads(SHARED_JSON.read_text(encoding="utf-8"))

    assert billing.CREDIT_TABLE == data["credits"]
    assert billing.PLAN_CREDITS == data["planCredits"]
    assert billing.FREE_MODELS == set(data["freeModels"])


def test_team_plan_is_gone():
    assert "team" not in billing.PLAN_CREDITS


def test_every_free_model_is_priced():
    assert billing.FREE_MODELS <= set(billing.CREDIT_TABLE)


def test_loader_prefers_the_file_shipped_next_to_the_app(tmp_path, monkeypatch):
    """In the container the JSON is copied into app/; in dev it is read from
    packages/shared. The bundled copy wins when present."""
    bundled = tmp_path / "pricing.json"
    bundled.write_text(
        json.dumps({"credits": {"x": 1}, "planCredits": {"free": 1, "pro": 2}, "freeModels": ["x"]})
    )
    monkeypatch.setattr(pricing, "BUNDLED", bundled)

    loaded = pricing.load()

    assert loaded.credits == {"x": 1}
    assert loaded.free_models == {"x"}


def test_loader_fails_loudly_when_no_file(tmp_path, monkeypatch):
    monkeypatch.setattr(pricing, "BUNDLED", tmp_path / "missing.json")
    monkeypatch.setattr(pricing, "SHARED", tmp_path / "also-missing.json")

    try:
        pricing.load()
    except RuntimeError as exc:
        assert "pricing.json" in str(exc)
    else:  # pragma: no cover
        raise AssertionError("expected RuntimeError")


def test_shared_path_is_none_when_file_is_too_shallow(monkeypatch):
    """Container layout: /app/app/pricing.py has no repo above it."""
    monkeypatch.setattr(pricing.Path, "resolve", lambda self: pathlib.Path("/app/app/pricing.py"))

    assert pricing._shared_path() is None


def test_loader_works_with_no_shared_path(tmp_path, monkeypatch):
    bundled = tmp_path / "pricing.json"
    bundled.write_text(
        json.dumps({"credits": {"x": 1}, "planCredits": {"free": 1, "pro": 2}, "freeModels": ["x"]})
    )
    monkeypatch.setattr(pricing, "BUNDLED", bundled)
    monkeypatch.setattr(pricing, "SHARED", None)

    assert pricing.load().plan_credits == {"free": 1, "pro": 2}
