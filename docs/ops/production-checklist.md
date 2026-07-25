# Production Checklist

A pre-launch checklist for taking Body Tracker to a genuine first production deployment. Each item cites the exact file it corresponds to — check the file, don't just take the checkbox's word for it.

> **Read this before you start**: as of this codebase, `src/server/db/store.ts` is an **in-memory** data store — `DATABASE_URL`/`REDIS_URL` are validated by `src/server/env.ts` _if set_, but nothing in the running app actually connects to Postgres or Redis yet (confirmed in `src/server/env.ts` and documented in `docs/ops/environment-variables.md` and `docs/ops/database-guide.md`). If you deploy today, **all data is lost on every process restart/redeploy**, and every "instance" has its own independent copy of the data. Decide explicitly whether this is acceptable for your first launch, or whether wiring the real Prisma/Postgres store is a launch blocker. The Database section below still lists the real provisioning steps, since they're correct and necessary groundwork either way — just don't assume `DATABASE_URL` being set makes the app durable yet.

## Secrets

- [ ] `BTK_JWT_SECRET` is set to a real random value, **not** the dev default (`dev-only-insecure-secret-change-in-production`). Generate one with:
  ```bash
  openssl rand -hex 32
  ```
- [ ] This is not merely advisory: `src/server/env.ts`'s `getEnv()` **throws at startup** — `"Refusing to start in production with the default BTK_JWT_SECRET. Set a real secret."` — if `NODE_ENV=production` and `BTK_JWT_SECRET` still starts with `"dev-only-insecure"`. Confirm by checking that `GET /api/v1/health/ready` returns `ready: true` post-deploy (see Verification below); it will 503 if this is misconfigured.
- [ ] The real secret is stored in a real secret manager / deploy-time environment (systemd `EnvironmentFile`, PM2's `env_production` reading from the real environment per `ecosystem.config.js`'s comments, or a Docker secret / CI secret) — not committed anywhere, not hardcoded into `ecosystem.config.js` (it deliberately isn't today).
- [ ] The secret used for the CI build (`ci-build-only-secret` in `.github/workflows/ci.yml`) and the one used for real production are **different values** — the CI one is a placeholder, not a value that should ever reach a real deployment.

## Database

- [ ] A real Postgres instance is provisioned (Postgres 17 recommended, matching `docker-compose.yml`'s `postgres:17-alpine`).
- [ ] `prisma/schema.prisma` has been applied against it (`npx prisma migrate deploy` or equivalent) — this schema is the real, intended production data model (`Organization`, `Team`, `User`, `RefreshToken`, `ApiKey`, `TrackingSession`, `TrackingEvent`, `AnalyticsSnapshot`, `Report`, `Webhook`, `WebhookDelivery`, `AuditLogEntry`).
- [ ] **Blocker check**: confirm whether `src/server/db/store.ts` has actually been swapped for a Prisma-backed implementation before relying on this database for anything real — as shipped, it has not been, and setting `DATABASE_URL` alone does not change app behavior.
- [ ] `DATABASE_URL` is set to the real connection string (validated as a well-formed URL by `src/server/env.ts`), using real, non-default credentials — not the `body_tracker`/`body_tracker` dev defaults in `docker-compose.yml`.
- [ ] Backup cron/systemd-timer is configured using `scripts/backup-db.sh` (real `pg_dump` + gzip + retention pruning + optional AES-256 encryption via `BACKUP_ENCRYPTION_KEY`) — see `docs/ops/backup-guide.md` for the scheduling walkthrough.
- [ ] A restore has actually been **tested** (`scripts/restore-db.sh` against a scratch database), not just assumed to work — see `docs/ops/backup-guide.md`.
- [ ] `REDIS_URL` provisioned if/when you're relying on Redis-backed rate limiting — note `src/server/http/rate-limit.ts` is still an **in-memory, per-process** sliding-window limiter today, so it does not enforce a consistent limit across multiple PM2 workers or multiple containers/instances until this is wired up.

## TLS

- [ ] A real domain is pointed at the production host (DNS A/AAAA records).
- [ ] Certbot is installed and a real certificate obtained:
  ```bash
  sudo apt-get install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d <real-domain> -d www.<real-domain>
  ```
  (see `docs/ops/server-setup-guide.md` §5 for the full walkthrough).
- [ ] `deploy/nginx/body-tracker.conf`'s placeholder values are updated for the real domain — specifically `server_name example.com www.example.com;` and `ssl_certificate`/`ssl_certificate_key` pointing at `/etc/letsencrypt/live/<real-domain>/...` rather than the `example.com` placeholder paths.
- [ ] `systemctl status certbot.timer` confirms the auto-renewal timer is active.
- [ ] Nginx config validated and reloaded after edits: `sudo nginx -t && sudo systemctl reload nginx`.

## Process management

Choose **one** deployment path — PM2 (bare-metal/VM) or Docker — and complete its checklist:

**PM2 path** (`ecosystem.config.js`, `deploy/nginx/body-tracker.conf`'s single-upstream config assumes this):

- [ ] `scripts/pm2-setup.sh` run for first-time setup (installs deps, builds, copies `.next/static`/`public` into the standalone output — easy to forget and looks fine until you hit an unstyled page — starts PM2, runs `pm2 save`).
- [ ] `pm2 startup`'s printed command was copy-pasted and run once as root (it is **not** run automatically by the setup script — this installs a real systemd unit on the host).
- [ ] `pm2 save` run after `pm2 startup`'s command completed, so a reboot correctly runs `pm2 resurrect` and restores the process list.
- [ ] Confirmed the app survives an actual reboot test (or at minimum `sudo systemctl status pm2-<user>` shows the installed unit is enabled).
- [ ] See `docs/ops/pm2-guide.md` for full detail on all of the above.

**Docker path** (`Dockerfile`, `docker-compose.yml`):

- [ ] Container is run with `restart: unless-stopped` (already set on the `app`/`postgres`/`redis` services in `docker-compose.yml`) or an equivalent orchestrator restart policy.
- [ ] Confirmed the container's `HEALTHCHECK` (`Dockerfile`'s `CMD node -e "fetch('http://localhost:3000/api/v1/health')..."`) is reporting healthy.
- [ ] Docker/the orchestrator itself is configured to start on host boot (`systemctl enable docker`, or your orchestrator's equivalent).

## Monitoring

- [ ] Prometheus + Grafana overlay stood up: `docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d`.
- [ ] Prometheus is actually scraping the real app metrics endpoint — confirm `deploy/monitoring/prometheus.yml`'s target resolves to the real production app, and that `curl http://<app>/api/v1/metrics` returns real Prometheus text-exposition-format output (hand-built in `src/app/api/v1/metrics/route.ts` — no `prom-client` dependency).
- [ ] Grafana's default admin password has been changed — `docker-compose.monitoring.yml` reads `GF_SECURITY_ADMIN_PASSWORD` from `${GRAFANA_ADMIN_PASSWORD:-change-me}`; confirm the real deploy sets `GRAFANA_ADMIN_PASSWORD` to something real, not the `change-me` fallback.
- [ ] Alert rules in `deploy/monitoring/alerts.yml` are loaded (`BodyTrackerAppDown`, `BodyTrackerHighErrorRate`, `BodyTrackerHighMemory`, `BodyTrackerRecentRestart`, plus host/TLS rules that require companion exporters — see below).
- [ ] A real **Alertmanager** instance is deployed and configured with real receivers (Slack/PagerDuty/email) — note this repo does **not** bundle Alertmanager itself (`deploy/monitoring/alerts.yml`'s header comment says so explicitly); the alert rules exist and are correct, but nothing pages anyone until Alertmanager is wired up.
- [ ] If you want the host-level alerts (`HostDiskAlmostFull`, `HostHighCPU`, `HostHighMemory`) and TLS alert (`SslCertExpiringSoon`, `SiteUnreachable`) to actually fire, `node_exporter` and `blackbox_exporter` are deployed and scraped — `deploy/monitoring/alerts.yml` documents these are required companion exporters not included in this repo.

## CI/CD

- [ ] The `production` GitHub Environment (referenced by `.github/workflows/deploy.yml`'s `deploy-production` job) has **required reviewers** configured under repo Settings → Environments — production deploys are manual (`workflow_dispatch`) and must not be one-click without a second set of eyes.
- [ ] Deploy secrets are set on the appropriate environment(s): `PRODUCTION_HOST`, `STAGING_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (used by `appleboy/ssh-action` in `deploy.yml`) — none of these exist in this sandbox; confirm they're set for real before relying on the workflow.
- [ ] Confirmed a staging deploy has actually succeeded end-to-end at least once (`deploy-staging` job runs automatically after CI succeeds on `main`) before trusting the production path.
- [ ] `scripts/rollback.sh` has been read and understood by whoever's on call — it's the documented rollback procedure (`git reset --hard` to a prior ref, rebuild, `pm2 reload`) for a bad PM2-path deploy.

## Security

- [ ] Security headers verified against the **real deployed URL**, not localhost:
  ```bash
  curl -I https://<real-domain>/
  ```
  Confirm `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and (since `NODE_ENV=production`) a `Content-Security-Policy` header are present — these are set twice, once by the app itself (`src/proxy.ts`) and again by Nginx (`deploy/nginx/body-tracker.conf`) as defense-in-depth; confirm both layers are actually in front of production, not just one.
- [ ] `Permissions-Policy` header present and matches the app's real camera/microphone/geolocation usage (`camera=(self), microphone=(), geolocation=(), interest-cohort=()` — this app uses the camera for pose tracking, so `camera=(self)` is intentional, not an oversight).
- [ ] Rate limits are sane for expected real traffic — review both layers: Nginx's `limit_req_zone`/`limit_conn_zone` in `deploy/nginx/body-tracker.conf` (currently `rate=20r/s` per IP, burst 40 on `/api/`, burst 10 on the tracking SSE stream) and the app's own per-caller limiter in `src/server/http/rate-limit.ts` (600 req/min per bearer-token user; per-API-key limit is each key's own `rateLimitPerMinute`, default 120). Tune before launch if expected traffic doesn't match these defaults.
- [ ] Remember the in-memory rate limiter is per-process — if running multiple PM2 workers or containers, each enforces its own separate limit rather than a shared one (see Database section above).

## Verification

- [ ] `GET https://<real-domain>/api/v1/health` returns `{"status":"ok",...}` (pure liveness check, `src/app/api/v1/health/route.ts`).
- [ ] `GET https://<real-domain>/api/v1/health/ready` returns HTTP 200 with `{"ready":true,"checks":{"env":{"ok":true},"dataStore":{"ok":true}}}` — a 503 here means either the `BTK_JWT_SECRET` fail-fast check failed or the data store didn't initialize; do not consider launch complete until this is a clean 200.
- [ ] Run the real load tester once against the actual production host and review the numbers:
  ```bash
  node scripts/load-test.mjs --base=https://<real-domain>/api/v1
  ```
- [ ] Numbers from that run are reviewed with the honest caveat the script itself prints in mind — see `docs/ops/troubleshooting-guide.md`'s scaling notes: figures from a single run on a possibly shared/contended host are **not** a valid capacity baseline on their own; re-run and compare before treating any number as a real ceiling.
- [ ] Manually log in through the real production URL with a real (non-seed-demo) account and complete one full flow end to end (create a session, run tracking, view analytics) to confirm the deployed build behaves correctly beyond automated checks.
- [ ] Confirm the API Explorer (`https://<real-domain>/docs/api-explorer`) loads and works against the real production API, not a stale cached build.
