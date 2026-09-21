"""Error reporting for the AI layer.

Sentry is initialised only when SENTRY_DSN is set, so local dev and tests
run without it and nothing is contacted. Once on, every unhandled exception
and every `log.exception(...)` call (the SDK's logging integration turns
ERROR-level logs into events) lands in the dashboard with the request, the
user id, and the Cloud Run revision that served it.
"""
import logging
import os

log = logging.getLogger(__name__)


def init_sentry(dsn: str, environment: str, release: str | None = None) -> bool:
    """Start the SDK if a DSN is configured. Returns whether it is on."""
    if not dsn.strip():
        return False

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        # 10% of requests carry a performance trace; errors are always sent.
        traces_sample_rate=0.1,
        # No IPs, cookies or headers by default; the user id is attached explicitly.
        send_default_pii=False,
        integrations=[StarletteIntegration(), FastApiIntegration()],
    )
    log.info("sentry enabled (environment=%s, release=%s)", environment, release)
    return True


def tag_user(user_id: str) -> None:
    """Attach the authenticated user to whatever is reported for this request."""
    import sentry_sdk

    sentry_sdk.set_user({"id": user_id})


def default_environment() -> str:
    """Cloud Run sets K_SERVICE; anything else is a developer machine."""
    return "production" if os.environ.get("K_SERVICE") else "development"


def cloud_run_revision() -> str | None:
    """K_REVISION names the exact deployed revision — the natural release tag."""
    return os.environ.get("K_REVISION")
