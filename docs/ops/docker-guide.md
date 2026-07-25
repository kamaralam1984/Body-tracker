# Docker Guide

How to build and run Body Tracker in containers — the production image (`Dockerfile`), the local dev container (`Dockerfile.dev`), and the optional Prometheus/Grafana monitoring overlay. All commands below are run from the repo root.

## Prerequisites

- Docker Engine with the `docker compose` CLI plugin (i.e. `docker compose version` works — not the legacy standalone `docker-compose` binary).
- No local Node install is required for the Docker path; everything happens inside the containers.

## The production image (`Dockerfile`)

`Dockerfile` is a three-stage build:

| Stage     | Base             | Purpose                                                                                                                         |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `deps`    | `node:22-alpine` | `npm ci` against `package.json`/`package-lock.json` only, so this layer is cached independently of source changes.              |
| `builder` | `node:22-alpine` | Copies `node_modules` from `deps`, copies the full source tree, runs `npm run build` with `NEXT_TELEMETRY_DISABLED=1`.          |
| `runner`  | `node:22-alpine` | The actual image that ships. Copies only the build output out of `builder` — nothing from `deps` or the source tree lands here. |

### Why `output: "standalone"` matters

`next.config.ts` sets:

```ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

This makes `next build` produce `.next/standalone/`: a self-contained `server.js` plus a trimmed `node_modules` directory containing only the packages actually needed at runtime (Next.js traces the real dependency graph rather than shipping the full `node_modules` tree, dev dependencies, and the build toolchain). The `runner` stage copies exactly three things out of `builder`:

```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
```

`.next/static` and `public` are copied in explicitly because Next's standalone output does **not** bundle them automatically (the same gotcha applies to the PM2 bare-metal path — see `docs/ops/pm2-guide.md`). The net effect is a runtime image with no copy of `npm`'s cache, no dev dependencies, no TypeScript source, and no build toolchain — meaningfully smaller than a naive "copy everything, `npm install`, `npm run build`" single-stage image.

### Non-root user

The runner stage creates a dedicated system user before switching to it:

```dockerfile
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
...
USER nextjs
```

All copied files are `--chown=nextjs:nodejs`, and the container runs as uid/gid `1001:1001`, not root. This limits blast radius if the app process is ever compromised — it cannot write outside the paths it was explicitly given, and it isn't root inside the container's user namespace.

### Health check

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

This uses Node's built-in `fetch` (no `curl`/`wget` needed in the Alpine image) to hit the app's own liveness endpoint (`src/app/api/v1/health/route.ts`, which just returns `{ status: "ok", timestamp }` — a pure liveness check with no dependency probing). `docker ps` and `docker inspect --format='{{.State.Health.Status}}' <container>` will report `healthy`/`unhealthy` based on this. Note there is a second, separate endpoint — `/api/v1/health/ready` — that additionally checks environment config and data-store readiness; that one is used by the Nginx/PM2 path (see `docs/ops/pm2-guide.md`), not by this container-level healthcheck.

### Exposed port

The container listens on `3000` internally (`EXPOSE 3000`, `ENV PORT=3000`, `ENV HOSTNAME=0.0.0.0`). `docker-compose.yml` maps this to host port `3045` to match the project's usual dev port convention — see below.

### Building and running it standalone

```bash
docker build -t body-tracker:latest .
docker run --rm -p 3045:3000 \
  -e BTK_JWT_SECRET=some-secret \
  body-tracker:latest
```

Then check `http://localhost:3045/api/v1/health`.

## Production topology: `docker-compose.yml`

```bash
docker compose up --build
```

This brings up three services:

- **`app`** — built from `Dockerfile`, published on host port `3045` (container port `3000`), with `BTK_JWT_SECRET`, `DATABASE_URL`, and `REDIS_URL` set as environment variables. It waits on `postgres` and `redis` via `depends_on: condition: service_healthy`.
- **`postgres`** — `postgres:17-alpine`, with a `pg_isready`-based healthcheck and a named volume (`postgres_data`) for durability.
- **`redis`** — `redis:7-alpine`, with a `redis-cli ping`-based healthcheck and a named volume (`redis_data`).

### Important caveat: this wiring is not yet load-bearing

`docker-compose.yml` sets `DATABASE_URL` and `REDIS_URL` on the `app` service, and both `postgres` and `redis` start up and pass their healthchecks — but as of this phase of the build, **the application does not actually read or use either variable for real persistence**. `src/server/db/store.ts` is still an in-memory data store; every organization, user, tracking session, and API key lives in process memory and is lost on restart. The `status` endpoint (`src/app/api/v1/status/route.ts`) reports this plainly: `dataStore.kind` is literally `"in-memory (production target: PostgreSQL via Prisma)"`.

So running `docker compose up` today gives you a real Postgres and a real Redis, both healthy and reachable from the `app` container on the compose network — but the app itself won't persist anything to them yet. This compose file documents the **intended, real** wiring for when `src/server/db/store.ts` is swapped for a Prisma-backed store (see `prisma/schema.prisma`) and the rate limiter/cache move to Redis. When that swap lands, no changes to `docker-compose.yml` should be needed — the services and env vars are already correctly named and wired. Until then, treat `postgres`/`redis` in this compose file as present-but-unused by the app.

### Viewing logs

```bash
docker compose logs -f app
docker compose logs -f postgres redis
docker compose logs -f          # everything, interleaved
```

### Tearing down

```bash
docker compose down             # stop and remove containers, keep volumes
docker compose down -v          # also delete postgres_data/redis_data
```

## Local dev: `docker-compose.dev.yml`

For hot-reload development inside a container (as opposed to running `npm run dev` directly on the host — see `docs/ops/installation-guide.md` for that path):

```bash
docker compose -f docker-compose.dev.yml up --build
```

This builds from `Dockerfile.dev` — a single-stage `node:22-alpine` image that just runs `npm ci` and then `npm run dev -- -p 3045` — and bind-mounts the repo into the container:

```yaml
volumes:
  - .:/app
  - node_modules:/app/node_modules
  - next_cache:/app/.next
```

The bind mount (`.:/app`) means edits made on the host are picked up immediately for hot reload, with no rebuild needed. The two **named volumes** for `node_modules` and `.next` exist to solve a common cross-platform Docker dev gotcha: without them, the host bind mount would shadow the container's own `node_modules`/`.next` with whatever (possibly non-Linux, possibly absent) versions exist on the host, breaking native/platform-specific build artifacts. The named volumes keep those two directories as container-native, Linux-built content, layered on top of the bind mount.

The dev app is reachable at `http://localhost:3045` (both host and container port are `3045` here, matching `Dockerfile.dev`'s `EXPOSE 3045`).

```bash
docker compose -f docker-compose.dev.yml logs -f app
docker compose -f docker-compose.dev.yml down
```

## Optional monitoring overlay: `docker-compose.monitoring.yml`

This is a compose **overlay**, not a standalone file — it only adds services on top of the base `docker-compose.yml` stack and must be combined with it:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build
```

This adds:

- **`prometheus`** (`prom/prometheus:latest`) — scrapes the app's real `/api/v1/metrics` endpoint, using the scrape config at `deploy/monitoring/prometheus.yml` and alert rules at `deploy/monitoring/alerts.yml`. Exposed on host port `9090`.
- **`grafana`** (`grafana/grafana:latest`) — pre-provisioned with that Prometheus instance as its default datasource via `deploy/monitoring/grafana/provisioning/`. Exposed on host port `3001`.

### Grafana's default admin password is insecure — override it

```yaml
environment:
  GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-change-me}
```

If you don't set `GRAFANA_ADMIN_PASSWORD` in your shell/`.env` before running `docker compose up`, Grafana comes up with the admin password literally set to `change-me`. This is fine for a throwaway local look at dashboards, but **must** be overridden for anything reachable outside your own machine:

```bash
export GRAFANA_ADMIN_PASSWORD='a-real-secret'
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build
```

Full detail on the metrics endpoint, alert rules, and Grafana provisioning is out of scope for this guide — see `docs/ops/monitoring-guide.md`.

## Quick reference

```bash
# Production image, standalone
docker build -t body-tracker:latest .
docker run --rm -p 3045:3000 -e BTK_JWT_SECRET=... body-tracker:latest

# Production-shaped stack (app + postgres + redis)
docker compose up --build
docker compose logs -f app
docker compose down

# Local dev stack (hot reload)
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml down

# + monitoring overlay
export GRAFANA_ADMIN_PASSWORD='a-real-secret'
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up --build
```
