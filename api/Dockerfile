# api/Dockerfile.optimized
# Multi-stage, minimal, non-root, production hardened

########################
# Builder stage
########################
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential gcc \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python -m venv /venv \
 && /venv/bin/pip install --upgrade pip \
 && /venv/bin/pip install -r requirements.txt

########################
# Runtime stage
########################
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/venv/bin:$PATH"

WORKDIR /app

# Create non-root user
RUN useradd -m -u 10001 appuser

# Copy only virtualenv (no build deps)
COPY --from=builder /venv /venv

# Copy app source
COPY app ./app

# Fix ownership
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

# Healthcheck (lightweight TCP)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('127.0.0.1',8080)); s.close()" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--forwarded-allow-ips", "*"]
