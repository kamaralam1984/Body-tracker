# Installation Guide (Local Development)

Setting up Body Tracker from a clean clone for local development.

## Prerequisites

- **Node.js 22** — the version used across this project (CI's `actions/setup-node@v4` pins `node-version: "22"`, and `Dockerfile`'s runtime image is `node:22-alpine`). Install via [nodesource](https://github.com/nodesource/distributions) or `nvm install 22`.
- **npm** — ships with Node. No other package manager (`yarn`, `pnpm`) is used; `package-lock.json` is the committed lockfile.
- No database, Redis, or other external service is required for local development — the app runs entirely against an in-memory data store (see [Data store caveat](#data-store-caveat) below).

## 1. Install dependencies

```bash
npm install
```

Use `npm install`, not `npm ci`, for local dev — `npm install` updates `package-lock.json` as needed and is more forgiving of a slightly stale lockfile. `npm ci` is for CI and production builds only (it requires an exact, already-consistent lockfile and refuses to modify it — see `.github/workflows/ci.yml` and `Dockerfile`, both of which use `npm ci`).

### Zero-new-dependencies philosophy

This project has a hard rule: **no new npm dependencies**. Every backend/infra primitive that a typical Node app would pull a library for — JWT-style auth tokens, password hashing, rate limiting, Prometheus metrics, security headers — is hand-built on Node's built-in `crypto`/`http` modules instead. See `src/server/auth/tokens.ts`, `src/proxy.ts`, and `src/app/api/v1/metrics/route.ts` for examples. If you find yourself reaching for `npm install <something>` to solve an infra problem, that's a signal to check whether it belongs in this project at all — raise it rather than adding it casually.

## 2. Run the dev server

The project's dev convention is port **3045** (not Next's default 3000):

```bash
npm run dev -- -p 3045
```

This starts the Next.js 16 Turbopack dev server. Wait for the "Ready" log line.

## 3. Verify the server is up

```bash
curl http://localhost:3045/api/v1/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "2026-07-25T12:00:00.000Z" }
```

This is a pure liveness check (`src/app/api/v1/health/route.ts`) — no dependency checks. For a deeper check that also validates environment config and the data store, use:

```bash
curl http://localhost:3045/api/v1/health/ready
```

which returns `{"ready":true,"checks":{"env":{"ok":true},"dataStore":{"ok":true}}}` (503 if something's wrong — see `src/app/api/v1/health/ready/route.ts`).

## 4. Confirm a clean setup

Run these three checks before you start making changes, so you know the baseline is green:

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Integration tests (43 real end-to-end tests against a live server)
# Requires the dev server from step 2 to be running on port 3045.
node scripts/api-tests.mjs
```

`scripts/api-tests.mjs` is a plain `node:assert` + `fetch` script — no test framework dependency — that exercises the real running server end-to-end (auth, users, api-keys, organizations, sessions, tracking, analytics, reports, webhooks). All 43 tests should pass against a freshly seeded dev server.

## 5. Log in with seeded demo accounts

The in-memory store (`src/server/db/store.ts`) seeds one organization, **"Apex Performance Labs"** (`org_apex`), with three demo accounts:

| Email                         | Password         | Role   |
| ----------------------------- | ---------------- | ------ |
| `owner@apex-performance.dev`  | `OwnerPass123!`  | owner  |
| `admin@apex-performance.dev`  | `AdminPass123!`  | admin  |
| `member@apex-performance.dev` | `MemberPass123!` | member |

Use any of these against `POST /api/v1/auth/login` (or the app's login UI) to explore role-gated behavior.

## 6. Explore the API

- **API Explorer** — interactive browser UI for trying every endpoint live: [`http://localhost:3045/docs/api-explorer`](http://localhost:3045/docs/api-explorer)
- **OpenAPI 3.1 spec** (machine-readable, backs the Explorer): `http://localhost:3045/api/v1/openapi.json`
- **SDK / documentation portal**: [`http://localhost:3045/docs`](http://localhost:3045/docs) — covers getting started, authentication, API reference, SDK reference, tutorials, examples, hooks, events, FAQ, changelog, and migration guide.

## Data store caveat

Body Tracker currently runs on an **in-memory data store** (`src/server/db/store.ts`) — there is no live Postgres or Redis wired up in local dev, and nothing persists across a server restart. `prisma/schema.prisma` documents the real, intended production schema (`Organization`, `Team`, `User`, `RefreshToken`, `ApiKey`, `TrackingSession`, `TrackingEvent`, `AnalyticsSnapshot`, `Report`, `Webhook`, `WebhookDelivery`, `AuditLogEntry`) for when the store is swapped over. `DATABASE_URL` / `REDIS_URL` are validated if you set them (see `src/server/env.ts`) but are not yet read by anything at runtime — do not expect data to actually land in Postgres/Redis even if those env vars are set locally. See `docs/ops/environment-variables.md` for the full env var reference.

## Troubleshooting

- **Port 3045 already in use**: another dev server instance is likely still running; find and kill it, or run on a different port (`npm run dev -- -p 3046`) and pass `--base=http://localhost:3046/api/v1` to `scripts/api-tests.mjs`/`scripts/load-test.mjs` accordingly (both scripts respect a `BTK_API_BASE_URL` env var or `--base` flag).
- **`api-tests.mjs` fails immediately with connection errors**: the dev server isn't up yet — confirm step 3's `curl` succeeds first.
- **Production-mode env errors**: if you ever run with `NODE_ENV=production` locally, `getEnv()` will throw unless `BTK_JWT_SECRET` is set to something other than the default dev value — see `docs/ops/environment-variables.md`.
