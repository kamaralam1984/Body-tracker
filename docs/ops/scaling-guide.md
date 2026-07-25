# Scaling Guide

What scaling Body Tracker actually looks like today, what's real and working
now, and what's genuinely missing before it can scale beyond a single host.
Written to be honest about the gap rather than aspirational — this is not a
"just add more servers" document.

## The short version

- **Vertical / single-host scaling is real and working today**, via PM2
  cluster mode (`ecosystem.config.js`).
- **Horizontal / multi-host scaling is not fully wired today.** The app's
  data layer (`src/server/db/store.ts`, in-memory) and its rate limiter
  (`src/server/http/rate-limit.ts`, in-memory) are both per-process state.
  Run two app processes on two different hosts today and they'd each have
  their own disconnected view of the world — different users, sessions, and
  rate-limit counters depending on which host handled the request. That's
  the real blocker, not Nginx or PM2 configuration.

## Vertical scaling today: PM2 cluster mode

`ecosystem.config.js` already runs Body Tracker in PM2's `cluster` exec
mode:

```js
exec_mode: "cluster",
instances: "max",
```

`instances: "max"` spawns one worker process per CPU core, all sharing a
single listening port via Node's built-in `cluster` module — PM2 (and the
OS) load-balance incoming connections across them. This is why
`deploy/nginx/body-tracker.conf`'s `upstream body_tracker_app` block only
needs a single `server 127.0.0.1:3045;` line: from Nginx's perspective
there's one thing listening on 3045, even though N worker processes are
actually handling requests behind it.

This gets you real multi-core utilization on one machine, and real
resilience — if one worker crashes or leaks memory, PM2 restarts just that
worker while the others keep serving.

### Tuning knobs already in `ecosystem.config.js`

- **`max_memory_restart: "512M"`** — a per-worker memory ceiling. If a
  worker's RSS exceeds this, PM2 restarts it rather than letting one bad
  worker degrade the whole cluster. Tune this based on the host's total RAM
  divided by core count, leaving headroom for the OS and (if colocated) any
  database/Redis processes. `deploy/monitoring/alerts.yml`'s
  `BodyTrackerHighMemory` alert fires at 900MB RSS specifically because
  that's comfortably past this 512M ceiling — if you see it, a worker leaked
  past its own restart threshold, which is worth investigating on its own.
- **`instances: "max"`** — can be pinned to a specific number (e.g. `4`)
  instead of `"max"` if you want to reserve cores for other processes on a
  shared host (see the host-contention note below for why that matters).
- **`kill_timeout: 5000`** — how long PM2 gives an in-flight request to
  finish before force-killing a worker during `pm2 reload`. Raise this if
  you have genuinely long-lived requests (the tracking SSE stream can run
  for a while — see `deploy/nginx/body-tracker.conf`'s `proxy_read_timeout
1h` on that route).
- **`autorestart` / `max_restarts` / `min_uptime` / `restart_delay` /
  `exp_backoff_restart_delay`** — standard PM2 crash-loop protection,
  already configured with reasonable defaults (10 restarts, exponential
  backoff starting at 200ms).

Scaling vertically today is mostly "get a bigger box" — more cores means
more PM2 workers means more concurrent request handling, with no code
changes required.

## What real horizontal (multi-host) scaling needs

Two concrete blockers, both about **shared state that currently lives
per-process in memory**:

### 1. A real shared Postgres

`src/server/db/store.ts` is an in-memory data store — organizations, users,
tracking sessions, reports, webhooks, and API keys all live in JS `Map`s
inside the running process. This is fine (and simple) for a single process
or a single-host PM2 cluster where... actually, note: even PM2 cluster mode
already runs N _separate_ Node processes, each with its own in-memory store
instance. Right now that's masked because typical local/dev/CI usage hits a
single worker or doesn't depend on cross-worker state consistency, but it's
worth being precise: **the in-memory store is not even safely shared across
today's PM2 workers on one host**, let alone across hosts. `docker-compose.yml`
already documents and wires the real target — a `postgres:17-alpine`
service — and `prisma/schema.prisma` defines the intended schema. Once
`store.ts` is swapped for a Prisma-backed store reading `DATABASE_URL`,
every worker/host talks to the same database instead of its own private
memory, and this stops being a scaling blocker.

### 2. A real shared Redis for the rate limiter

`src/server/http/rate-limit.ts` is an in-memory sliding-window limiter
(a `Map` keyed by caller, tracking `count`/`resetAt` per window). It's
correct for a single instance, but two instances (two PM2 workers, or two
hosts) each enforce their own independent limit — a caller could get up to
N× the intended rate limit by having requests land on N different
processes. `docker-compose.yml` already wires a `redis:7-alpine` service for
exactly this; moving the limiter to Redis (e.g. `INCR` + `EXPIRE`, or a
Redis-backed sliding window) makes the limit consistent regardless of which
process/host handles a given request.

Both of these are "swap the backing store" changes, not architectural
rewrites — the app's route handlers don't need to change, just
`store.ts` and `rate-limit.ts`'s internals.

### 3. Nginx (or a cloud LB) across multiple hosts

Once the two blockers above are resolved, extending the load balancer layer
is comparatively simple. `deploy/nginx/body-tracker.conf` already documents
this in a comment on the `upstream body_tracker_app` block:

```nginx
upstream body_tracker_app {
    server 127.0.0.1:3045;
    keepalive 64;
}
```

For multiple app hosts (or multiple Docker container replicas), add one
`server` line per replica:

```nginx
upstream body_tracker_app {
    server 10.0.1.10:3045;
    server 10.0.1.11:3045;
    server 10.0.1.12:3045;
    keepalive 64;
}
```

Nginx's default load-balancing (round-robin, or `least_conn`/`ip_hash` if
added) then distributes across all listed servers. The SSE tracking route
(`location /api/v1/tracking/`) and the general API route already have
`proxy_buffering off` and connection-forwarding headers set correctly for
this to work unmodified across multiple upstream servers — no proxy config
changes needed beyond adding `server` lines, once the app itself is safe to
run as multiple independent instances (i.e. once #1 and #2 above are done).

## Caching strategy notes

`docker-compose.yml`'s Redis service is provisioned for two roles once the
Postgres migration lands: the rate limiter (above), and as a general cache
layer in front of the database for read-heavy endpoints (e.g. analytics
summaries, session lists) — reducing repeated Postgres round-trips under
load. Neither role is implemented yet; today Redis in `docker-compose.yml`
is wired and healthy-checked but genuinely unused by the app (`app` doesn't
read `REDIS_URL` yet — see the comment at the top of `docker-compose.yml`).
When implementing, prefer short TTLs on cache entries over manual
invalidation where possible — simpler to reason about, and this app's data
doesn't need strict real-time cache coherency for most read paths.

## Measuring a real baseline: `scripts/load-test.mjs`

There's a real, dependency-free concurrent load tester at
`scripts/load-test.mjs` — deliberately hand-rolled (no k6/autocannon; this
project avoids adding new npm dependencies for infra tooling). It logs in,
fires concurrent requests across a realistic scenario mix (`/health`,
`/status`, `/sessions`, `/users/me`, `/analytics/summary`), and reports real
wall-clock p50/p95/p99/max latency, throughput, and per-endpoint breakdowns.

```bash
node scripts/load-test.mjs --concurrency=20 --requests=500 --base=http://localhost:3045/api/v1
```

Flags: `--concurrency` (default 20), `--requests` (default 500), `--base`
(default `http://localhost:3045/api/v1`, or `$BTK_API_BASE_URL`).

**Run this against the real target host, not a shared/contended dev box,
before treating any of its numbers as a capacity baseline.** This isn't a
theoretical caveat — it's a real finding from this session. During
development, the tracking SSE stream showed a reproducible delay in its
timer-driven (`setInterval`-based) updates. This was confirmed, via three
independent methods (direct `curl`, through the Nginx proxy, and via the
browser-based API Explorer — all three worked correctly under normal load),
**not** to be a code bug. The actual cause: the development host is a
shared, multi-tenant machine, observed at a load average of 6.5–9 on a
4-core box from unrelated processes. A CPU-starved host starves Node's
event loop, which delays anything timer-driven — including `setInterval`
callbacks feeding a long-lived SSE connection. `scripts/load-test.mjs`'s own
output prints a reminder of exactly this ("re-run on the actual target
host... which may be a shared/contended environment").

The operational takeaway: **production hosts need dedicated/guaranteed CPU,
not oversubscribed shared hosts**, for consistent latency on anything
timer- or event-loop-sensitive — SSE streams being the clearest example in
this app, but the same starvation would eventually show up as general
request-latency jitter under sustained host contention. If you ever see
"the app is slow but nothing looks broken," check host-level CPU
contention (`uptime`, `top`, `vmstat 1`) before assuming an app bug — see
`docs/ops/disaster-recovery-guide.md`'s host-contention incident walkthrough
for the full diagnostic sequence.
