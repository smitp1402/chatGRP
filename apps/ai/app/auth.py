"""Supabase access-token verification, done locally.

Supabase signs access tokens with the project's asymmetric key (ES256) and
publishes the public half at /auth/v1/.well-known/jwks.json. We fetch that
once, cache it, and check each request's signature ourselves — no round trip
to Supabase per request, and no outage when its auth endpoint is slow or
rate-limiting us. Key rotation is handled by PyJWKClient: a token with an
unknown `kid` triggers one refetch before it is rejected.

Only asymmetric algorithms are accepted. A token whose header claims HS256
(or "none") is refused outright, so a leaked or guessed shared secret can
never mint a session here.

Tradeoff versus the old per-request call to /auth/v1/user: a user who is
banned, deleted, or signed out keeps a valid token until it expires (Supabase
default: 1 hour). Shorten the access-token lifetime in the Supabase dashboard
if faster revocation matters more than the extra token refreshes.
"""
import asyncio
from functools import lru_cache

import jwt
from fastapi import Header, HTTPException

from .config import settings

ALLOWED_ALGORITHMS = ("ES256", "RS256")
EXPECTED_AUDIENCE = "authenticated"

# How long a fetched key set is trusted before PyJWKClient refetches it.
JWKS_CACHE_SECONDS = 3600

# Tolerated clock drift between Supabase and Cloud Run when checking exp/iat.
CLOCK_SKEW_SECONDS = 10


@lru_cache(maxsize=1)
def _jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(
        f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
        cache_keys=True,
        lifespan=JWKS_CACHE_SECONDS,
        timeout=10,
    )


def _issuer() -> str:
    return f"{settings.supabase_url}/auth/v1"


async def verify_user(authorization: str = Header(default="")) -> str:
    """FastAPI dependency: returns the user id (`sub`) of a valid token."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()

    # Pick the key named by the token's `kid`. On a cache miss (first request,
    # hourly refresh, or rotation) PyJWKClient does a blocking urllib fetch, so
    # it runs in a worker thread rather than stalling every in-flight SSE
    # stream on the event loop. Concurrent misses may fetch twice; the cache
    # is a plain overwrite, so that is wasted work, not a correctness problem.
    # Connection problems are our fault, not the user's — 503, not 401.
    try:
        signing_key = await asyncio.to_thread(_jwks_client().get_signing_key_from_jwt, token)
    except jwt.exceptions.PyJWKClientConnectionError as exc:
        raise HTTPException(
            status_code=503, detail="Could not reach the auth key server — try again shortly."
        ) from exc
    except (jwt.exceptions.PyJWKClientError, jwt.exceptions.DecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    try:
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=list(ALLOWED_ALGORITHMS),
            audience=EXPECTED_AUDIENCE,
            issuer=_issuer(),
            leeway=CLOCK_SKEW_SECONDS,
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=401, detail="Session expired — please sign in again."
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id")
    return user_id
