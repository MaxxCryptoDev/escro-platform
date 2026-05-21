#!/usr/bin/env bash
# Daily Postgres backup. Add to crontab:
#   0 3 * * * /home/claudiu/escro-platform/scripts/backup.sh >> /home/claudiu/backups/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
COMPOSE_DIR="${COMPOSE_DIR:-$HOME/escro-platform}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
cd "$COMPOSE_DIR"

# Load DB_USER / DB_NAME from root .env
set -a
. "$COMPOSE_DIR/.env"
set +a

STAMP=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/db_${STAMP}.sql.gz"

docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUT"

echo "[$(date -Iseconds)] backup written: $OUT ($(du -h "$OUT" | cut -f1))"

# Prune older than RETAIN_DAYS
find "$BACKUP_DIR" -name 'db_*.sql.gz' -mtime "+$RETAIN_DAYS" -delete
