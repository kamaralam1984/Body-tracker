#!/usr/bin/env bash
# Restore a backup produced by scripts/backup-db.sh. DESTRUCTIVE — restores
# into $DATABASE_URL's target database. See docs/ops/restore-guide.md.
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@host:5432/dbname ./scripts/restore-db.sh /var/backups/body-tracker/body-tracker-20260101T000000Z.sql.gz
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_FILE="${1:?Usage: restore-db.sh <path-to-backup.sql.gz[.enc]>}"

if [[ "$BACKUP_FILE" == *.enc ]]; then
  : "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY must be set to decrypt an .enc backup}"
  echo "==> Decrypting ${BACKUP_FILE}"
  DECRYPTED="${BACKUP_FILE%.enc}"
  openssl enc -d -aes-256-cbc -pbkdf2 -in "$BACKUP_FILE" -out "$DECRYPTED" -pass "pass:${BACKUP_ENCRYPTION_KEY}"
  BACKUP_FILE="$DECRYPTED"
  CLEANUP_DECRYPTED=1
fi

echo "==> About to restore into: ${DATABASE_URL}"
echo "==> This will overwrite existing data. Press Ctrl+C within 5s to abort."
sleep 5

echo "==> Restoring from ${BACKUP_FILE}"
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"

if [ "${CLEANUP_DECRYPTED:-0}" = "1" ]; then
  rm -f "$BACKUP_FILE"
fi

echo "==> Restore complete."
