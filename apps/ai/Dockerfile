# FastAPI AI backend for ChatGRP — deployed to Google Cloud Run.
FROM python:3.13-slim

# Faster, cleaner Python in containers.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install deps first so Docker layer-caches them across code changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# App source (the `app` package: main.py, auth.py, router.py, ...).
COPY app ./app

# Cloud Run injects $PORT (default 8080) and expects the server to bind 0.0.0.0.
ENV PORT=8080
EXPOSE 8080

# Shell form so $PORT expands at runtime.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
