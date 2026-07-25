#!/usr/bin/env bash
# Roll back to the previous release on a PM2-managed host. Run ON the
# target server (not in CI) after a bad deploy. See
# docs/ops/disaster-recovery-guide.md for the full incident-response flow.
#
# Usage: ./scripts/rollback.sh [git-ref]
#   git-ref defaults to the commit before the current HEAD (i.e. "undo the
#   last deploy"); pass an explicit tag/SHA to roll back further.
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET_REF="${1:-HEAD~1}"
CURRENT_SHA="$(git rev-parse HEAD)"

echo "==> Current deployed commit: ${CURRENT_SHA}"
echo "==> Rolling back to: ${TARGET_REF}"

git fetch origin
git reset --hard "$TARGET_REF"

echo "==> Rebuilding at rolled-back commit"
npm ci
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "==> Reloading PM2 (zero-downtime, cluster mode)"
pm2 reload ecosystem.config.js --env production

echo "==> Verifying health"
sleep 3
curl -f "http://127.0.0.1:${PORT:-3045}/api/v1/health/ready"

echo "==> Rollback complete. Previously deployed commit was ${CURRENT_SHA}."
echo "    To roll forward again once the issue is fixed:"
echo "      git reset --hard ${CURRENT_SHA} && npm run build && pm2 reload ecosystem.config.js"
