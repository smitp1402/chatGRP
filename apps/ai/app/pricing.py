"""Pricing loaded from the shared JSON so Python and TypeScript never drift.

Source of truth: packages/shared/pricing.json. In the container the Dockerfile
copies it to app/pricing.json (checked first); in a dev checkout it is read
straight from the monorepo. Missing both is a packaging bug, so it fails at
import rather than pricing everything at zero.
"""
import json
from dataclasses import dataclass
from pathlib import Path

BUNDLED = Path(__file__).with_name("pricing.json")


def _shared_path() -> Path | None:
    """packages/shared/pricing.json in a monorepo checkout; None elsewhere.

    In the container this file is /app/app/pricing.py — only three ancestors —
    so the repo-relative path must not be assumed to exist.
    """
    parents = Path(__file__).resolve().parents
    if len(parents) <= 3:
        return None
    return parents[3] / "packages" / "shared" / "pricing.json"


SHARED = _shared_path()


@dataclass(frozen=True)
class Pricing:
    credits: dict[str, int]
    plan_credits: dict[str, int]
    free_models: frozenset[str]


def load() -> Pricing:
    for path in (BUNDLED, SHARED):
        if path is not None and path.is_file():
            data = json.loads(path.read_text(encoding="utf-8"))
            return Pricing(
                credits=dict(data["credits"]),
                plan_credits=dict(data["planCredits"]),
                free_models=frozenset(data["freeModels"]),
            )
    raise RuntimeError(
        f"pricing.json not found at {BUNDLED} or {SHARED}. "
        "The Dockerfile must copy packages/shared/pricing.json into app/."
    )
