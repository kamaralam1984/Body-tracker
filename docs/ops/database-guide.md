# Database Guide

## Reality check first

**As of this writing, Body Tracker does not have a live database.** The running
application persists everything in a process-local, in-memory store
(`src/server/db/store.ts`), cached on `globalThis.__btkStore` so that Next.js
dev-mode module reloads (Turbopack HMR) don't wipe seeded data on every
request — the same trick real apps use for singleton Prisma clients. There is
no `DATABASE_URL` consumed anywhere in the app's request path today, and
restarting the process (or redeploying) throws all data away and re-seeds a
fixed demo dataset (one organization, `Apex Performance Labs`, three users,
eight tracking sessions, a report).

Everything below describes two things:

1. **The real, correct production data model** — `prisma/schema.prisma` — which
   is the designed migration target for when the in-memory store is swapped
   for Postgres. It is not wired up or running anywhere in this environment.
2. **How the in-memory store maps onto that schema today**, so the eventual
   Prisma migration is a mechanical swap rather than a redesign.

Treat any instruction elsewhere in this guide that assumes a live Postgres
connection (connection pooling, indexing behavior under load, etc.) as
forward-looking guidance for the real deployment, not something you can go
run against this sandbox right now.

---

## The production schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

The schema is intentionally a field-for-field mirror of
`src/server/db/entities.ts`, the TypeScript types the in-memory store and
every route handler already use. That's a deliberate design choice: when the
store implementation is swapped, route handlers that already work in terms of
`Organization`, `User`, `TrackingSession`, etc. shouldn't need to change their
shapes, only where those objects come from.

### Models

| Model               | Purpose                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Organization`      | Tenant root. Has a unique `slug`, a `Plan` (`starter` \| `growth` \| `enterprise`), owns everything else via `orgId`.                                            |
| `Team`              | Optional grouping of users within an org.                                                                                                                        |
| `User`              | Org member. Has `Role` (`owner` \| `admin` \| `manager` \| `member` \| `viewer`) and `UserStatus` (`active` \| `invited` \| `suspended`). Optional `teamId`.     |
| `RefreshToken`      | Long-lived auth tokens tied to a `User`, with `expiresAt` / nullable `revokedAt`.                                                                                |
| `ApiKey`            | Programmatic access. Stores only `keyHash` + `keyPrefix` (never the raw key), a `scopes: String[]` array, per-key `rateLimitPerMinute`, and usage counters.      |
| `TrackingSession`   | A single tracked activity (a workout/posture/focus session). Carries `status` (`TrackingStatus`), timing fields, `repCount`, `caloriesEstimate`, `avgFormScore`. |
| `TrackingEvent`     | Append-only event log per session (`started`, `paused`, `resumed`, `rep`, `form_alert`, `completed`), with a free-form `Json` `data` payload.                    |
| `AnalyticsSnapshot` | One row per user per day (`@@unique([userId, date])`) rolling up minutes, sessions, reps, and score averages.                                                    |
| `Report`            | Generated PDF/CSV report with `ReportStatus` lifecycle (`queued` → `generating` → `ready`/`failed`).                                                             |
| `Webhook`           | Org-level outbound webhook subscription, `events: WebhookEventType[]`, `status` (`active`/`disabled`).                                                           |
| `WebhookDelivery`   | Delivery attempt log per webhook, with `attempt`, `responseStatus`, `durationMs`.                                                                                |
| `AuditLogEntry`     | Append-only audit trail: `actorId`, `action`, `target`, `metadata: Json`.                                                                                        |

### Enums

`Role`, `UserStatus`, `Plan`, `TrackingStatus`, `TrackingEventType`,
`ReportFormat` (`pdf`\|`csv`), `ReportStatus`, `WebhookEventType`
(`session_started`, `session_completed`, `tracking_form_alert`,
`report_ready`, `user_invited`), `WebhookStatus`, `ApiKeyStatus`.

Note: the in-memory `entities.ts` types use slightly different literal
spellings in a couple of places for the webhook event union (e.g.
`"session.started"`, `"tracking.form-alert"` with dots/hyphens) versus the
Prisma enum's underscored `session_started` / `tracking_form_alert`. Any
Prisma-store adapter needs an explicit mapping layer at that boundary — it is
not a pure 1:1 string passthrough for webhook event names, even though every
other field is.

### Relations and cascade behavior

Every child model relates back to `Organization` (directly or transitively)
with `onDelete: Cascade`, so deleting an org cleans up its entire tree. The
one exception is `Team → User`, which uses `onDelete: SetNull` on `User.teamId`
— removing a team doesn't delete its members, it just orphans them from that
team.

### Indexes worth knowing about

These are already reflected in the schema and matter once there's real query
volume:

- `User`: `@@unique([orgId, email])` — emails are only unique _within_ an org,
  not globally (multi-tenant login lookups are always org-scoped). Plus
  `@@index([orgId])` for "list all users in an org."
- `TrackingSession`: `@@index([orgId, status])` — the dashboard's "show active
  sessions for this org" query is the hot path this serves.
- `TrackingEvent`: `@@index([sessionId, createdAt])` — event-log playback for
  a single session, in order.
- `AnalyticsSnapshot`: `@@unique([userId, date])` (upsert target for the daily
  rollup job) plus `@@index([orgId, date])` for org-wide date-range analytics
  queries.
- `Report` / `Webhook`: `@@index([orgId, status])` / `@@index([orgId])`
  respectively — both are always listed scoped to a tenant.
- `WebhookDelivery`: `@@index([webhookId, createdAt])` — delivery history for
  one webhook, chronological.
- `AuditLogEntry`: `@@index([orgId, createdAt])` — audit log is always
  paginated per-org, newest first.
- `ApiKey.keyHash` is `@unique` — API-key auth does a point lookup by hash on
  every authenticated request, so this needs to be O(1)/O(log n), not a scan.

All table names are explicitly mapped via `@@map(...)` to `snake_case` plural
names (`organizations`, `tracking_sessions`, `webhook_deliveries`, etc.) —
standard Postgres convention, independent of the PascalCase Prisma model
names used in application code.

---

## Today's reality: the in-memory store

`src/server/db/store.ts` exports:

- `getStore()` — returns (and lazily seeds, once, via `globalThis.__btkStore`)
  a `Store` object whose fields are `Map<string, Entity>` per model (plus
  `trackingEvents: Map<string, TrackingEvent[]>` keyed by session id, and a
  flat `auditLog: AuditLogEntry[]` array).
- `newId(prefix)` — generates ids like `user_3f9a...` (a prefix plus a
  hyphen-stripped `randomUUID()` slice), standing in for Prisma's
  `@default(cuid())`.
- `nowIso()` — timestamp helper standing in for Postgres's `now()` /
  Prisma's `@default(now())`.

The seed data (`seed()`) creates one organization (`org_apex`,
`Apex Performance Labs`, `enterprise` plan), one team, three users (owner,
admin, member — see the file for seed credentials, which are dev-only demo
values), eight historical `TrackingSession` + matching `AnalyticsSnapshot`
rows, and one `ready` report. This is deterministic and resets on every
process restart — there is no durability across deploys or crashes today.

Route handlers call `getStore()` and mutate the `Map`s directly (no query
builder, no transactions, no concurrency control beyond JS's single-threaded
event loop). This is intentionally shaped so that a future Prisma-backed
`getStore()`-equivalent (or a thin repository layer wrapping
`PrismaClient`) can replace the internals without every call site needing to
change — but that replacement has **not** been done yet.

### Migration path (when a real Postgres is available)

1. Provision Postgres (`docker-compose.yml`'s `postgres` service works for
   this — see below).
2. Run `prisma migrate deploy` (or `prisma db push` for a first pass) against
   `prisma/schema.prisma` to create the real tables.
3. Replace `src/server/db/store.ts`'s `Map`-based `Store` with a
   `PrismaClient` singleton (same `globalThis` caching pattern, just caching
   `PrismaClient` instead of the `Store` object — this is the standard
   Next.js/Prisma singleton pattern to avoid exhausting connections across
   hot reloads).
4. Route handlers largely stay the same shape since `entities.ts` already
   matches the Prisma models field-for-field; the main work is swapping
   `Map.get`/`Map.set`/`Array.filter` calls for `prisma.model.findUnique` /
   `.create` / `.findMany`, and reconciling the webhook-event-name spelling
   mismatch noted above.
5. Point `/api/v1/health/ready` (`src/app/api/v1/health/ready/route.ts`) at a
   real `SELECT 1`-style Prisma ping instead of the current
   `store.organizations.size > 0` check — the route already has a comment
   marking exactly where this goes.

---

## Connection pooling guidance (for the real deployment)

This does not apply today — nothing in the app opens a Postgres connection.
It's documented here so it's not forgotten when the migration above happens.

Next.js API routes (this app's `src/app/api/v1/*` routes) behave like a
mid-size pool of short-lived server processes/workers rather than one
long-lived backend: under PM2 clustering (see `ecosystem.config.js`) each
worker would hold its own `PrismaClient`, and each request potentially opens
a new logical connection if pooling isn't handled carefully. Postgres itself
defaults to `max_connections = 100`, which is easy to exhaust once you
multiply "PM2 workers" × "Prisma's own internal pool per client."

Recommended setup for the eventual real deployment:

- Run **PgBouncer** in **transaction pooling mode** in front of Postgres.
  Transaction mode (not session mode) is the right choice here because
  Prisma's query engine doesn't need session-level features (no `LISTEN`,
  no advisory-lock-across-queries usage in this codebase) — transaction
  pooling gives the highest connection reuse, which matters most when
  serverless/edge-style deploy targets churn through many short-lived
  connections.
- Point `DATABASE_URL` at PgBouncer's port, not Postgres directly, and add
  `?pgbouncer=true&connection_limit=1` to Prisma's connection string (Prisma
  documents this flag specifically for PgBouncer transaction mode, since it
  disables prepared-statement caching that transaction pooling can't
  support).
- Keep a _second_, direct-to-Postgres URL (e.g. `DIRECT_URL`) for running
  `prisma migrate deploy` — migrations need session-level guarantees
  PgBouncer's transaction mode doesn't provide.
- Size PgBouncer's `default_pool_size` around the real workload, not around
  `max_connections` — the point of pooling is to keep Postgres's own
  connection count low and stable regardless of how many app workers exist.

None of this is wired up in `docker-compose.yml` today; the `app` service
connects straight to the `postgres` service on port 5432. Adding a
`pgbouncer` service between them is a natural next step once there's real
traffic to justify it.

---

## `docker-compose.yml`: postgres and redis services

Two services exist today, already correctly configured, but **not consumed by
the app** (the app doesn't read `DATABASE_URL`/`REDIS_URL` yet — see the
compose file's own header comment):

```yaml
postgres:
  image: postgres:17-alpine
  environment:
    POSTGRES_USER: body_tracker
    POSTGRES_PASSWORD: body_tracker
    POSTGRES_DB: body_tracker
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U body_tracker"]
    interval: 5s
    timeout: 5s
    retries: 10
  restart: unless-stopped

redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 5s
    retries: 10
  restart: unless-stopped
```

- **`postgres`** (`postgres:17-alpine`) is the target for the Prisma schema
  above. Data persists in the named volume `postgres_data`. Credentials are
  intentionally simple dev defaults (`body_tracker`/`body_tracker`) — rotate
  these for any real deployment. The `app` service already declares
  `depends_on: postgres: condition: service_healthy`, so once the app
  actually reads `DATABASE_URL`, container startup ordering is already
  correct.
- **`redis`** (`redis:7-alpine`, volume `redis_data`) is the intended backend
  for two things that are currently in-memory and process-local:
  1. The rate limiter in `src/server/http/rate-limit.ts` — today a genuinely
     working in-memory sliding-window limiter (`Map<string, {count,
resetAt}>` keyed per caller+bucket), fine for a single process but
     meaningless once you run more than one PM2 worker or more than one
     container, since each process would enforce its own separate limit.
     Swapping the `Map` for Redis `INCR`+`EXPIRE` (or a Lua script for
     atomicity) makes rate limits consistent across all workers/instances.
  2. Session/cache data in general, once the app has more to cache than the
     in-memory store already holds for free.

Both services already have healthchecks wired so `depends_on: condition:
service_healthy` works correctly once the app's code catches up to the
compose file's intent.

---

## Summary

| Layer                 | Status today                                                            | Designed target                                                               |
| --------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Data model            | `src/server/db/entities.ts` (TS interfaces)                             | `prisma/schema.prisma` (1:1 mirror)                                           |
| Storage               | `globalThis.__btkStore`, in-memory `Map`s, reset on restart             | Postgres 17 via Prisma, durable, in `docker-compose.yml`'s `postgres` service |
| Connection management | N/A (no connections)                                                    | PgBouncer, transaction-pooling mode, in front of Postgres                     |
| Rate limiting / cache | In-memory sliding window, per-process (`src/server/http/rate-limit.ts`) | Redis (`docker-compose.yml`'s `redis` service)                                |
| Readiness check       | `store.organizations.size > 0`                                          | Real Prisma `SELECT 1` / connection check                                     |

See also: `docs/ops/backup-guide.md` and `docs/ops/restore-guide.md` for the
backup/restore tooling that already exists and is correct against a real
Postgres instance, and `docs/ops/environment-variables.md` for the canonical
list of environment variables (including `DATABASE_URL`, `REDIS_URL`) this
system is designed around.
