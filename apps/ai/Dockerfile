# FastAPI AI backend for ChatGRP — deployed to Google Cloud Run.
#
# Built from the REPO ROOT so it can pull in packages/shared/pricing.json:
#   docker build -f apps/ai/Dockerfile -t chatgrp-ai .
# The root .dockerignore whitelists only the paths below.
FROM python:3.13-slim

# Faster, cleaner Python in containers.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Unprivileged runtime user. Created up front so the COPYs below can hand
# ownership over directly instead of a separate chown layer that would
# duplicate the app tree.
RUN useradd --create-home --uid 1000 --shell /usr/sbin/nologin app

# Install deps first so Docker layer-caches them across code changes.
# Installed as root into /usr/local, which is world-readable.
COPY apps/ai/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# App source (the `app` package: main.py, auth.py, router.py, ...).
COPY --chown=app:app apps/ai/app ./app

# Pricing has one source in the monorepo; app/pricing.py looks here first.
COPY --chown=app:app packages/shared/pricing.json ./app/pricing.json

# Drop root. Nothing here needs it, and a compromised process should not
# own the container.
USER app

# Cloud Run injects $PORT (default 8080) and expects the server to bind 0.0.0.0.
ENV PORT=8080
EXPOSE 8080

# Shell form so $PORT expands at runtime.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
