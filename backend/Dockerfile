# Stage 1: Build dependencies
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Final runtime image
FROM python:3.11-slim

WORKDIR /code

# Runtime dependencies only (no compiler/build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 -s /bin/bash appuser

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Prepare receipts directory owned by appuser
RUN mkdir -p /code/receipts && chown -R appuser:appuser /code

COPY --chown=appuser:appuser . /code

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
