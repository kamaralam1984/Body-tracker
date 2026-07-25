# Server Setup Guide (Bare-Metal / VM: Ubuntu 24 LTS + PM2 + Nginx)

Provisioning a fresh Ubuntu 24 LTS VM for the PM2+Nginx deployment path — one of two supported production topologies for Body Tracker. If you'd rather containerize instead of running bare-metal, skip to **`docs/ops/docker-guide.md`**, which covers the `Dockerfile` / `docker-compose.yml` path (Postgres + Redis + app in containers, plus the optional `docker-compose.monitoring.yml` Prometheus/Grafana overlay).

This guide covers: system prep, Node 22, Nginx, PM2, Certbot, firewall, and the first deployment via `scripts/pm2-setup.sh`.

## 1. Create a non-root deploy user

Never deploy or run the app as root.

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy   # only if this user needs sudo for provisioning steps
su - deploy
```

Do all of the remaining steps as `deploy` unless a step explicitly says `sudo`/root.

## 2. Install Node.js 22

Via NodeSource (matches the Node version used in CI and `Dockerfile`'s `node:22-alpine` base image):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # expect v22.x
npm -v
```

Alternative: `nvm install 22 && nvm alias default 22` if you prefer per-user Node version management over a system-wide install.

## 3. Install Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl enable --now nginx
```

The real reverse-proxy config for this app lives at `deploy/nginx/body-tracker.conf` in the repo (see step 8) — it terminates TLS, proxies to a single upstream on `127.0.0.1:3045` (PM2 cluster mode load-balances internally across workers on one shared port, so one upstream entry is correct), sets security headers as defense-in-depth alongside `src/proxy.ts`, and serves custom error pages from `deploy/nginx/error-pages/`.

## 4. Install PM2 globally

```bash
sudo npm install -g pm2
pm2 -v
```

PM2 runs the app in cluster mode (one worker per CPU core, see `ecosystem.config.js`) and manages restarts, log rotation, and reload-without-downtime.

## 5. Install Certbot (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Once Nginx is serving the app's domain over plain HTTP (step 8), issue a certificate:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Certbot will edit the Nginx config to add the certificate paths and set up auto-renewal (`systemctl status certbot.timer` to confirm the renewal timer is active). `deploy/nginx/body-tracker.conf` already includes the `/.well-known/acme-challenge/` location block Certbot's HTTP-01 challenge needs, plus the HTTP→HTTPS redirect.

## 6. Firewall basics (ufw)

Only allow SSH, HTTP, and HTTPS — nothing else should be reachable from outside:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

The app itself should only ever be reached via Nginx on `127.0.0.1:3045` — do not open port 3045 (or 3000) externally.

## 7. Clone the repo

```bash
sudo mkdir -p /srv/body-tracker
sudo chown deploy:deploy /srv/body-tracker
git clone <your-repo-url> /srv/body-tracker
cd /srv/body-tracker
```

`/srv/body-tracker` is the path the real deploy automation assumes — `.github/workflows/deploy.yml`'s SSH deploy steps `cd /srv/body-tracker` before pulling and rebuilding, so keep this path consistent if you plan to wire up that CI job's `STAGING_HOST`/`PRODUCTION_HOST`/`DEPLOY_SSH_KEY`/`DEPLOY_USER` secrets later.

## 8. Set environment variables

Before the first build, set real values for the required secrets (do not use the defaults in production — see `docs/ops/environment-variables.md` for the full reference). At minimum:

```bash
export BTK_JWT_SECRET="$(openssl rand -hex 32)"
export NODE_ENV=production
export PORT=3045
```

`getEnv()` (`src/server/env.ts`) fail-fasts at startup: if `NODE_ENV=production` and `BTK_JWT_SECRET` is still the built-in dev default (`dev-only-insecure-secret-change-in-production`), the app throws immediately rather than serving traffic insecurely. Persist these in whatever your process supervisor reads (a systemd `EnvironmentFile`, or a `.env` file PM2 loads) — `ecosystem.config.js` deliberately does **not** hardcode secrets; its `env_production` block only sets `NODE_ENV`, `PORT`, and `HOSTNAME`, and expects `BTK_JWT_SECRET` (and `DATABASE_URL`/`REDIS_URL` if/when the store is Prisma-backed) to come from the real environment.

Copy the Nginx config into place (adjust `server_name` and the `ssl_certificate` paths to your real domain first):

```bash
sudo cp deploy/nginx/body-tracker.conf /etc/nginx/sites-available/body-tracker.conf
sudo ln -s /etc/nginx/sites-available/body-tracker.conf /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/body-tracker/error-pages
sudo cp deploy/nginx/error-pages/*.html /var/www/body-tracker/error-pages/
sudo nginx -t && sudo systemctl reload nginx
```

## 9. First-time deploy: `scripts/pm2-setup.sh`

This is the real, repo-committed one-time bootstrap script. It is **not** run automatically by anything — read it, then run it yourself as the `deploy` user (not root):

```bash
cd /srv/body-tracker
./scripts/pm2-setup.sh
```

What it does, in order:

1. `npm ci && npm run build` — clean, reproducible install and a `next build` producing the standalone output (`next.config.ts` sets `output: "standalone"`).
2. Copies `.next/static` and `public/` into `.next/standalone/` — Next.js's standalone build does **not** include static assets automatically, so this manual copy step is required or the app will 404 on its own JS/CSS/images.
3. `pm2 start ecosystem.config.js --env production` — starts the app in PM2 cluster mode (one worker per CPU core, sharing one listening port on `PORT` from `ecosystem.config.js`'s `env_production` block, i.e. 3045).
4. `pm2 save` — persists the current process list so PM2 can restore it on reboot.
5. Prints the real `pm2 startup` command for your OS/init system (systemd on Ubuntu 24). The script does **not** run it for you — copy the exact `sudo env PATH=... pm2 startup ...` line it prints and run that once, as root, to install the systemd unit that resurrects PM2 on boot.

Optionally, also install PM2's own log rotation module (a PM2 module, not an npm package, so it's outside the zero-new-deps rule):

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
```

## 10. Verify

```bash
curl -f http://127.0.0.1:3045/api/v1/health/ready
curl -f https://example.com/api/v1/health/ready   # through Nginx/TLS, once DNS + Certbot are set up
pm2 status
pm2 logs body-tracker --lines 50
```

## Redeploying later

Subsequent deploys don't need the full setup script — pull, rebuild, and reload PM2 for a zero-downtime rollout (this is exactly what `.github/workflows/deploy.yml`'s SSH step and `scripts/rollback.sh` do):

```bash
cd /srv/body-tracker
git fetch origin main && git reset --hard origin/main
npm ci
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/.env.local
pm2 reload ecosystem.config.js --env production
```

`pm2 reload` (not `restart`) cycles workers one at a time in cluster mode, so in-flight requests finish (`kill_timeout: 5000` in `ecosystem.config.js`) and there's no dropped-traffic window.

If a deploy goes bad, `scripts/rollback.sh [git-ref]` (defaults to `HEAD~1`) automates the same rebuild-and-reload sequence against a prior commit.

## Data store note

This VM setup runs the app against its built-in **in-memory data store** (`src/server/db/store.ts`) unless you separately provision and wire up real Postgres/Redis — the app does not install or manage a database for you. See `docs/ops/environment-variables.md` for `DATABASE_URL`/`REDIS_URL`, and `scripts/backup-db.sh`/`scripts/restore-db.sh` for the (already-written, Postgres-target) backup tooling for when persistence is live.

## See also

- `docs/ops/docker-guide.md` — the containerized alternative to this bare-metal path.
- `docs/ops/environment-variables.md` — full env var reference.
- `docs/ops/monitoring-guide.md` — Prometheus/Grafana overlay (`docker-compose.monitoring.yml`) that scrapes `/api/v1/metrics` regardless of which deployment path (PM2 or Docker) serves the app.
