#!/usr/bin/env bash
# One-time PM2 + systemd bootstrap for the bare-metal/VM deployment path.
# Not run automatically by anything in this repo — read it, then run the
# commands yourself as the deploy user (not root) on the target host.
# See docs/ops/pm2-guide.md for the full walkthrough.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing dependencies and building the standalone server"
npm ci
npm run build

echo "==> Copying static assets + env file into the standalone output"
echo "    (Next.js docs only mention public/.next/static, but the standalone"
echo "    server.js also reads .env files from its OWN directory, not the"
echo "    project root — without this DATABASE_URL etc. are invisible to the"
echo "    running app even though the file exists elsewhere. Redo this whole"
echo "    block after every rebuild.)"
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
if [ -f .env.local ]; then
  cp .env.local .next/standalone/.env.local
else
  echo "!!! No .env.local found at the project root — create one before starting PM2."
fi

echo "==> Starting under PM2 (cluster mode, one worker per CPU core)"
pm2 start ecosystem.config.js --env production

echo "==> Persisting the process list so PM2 restores it across reboots"
pm2 save

echo "==> Generating (and printing) the systemd startup command for this OS/user."
echo "    PM2 prints a 'sudo env PATH=... pm2 startup ...' command — copy/paste"
echo "    and run THAT exact line as root, once. It is intentionally not run"
echo "    automatically here since it installs a real systemd unit."
pm2 startup || true

echo "==> Optional: rotate PM2's own logs (a PM2 module, not an npm dependency)"
echo "    pm2 install pm2-logrotate"
echo "    pm2 set pm2-logrotate:max_size 20M"
echo "    pm2 set pm2-logrotate:retain 14"
