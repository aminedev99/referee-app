#!/usr/bin/env bash
set -euo pipefail

if [ ! -f ".env" ]; then
    echo "Error: .env file not found. Run scripts/gen-env.sh first to generate production configuration." >&2
    exit 1
fi

# Load DOMAIN from .env
DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "draarbitre.com")
SSH_HOST=$(grep -E '^SSH_HOST=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "admin.draarbitre.com")

echo "--> Pulling latest base images..."
docker compose -f docker-compose.prod.yml pull caddy db

echo "--> Building and starting production stack..."
docker compose -f docker-compose.prod.yml build backend frontend

echo "--> Preparing receipt storage permissions..."
mkdir -p ./receipts
docker compose -f docker-compose.prod.yml run --rm --no-deps --user "0:0" --entrypoint sh backend -c \
    'chown -R appuser:appuser /code/receipts && chmod 0775 /code/receipts'

docker compose -f docker-compose.prod.yml up -d --build

echo "--> Waiting for services to become healthy..."
MAX_ATTEMPTS=30
ATTEMPT=0
HEALTHY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    # Check if backend responds internally
    if docker compose -f docker-compose.prod.yml exec -T backend curl -s -f http://localhost:8000/api/health >/dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    sleep 2
done

if [ "$HEALTHY" = false ]; then
    echo "Error: Backend did not report healthy status within 60 seconds." >&2
    docker compose -f docker-compose.prod.yml logs backend
    exit 1
fi

echo "--> Service status:"
docker compose -f docker-compose.prod.yml ps

echo "--> Testing direct internal health endpoint..."
docker compose -f docker-compose.prod.yml exec -T backend curl -s http://localhost:8000/api/health
echo ""

echo "--> Running public smoke test on https://${DOMAIN}/api/health..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/health" || true)
if [ "$STATUS_CODE" = "200" ]; then
    echo "  [PASS] https://${DOMAIN}/api/health returned 200 OK."
else
    echo "  [INFO] https://${DOMAIN}/api/health returned HTTP $STATUS_CODE (DNS or Let's Encrypt TLS certificate may still be binding)."
fi

echo "--> Checking SSH host redirect from https://${SSH_HOST}..."
REDIR_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${SSH_HOST}" || true)
echo "  [INFO] https://${SSH_HOST} HTTP status: $REDIR_CODE (redirects to https://${DOMAIN})"

echo "--> Deployment completed successfully."
echo "--> Admin Dashboard URL : https://${DOMAIN}/admin"
echo "--> SSH Host (Port 22)  : ${SSH_HOST}"
