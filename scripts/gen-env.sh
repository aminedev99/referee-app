#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE already exists. Refusing to overwrite existing production configuration." >&2
    exit 1
fi

DOMAIN="${1:-admin.draarbitre.com}"
ADMIN_EMAIL="${2:-admin@draarbitre.com}"
POSTGRES_USER="referee_user"
POSTGRES_DB="referee_db"

# Generate cryptographically secure random passwords and secrets
if command -v openssl >/dev/null 2>&1; then
    POSTGRES_PASSWORD=$(openssl rand -hex 24)
    JWT_SECRET=$(openssl rand -hex 32)
    # Generate 20-character alphanumeric password with special chars
    ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9!@#$%&*' | head -c 20)
else
    # Fallback using /dev/urandom
    POSTGRES_PASSWORD=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 48)
    JWT_SECRET=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 64)
    ADMIN_PASSWORD=$(tr -dc 'A-Za-z0-9!@#$%&*' < /dev/urandom | head -c 20)
fi

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}"

cat <<EOF > "$ENV_FILE"
ENV=production
DOMAIN=${DOMAIN}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE_MINUTES=720
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_NAME=Administrator
ADMIN_PASSWORD=${ADMIN_PASSWORD}
RECEIPTS_DIR=/code/receipts
EOF

chmod 600 "$ENV_FILE"

echo ""
echo "================================================================="
echo "   PRODUCTION ENVIRONMENT GENERATED SUCCESSFULLY (.env created)  "
echo "================================================================="
echo "Admin Email   : ${ADMIN_EMAIL}"
echo "Admin Password: ${ADMIN_PASSWORD}"
echo "================================================================="
echo "IMPORTANT: Store these credentials in a secure password manager NOW."
echo "They will not be displayed again. Change your password after first login."
echo "================================================================="
echo ""
