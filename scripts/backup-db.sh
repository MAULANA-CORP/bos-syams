#!/bin/sh
# BOS Syams — Database Backup Script
# Usage: ./scripts/backup-db.sh [backup_dir]
#
# Cron example (daily at 2 AM):
#   0 2 * * * /app/scripts/backup-db.sh /backups >> /var/log/backup.log 2>&1

set -eu

BACKUP_DIR="${1:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_HOST="${DB_HOST:-client_bos-syam-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-client}"
DB_USER="${DB_USER:-postgres}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting backup of $DB_NAME..."

# Create compressed backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/bos_syams_${TIMESTAMP}.dump"

# Verify backup was created
if [ -f "$BACKUP_DIR/bos_syams_${TIMESTAMP}.dump" ]; then
  SIZE=$(du -h "$BACKUP_DIR/bos_syams_${TIMESTAMP}.dump" | cut -f1)
  echo "[$TIMESTAMP] ✅ Backup created: bos_syams_${TIMESTAMP}.dump ($SIZE)"
else
  echo "[$TIMESTAMP] ❌ Backup failed!"
  exit 1
fi

# Clean up old backups
echo "[$TIMESTAMP] Cleaning backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "bos_syams_*.dump" -mtime +"$KEEP_DAYS" -delete
REMAINING=$(find "$BACKUP_DIR" -name "bos_syams_*.dump" | wc -l)
echo "[$TIMESTAMP] Backups on disk: $REMAINING"

echo "[$TIMESTAMP] Done."
