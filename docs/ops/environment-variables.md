# Environment Variables Reference

Every environment variable Body Tracker reads, verified against the actual source (not assumed). Two tiers:

1. **Validated by `getEnv()`** (`src/server/env.ts`) — the app calls `getEnv()` at request time (e.g. from `/api/v1/health/ready`) and fails fast with a thrown error if these don't parse.
2. **Read directly elsewhere** — process/deploy config, scripts, and CI that reference `process.env.*` or `${VAR}` outside of `getEnv()`'s schema.

## Tier 1 — Validated by `getEnv()`

Schema source: `src/server/env.ts:11-17`.

| Variable         | Required                     | Default                                         | Example                                                             | Purpose                                                                                                                                                                                                                                                                                                                                                                 | Read at                                                |
| ---------------- | ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `NODE_ENV`       | No                           | `development`                                   | `production`                                                        | Standard Node environment mode. `"development" \| "test" \| "production"`. Gates the `BTK_JWT_SECRET` fail-fast check below, and switches on production-only behavior (e.g. the CSP header in `src/proxy.ts:27`).                                                                                                                                                       | `src/server/env.ts:12`                                 |
| `PORT`           | No                           | `3000`                                          | `3045`                                                              | Port the server listens on. Coerced to a positive integer. The project's dev/deploy convention is **3045** (see `ecosystem.config.js`, `deploy/nginx/body-tracker.conf`'s upstream, and `npm run dev -- -p 3045`), even though the schema default and `Dockerfile`'s `ENV PORT=3000` are 3000.                                                                          | `src/server/env.ts:13`                                 |
| `BTK_JWT_SECRET` | No (but see fail-fast below) | `dev-only-insecure-secret-change-in-production` | `$(openssl rand -hex 32)` output, e.g. `9f2b1e...` (64 hex chars)   | Secret used to sign/verify the app's hand-built JWT-style auth tokens (no `jsonwebtoken` dependency — see `src/server/auth/tokens.ts:12`, which reads it directly via `process.env.BTK_JWT_SECRET ?? "dev-only-insecure-secret-change-in-production"`).                                                                                                                 | `src/server/env.ts:14`, `src/server/auth/tokens.ts:12` |
| `DATABASE_URL`   | No                           | — (unset)                                       | `postgresql://body_tracker:body_tracker@postgres:5432/body_tracker` | Postgres connection string for the intended Prisma-backed store (`prisma/schema.prisma`). Validated as a well-formed URL **if present**, but **not yet read by the running app** — `src/server/db/store.ts` is still in-memory. Real today only for `scripts/backup-db.sh` / `scripts/restore-db.sh` (pg_dump/psql) and `docker-compose.yml`'s Postgres service wiring. | `src/server/env.ts:15`                                 |
| `REDIS_URL`      | No                           | — (unset)                                       | `redis://redis:6379`                                                | Redis connection string for the intended production cache/rate-limiter backend. Validated as a URL **if present**, but **not yet read by the running app** — nothing in the current codebase connects to Redis yet; rate limiting today is in-process. Wired in `docker-compose.yml` for when this lands.                                                               | `src/server/env.ts:16`                                 |

### Fail-fast behavior (real, tested)

`getEnv()` (`src/server/env.ts:25-41`) throws in two cases:

1. **Schema validation fails** (e.g. `DATABASE_URL` set to a non-URL string) — logs field errors via `console.error` and throws `"Invalid environment configuration — see logged field errors above."`
2. **Production with the default secret** — if `NODE_ENV === "production"` **and** `BTK_JWT_SECRET` still starts with `"dev-only-insecure"`, it throws `"Refusing to start in production with the default BTK_JWT_SECRET. Set a real secret."` (`src/server/env.ts:34-37`).

This means `GET /api/v1/health/ready` correctly reports `ready: false` (HTTP 503) if you deploy to production without setting a real `BTK_JWT_SECRET` — it isn't a lint rule, it's enforced at runtime every time `getEnv()` is called.

`getEnv()`'s result is cached on `globalThis.__btkEnv` after the first successful call (`src/server/env.ts:26,39`), so validation effectively runs once per process lifetime.

## Tier 2 — Read directly (not validated by `getEnv()`)

| Variable                  | Required                                                                       | Default                                                                                  | Example                     | Purpose                                                                                                                                                                                                                                                                                                               | Read at                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `HOSTNAME`                | No                                                                             | Next.js standalone default (`0.0.0.0`)                                                   | `127.0.0.1`                 | Bind address for the standalone `server.js` (Next.js standalone-output convention, not app-specific code). PM2 config binds to `127.0.0.1` since Nginx is the public-facing edge (`ecosystem.config.js:22,28`); `Dockerfile` binds to `0.0.0.0` since the container itself is the network boundary (`Dockerfile:24`). | `ecosystem.config.js:22,28`, `Dockerfile:24`                                                 |
| `NEXT_TELEMETRY_DISABLED` | No                                                                             | unset (telemetry on)                                                                     | `1`                         | Disables Next.js's anonymous telemetry collection during Docker builds/runtime.                                                                                                                                                                                                                                       | `Dockerfile:14,22`                                                                           |
| `BTK_API_BASE_URL`        | No                                                                             | `http://localhost:3045` (api-tests.mjs) / `http://localhost:3045/api/v1` (load-test.mjs) | `http://localhost:3045`     | Base URL the two hand-rolled test/load scripts hit instead of the default local dev URL — used in CI to explicitly target the just-built server.                                                                                                                                                                      | `scripts/api-tests.mjs:14`, `scripts/load-test.mjs:20`, set in `.github/workflows/ci.yml:41` |
| `GRAFANA_ADMIN_PASSWORD`  | No                                                                             | `change-me`                                                                              | `a-real-strong-password`    | Grafana admin password for the optional monitoring overlay (`docker-compose.monitoring.yml`). Change this before exposing Grafana beyond localhost.                                                                                                                                                                   | `docker-compose.monitoring.yml:23`                                                           |
| `BACKUP_DIR`              | No                                                                             | `/var/backups/body-tracker`                                                              | `/var/backups/body-tracker` | Directory `scripts/backup-db.sh` writes gzip'd `pg_dump` output to (and prunes old backups from).                                                                                                                                                                                                                     | `scripts/backup-db.sh:14`                                                                    |
| `RETENTION_DAYS`          | No                                                                             | `14`                                                                                     | `30`                        | How many days of backups `scripts/backup-db.sh` keeps before pruning (`find ... -mtime +N -delete`).                                                                                                                                                                                                                  | `scripts/backup-db.sh:15,34-35`                                                              |
| `BACKUP_ENCRYPTION_KEY`   | No (required only if you want encrypted backups / are restoring a `.enc` file) | unset (backups left unencrypted)                                                         | a long random passphrase    | If set, `scripts/backup-db.sh` encrypts the dump with `openssl enc -aes-256-cbc -pbkdf2`. `scripts/restore-db.sh` **requires** this to be set when restoring a `.enc` backup (hard failure via `: "${BACKUP_ENCRYPTION_KEY:?...}"` otherwise).                                                                        | `scripts/backup-db.sh:27-31`, `scripts/restore-db.sh:13-16`                                  |

`DATABASE_URL` is also required (hard failure, not defaulted) by `scripts/backup-db.sh:13` and `scripts/restore-db.sh:9` directly — both scripts use bash's `: "${VAR:?message}"` idiom to abort immediately if it's unset, independent of `getEnv()`'s (optional) validation.

## Not app env vars — GitHub Actions secrets

These are referenced as `${{ secrets.* }}` in `.github/workflows/deploy.yml` (deploy-time SSH credentials, configured in repo Settings → Secrets, not part of the running app's environment): `STAGING_HOST`, `PRODUCTION_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`. `release.yml` also uses the built-in `GITHUB_TOKEN` secret. None of these exist in this sandbox; they're the real, correct shape for when a repo owner configures them.

## Not a real app env var — SDK example code

`NEXT_PUBLIC_BODYTRACKER_KEY` appears in `src/features/docs/lib/tutorials-content.ts:348` and `src/features/docs/lib/examples-content.ts:169` — but only inside string literals that render as **example code shown to third-party API consumers** in the `/docs` portal (illustrating how _their_ app would read an API key from _their own_ env). It is not read anywhere by Body Tracker itself.

## `.env.example`

There is no `.env.example` committed to the repo yet. A copyable reference is included below and has been written to `.env.example` at the repo root as part of this task:

```bash
# --- Core app config (validated by src/server/env.ts) ---
NODE_ENV=development
PORT=3045
BTK_JWT_SECRET=dev-only-insecure-secret-change-in-production

# --- Not yet wired to a live store (src/server/db/store.ts is in-memory) ---
# DATABASE_URL=postgresql://body_tracker:body_tracker@localhost:5432/body_tracker
# REDIS_URL=redis://localhost:6379

# --- Test/load scripts ---
# BTK_API_BASE_URL=http://localhost:3045

# --- Backups (scripts/backup-db.sh, scripts/restore-db.sh) ---
# BACKUP_DIR=/var/backups/body-tracker
# RETENTION_DAYS=14
# BACKUP_ENCRYPTION_KEY=

# --- Monitoring overlay (docker-compose.monitoring.yml) ---
# GRAFANA_ADMIN_PASSWORD=change-me
```

**Production checklist**: set `NODE_ENV=production` and a real, random `BTK_JWT_SECRET` (e.g. `openssl rand -hex 32`) — never deploy with the default. Everything else stays commented/unset until the corresponding feature (Postgres/Redis-backed store, backups, monitoring) is actually provisioned.
