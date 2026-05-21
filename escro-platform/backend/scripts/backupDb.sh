#!/bin/bash
# ESCRO Platform — Daily DB backup script
#
# Usage:
#   ./backupDb.sh                  # uses .env (DB_HOST/PORT/USER/PASSWORD/NAME)
#   BACKUP_DIR=/srv/backups ./backupDb.sh
#
# Cron example (daily at 03:00 UTC, keep 30 days):
#   0 3 * * * /opt/escro/backend/scripts/backupDb.sh >> /var/log/escro-backup.log 2>&1
#
# Restore example:
#   gunzip -c /srv/backups/escro_2026-05-14_03-00.sql.gz | psql -h localhost -U postgres -d escro_platform

set -euo pipefail

# Load .env from the backend root (one level up)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-escro_platform}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y-%m-%d_%H-%M)"
OUTFILE="$BACKUP_DIR/escro_${TIMESTAMP}.sql.gz"

echo "[backup] $(date -u +%FT%TZ) starting → $OUTFILE"

PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  --format=plain \
  --no-owner \
  --no-acl \
  "$DB_NAME" | gzip -9 > "$OUTFILE"

SIZE="$(du -h "$OUTFILE" | cut -f1)"
echo "[backup] $(date -u +%FT%TZ) done — $SIZE"

# Retention: delete backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "escro_*.sql.gz" -type f -mtime "+$RETENTION_DAYS" -delete -print | sed 's/^/[backup] retention: deleted /'

echo "[backup] $(date -u +%FT%TZ) finished"
