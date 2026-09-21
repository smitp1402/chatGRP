"""JWT verification happens locally against the project's JWKS — no network
call per request. Tokens are minted here with a throwaway ES256 key and the
JWKS client is replaced with one that serves that key."""
import asyncio
import time
import types

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from fastapi import HTTPException

from app import auth

KID = "test-kid"
USER = "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def keypair():
    private = ec.generate_private_key(ec.SECP256R1())
    return private, private.public_key()


@pytest.fixture
def jwks(keypair, monkeypatch):
    """Serve the test public key as if it came from /.well-known/jwks.json."""
    _, public = keypair

    class FakeSigningKey:
        key = public

    class FakeJWKSClient:
        def get_signing_key_from_jwt(self, token):
            header = jwt.get_unverified_header(token)
            if header.get("kid") != KID:
                raise jwt.exceptions.PyJWKClientError("kid not found")
            return FakeSigningKey()

    monkeypatch.setattr(auth, "_jwks_client", lambda: FakeJWKSClient())
    monkeypatch.setattr(auth.settings, "supabase_url", "https://proj.supabase.co")
    return public


def mint(private, **claims) -> str:
    now = int(time.time())
    payload = {
        "sub": USER,
        "aud": "authenticated",
        "iss": "https://proj.supabase.co/auth/v1",
        "iat": now,
        "exp": now + 3600,
        "role": "authenticated",
    }
    payload.update(claims)
    alg = payload.pop("_alg", "ES256")
    key = payload.pop("_key", private)
    kid = payload.pop("_kid", KID)
    return jwt.encode(payload, key, algorithm=alg, headers={"kid": kid})


def verify(header: str) -> str:
    return asyncio.run(auth.verify_user(authorization=header))


def test_valid_token_returns_user_id(keypair, jwks):
    private, _ = keypair
    assert verify(f"Bearer {mint(private)}") == USER


def test_token_inside_clock_skew_is_accepted(keypair, jwks):
    private, _ = keypair
    assert verify(f"Bearer {mint(private, exp=int(time.time()) - 3)}") == USER


def test_rs256_key_is_also_accepted(monkeypatch):
    """The allow-list covers RS256 too, for projects on RSA keys."""
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    class FakeSigningKey:
        key = private.public_key()

    class FakeJWKSClient:
        def get_signing_key_from_jwt(self, token):
            return FakeSigningKey()

    monkeypatch.setattr(auth, "_jwks_client", lambda: FakeJWKSClient())
    monkeypatch.setattr(auth.settings, "supabase_url", "https://proj.supabase.co")

    assert verify(f"Bearer {mint(private, _alg='RS256')}") == USER


def test_missing_bearer_is_401(jwks):
    with pytest.raises(HTTPException) as exc:
        verify("")
    assert exc.value.status_code == 401


def test_expired_token_is_401(keypair, jwks):
    private, _ = keypair
    with pytest.raises(HTTPException) as exc:
        # Well past CLOCK_SKEW_SECONDS so leeway cannot rescue it.
        verify(f"Bearer {mint(private, exp=int(time.time()) - 60)}")
    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


def test_wrong_audience_is_401(keypair, jwks):
    private, _ = keypair
    with pytest.raises(HTTPException) as exc:
        verify(f"Bearer {mint(private, aud='anon')}")
    assert exc.value.status_code == 401


def test_wrong_issuer_is_401(keypair, jwks):
    private, _ = keypair
    with pytest.raises(HTTPException) as exc:
        verify(f"Bearer {mint(private, iss='https://evil.example.com/auth/v1')}")
    assert exc.value.status_code == 401


def test_token_signed_by_another_key_is_401(keypair, jwks):
    other = ec.generate_private_key(ec.SECP256R1())
    with pytest.raises(HTTPException) as exc:
        verify(f"Bearer {mint(other)}")
    assert exc.value.status_code == 401


def test_unknown_kid_is_401(keypair, jwks):
    private, _ = keypair
    with pytest.raises(HTTPException) as exc:
        verify(f"Bearer {mint(private, _kid='rotated-away')}")
    assert exc.value.status_code == 401


def test_alg_none_is_rejected(jwks):
    """The classic downgrade: an unsigned token claiming alg=none."""
    token = jwt.encode({"sub": USER, "aud": "authenticated"}, key=None, algorithm="none")
    with pytest.raises(HTTPException) as exc:
        verify(f"Bearer {token}")
    assert exc.value.status_code == 401


def test_hs256_token_is_rejected_when_project_uses_jwks(jwks):
    """A symmetric token must not be accepted just because the header says so."""
    token = jwt.encode(
        {"sub": USER, "aud": "authenticated", "iss": "https://proj.supabase.co/auth/v1",
         "exp": int(time.time()) + 60},
        key="guessable-secret-padded-to-thirty-two-bytes",
        algorithm="HS256",
    )
    with pytest.raises(HTTPException) as exc:
        verify(f"Bearer {token}")
    assert exc.value.status_code == 401


def test_garbage_token_is_401(jwks):
    with pytest.raises(HTTPException) as exc:
        verify("Bearer not.a.jwt")
    assert exc.value.status_code == 401


def test_token_without_sub_is_401(keypair, jwks):
    private, _ = keypair
    token = mint(private)
    # Re-mint with sub removed.
    payload = jwt.decode(token, options={"verify_signature": False})
    del payload["sub"]
    token = jwt.encode(payload, private, algorithm="ES256", headers={"kid": KID})
    with pytest.raises(HTTPException) as exc:
        verify(f"Bearer {token}")
    assert exc.value.status_code == 401


def test_jwks_fetch_failure_is_503_not_401(keypair, monkeypatch):
    """If we cannot reach the key server we must not tell users their login is bad."""
    private, _ = keypair
    monkeypatch.setattr(auth.settings, "supabase_url", "https://proj.supabase.co")

    class Broken:
        def get_signing_key_from_jwt(self, token):
            raise jwt.exceptions.PyJWKClientConnectionError("dns failure")

    monkeypatch.setattr(auth, "_jwks_client", lambda: Broken())

    with pytest.raises(HTTPException) as exc:
        verify(f"Bearer {mint(private)}")
    assert exc.value.status_code == 503


def test_jwks_url_is_the_projects_wellknown_endpoint(monkeypatch):
    monkeypatch.setattr(auth.settings, "supabase_url", "https://proj.supabase.co")
    auth._jwks_client.cache_clear()
    captured = {}

    def fake_client(uri, **kwargs):
        captured["uri"] = uri
        captured["kwargs"] = kwargs
        return types.SimpleNamespace()

    monkeypatch.setattr(auth.jwt, "PyJWKClient", fake_client)
    auth._jwks_client()
    auth._jwks_client.cache_clear()

    assert captured["uri"] == "https://proj.supabase.co/auth/v1/.well-known/jwks.json"
    assert captured["kwargs"].get("cache_keys") is True
