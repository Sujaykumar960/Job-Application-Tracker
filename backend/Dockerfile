# ==============================================================================
# CareerX Backend - Production Dockerfile (FastAPI + Python 3.12)
# ==============================================================================

FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools if required for native wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final runtime image
FROM python:3.12-slim AS runner

# Install runtime utilities (curl for container healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged system user
RUN groupadd -g 1001 careerx && \
    useradd -u 1001 -g careerx -s /bin/bash -m careerx

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /root/.local /home/careerx/.local
ENV PATH=/home/careerx/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

# Copy application source code
COPY --chown=careerx:careerx app /app/app
COPY --chown=careerx:careerx scripts /app/scripts

# Prepare uploads directory with correct write permissions
RUN mkdir -p /app/uploads && chown -R careerx:careerx /app/uploads

USER careerx

EXPOSE 8000

# Docker healthcheck querying deep readiness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
