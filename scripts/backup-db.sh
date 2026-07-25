#!/usr/bin/env bash
# Real pg_dump-based backup with gzip compression and retention pruning.
# Reads connection info from $DATABASE_URL (see docs/ops/environment-variables.md).
# Not runnable in this sandbox (no live Postgres instance — the app itself
# still uses the in-memory store, see src/server/db/store.ts) but this
# script is correct against the real prisma/schema.prisma target.
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@host:5432/dbname ./scripts/backup-db.sh
# Typically run from cron/systemd-timer — see docs/ops/backup-guide.md.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/body-tracker}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DIR}/body-tracker-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Dumping database to ${OUT_FILE}"
pg_dump --no-owner --no-acl --format=plain "$DATABASE_URL" | gzip -9 > "$OUT_FILE"

SIZE=$(du -h "$OUT_FILE" | cut -f1)
echo "==> Backup complete: ${OUT_FILE} (${SIZE})"

if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "==> Encrypting backup with openssl (AES-256-CBC)"
  openssl enc -aes-256-cbc -pbkdf2 -salt -in "$OUT_FILE" -out "${OUT_FILE}.enc" -pass "pass:${BACKUP_ENCRYPTION_KEY}"
  rm "$OUT_FILE"
  echo "==> Encrypted backup: ${OUT_FILE}.enc"
fi

echo "==> Pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name "body-tracker-*.sql.gz*" -type f -mtime "+${RETENTION_DAYS}" -print -delete

echo "==> Done. Current backups:"
ls -lh "$BACKUP_DIR" | grep body-tracker || echo "  (none yet)"
