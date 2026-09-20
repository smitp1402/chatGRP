"""Sentry is opt-in by DSN and never contacts anything in tests."""
import sentry_sdk

from app import observability


def test_no_dsn_means_no_init(monkeypatch):
    called = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kw: called.append(kw))

    assert observability.init_sentry("", "production") is False
    assert observability.init_sentry("   ", "production") is False
    assert called == []


def test_dsn_initialises_with_safe_defaults(monkeypatch):
    captured = {}
    monkeypatch.setattr(sentry_sdk, "init", lambda **kw: captured.update(kw))

    on = observability.init_sentry("https://k@o1.ingest.sentry.io/1", "production", release="rev-7")

    assert on is True
    assert captured["dsn"] == "https://k@o1.ingest.sentry.io/1"
    assert captured["environment"] == "production"
    assert captured["release"] == "rev-7"
    assert captured["send_default_pii"] is False
    assert 0 < captured["traces_sample_rate"] < 1
    names = {type(i).__name__ for i in captured["integrations"]}
    assert {"StarletteIntegration", "FastApiIntegration"} <= names


def test_environment_is_production_on_cloud_run(monkeypatch):
    monkeypatch.delenv("K_SERVICE", raising=False)
    assert observability.default_environment() == "development"
    monkeypatch.setenv("K_SERVICE", "chatgrp-ai")
    assert observability.default_environment() == "production"


def test_release_is_the_cloud_run_revision(monkeypatch):
    monkeypatch.delenv("K_REVISION", raising=False)
    assert observability.cloud_run_revision() is None
    monkeypatch.setenv("K_REVISION", "chatgrp-ai-00042-abc")
    assert observability.cloud_run_revision() == "chatgrp-ai-00042-abc"


def test_tag_user_is_harmless_when_sentry_is_off():
    observability.tag_user("11111111-1111-1111-1111-111111111111")  # must not raise
