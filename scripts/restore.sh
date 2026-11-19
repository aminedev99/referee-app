#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_db_dump.sql.gz> [path_to_receipts.tar.gz]" >&2
    exit 1
fi

DB_BACKUP="$1"
RECEIPTS_BACKUP="${2:-}"

if [ ! -f "$DB_BACKUP" ]; then
    echo "Error: Database backup file '$DB_BACKUP' does not exist." >&2
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "Error: .env file not found." >&2
    exit 1
fi

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

echo "================================================================="
echo "                   DATABASE RESTORE WARNING                      "
echo "================================================================="
echo "Target DB: ${POSTGRES_DB}"
echo "Source:    ${DB_BACKUP}"
echo ""
echo "THIS ACTION WILL OVERWRITE CURRENT DATA IN THE DATABASE!"
echo "================================================================="
read -r -p "Type 'RESTORE' to confirm: " CONFIRMATION

if [ "$CONFIRMATION" != "RESTORE" ]; then
    echo "Restore cancelled by user."
    exit 0
fi

echo "--> Restoring database..."
gunzip -c "$DB_BACKUP" | docker compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

if [ -n "$RECEIPTS_BACKUP" ] && [ -f "$RECEIPTS_BACKUP" ]; then
    echo "--> Restoring receipts archive..."
    tar -xzf "$RECEIPTS_BACKUP" -C .
fi

echo "--> Restore completed successfully."
