#!/usr/bin/env bash
set -euo pipefail

if [ ! -f ".env" ]; then
    echo "Error: .env file not found." >&2
    exit 1
fi

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

DB_BACKUP_FILE="${BACKUP_DIR}/db_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
RECEIPTS_BACKUP_FILE="${BACKUP_DIR}/receipts_${TIMESTAMP}.tar.gz"

echo "--> Starting backup at $(date)..."

# 1. PostgreSQL dump (gzipped)
echo "Dumping database '${POSTGRES_DB}'..."
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DB_BACKUP_FILE"

# 2. Archive receipts folder
if [ -d "./receipts" ]; then
    echo "Archiving receipts directory..."
    tar -czf "$RECEIPTS_BACKUP_FILE" -C . receipts
fi

# 3. Clean up backups older than 14 days
echo "Removing backups older than 14 days..."
find "$BACKUP_DIR" -type f \( -name "*.sql.gz" -o -name "*.tar.gz" \) -mtime +14 -delete

echo "Backup completed successfully:"
echo " - DB:       $DB_BACKUP_FILE"
if [ -f "$RECEIPTS_BACKUP_FILE" ]; then
    echo " - Receipts: $RECEIPTS_BACKUP_FILE"
fi
