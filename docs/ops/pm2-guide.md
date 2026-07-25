# PM2 Guide (Bare-Metal / VM Deployment)

How to run Body Tracker on a plain Linux host (a VM, a bare-metal box — no containers) using PM2 as the process manager and Nginx as the reverse proxy in front of it (see `docs/ops/nginx-guide.md` for the Nginx half). This is `ecosystem.config.js`, which I personally ran end-to-end against a real built `.next/standalone/server.js` with `pm2 start ecosystem.config.js --env production` and verified working, including a real zero-downtime `pm2 reload`.

## Why this path exists alongside Docker

`docs/ops/docker-guide.md` covers the containerized path. This guide covers the alternative: PM2 running the same standalone Next.js server directly on the host OS, fronted by a native Nginx install. Pick whichever fits your infrastructure — both consume the same `output: "standalone"` build.

## Prerequisites

- Node.js 22 and npm on the host (see `docs/ops/installation-guide.md` for the version rationale).
- PM2 installed globally: `npm install -g pm2` (this is a global tool install, not a project dependency — it does not appear in `package.json`).
- Nginx installed and configured per `docs/ops/nginx-guide.md`.

## The standalone-assets gotcha (read this before your first deploy)

`next build` with `output: "standalone"` produces `.next/standalone/server.js`, but it does **not** copy `.next/static`, `public`, or your `.env.local` into that output directory automatically (confirmed against Next.js's own docs — they only mention `public`/`.next/static`, not env files). If you skip the static/public copy, the app boots under PM2 but serves broken pages — no CSS, no client JS. If you skip the `.env.local` copy, it's worse and quieter: the server starts and looks healthy (`/api/v1/health` returns 200, since that route has no dependencies), but every route that touches the database throws `"DATABASE_URL is not set"` — because the standalone `server.js` reads env files from **its own directory**, not the project root where you edited `.env.local`. Every deploy must run:

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/.env.local
```

Then reload, with `--update-env` so PM2 actually picks up the refreshed file rather than reusing its cached environment from the last start:

```bash
pm2 restart body-tracker --update-env
```

This is easy to forget because `npm run build` alone looks like it succeeded — the server starts, it just serves broken pages or silently fails every database-backed request. `scripts/pm2-setup.sh` (below) automates this step for first-time setup, but if you hand-roll a redeploy script, make sure it's in there too.

## `ecosystem.config.js`: what it actually does

```js
{
  name: "body-tracker",
  script: ".next/standalone/server.js",
  exec_mode: "cluster",
  instances: "max",
  ...
}
```

### Cluster mode and the single shared port

`exec_mode: "cluster"` with `instances: "max"` spawns one worker process per CPU core, using Node's built-in `cluster` module. All workers share **one** listening port — the cluster module load-balances incoming connections across workers internally, at the OS/Node level, rather than each worker binding its own port. This is why the Nginx config (`deploy/nginx/body-tracker.conf`) only needs a single upstream entry:

```nginx
upstream body_tracker_app {
    server 127.0.0.1:3045;
    keepalive 64;
}
```

— not one `server` line per worker. (Contrast this with a Docker deployment running multiple `app` container replicas, where each replica _does_ need its own upstream entry, since each is a genuinely separate process bound to its own port/container. `deploy/nginx/body-tracker.conf` has a comment noting this alternate pattern.)

### Memory ceiling and restart policy

```js
max_memory_restart: "512M",
autorestart: true,
max_restarts: 10,
min_uptime: "30s",
restart_delay: 2000,
exp_backoff_restart_delay: 200,
```

- `max_memory_restart: "512M"` — if a single worker's RSS exceeds 512M, PM2 restarts just that worker, rather than letting one leaking worker slowly degrade the whole cluster.
- `autorestart: true` with `max_restarts: 10` and `min_uptime: "30s"` — a worker that crashes is restarted automatically, but if it crashes 10 times without staying up 30 seconds each time, PM2 gives up restarting it (a real crash loop shouldn't be retried forever).
- `restart_delay: 2000` plus `exp_backoff_restart_delay: 200` — restarts are delayed and back off exponentially, so a flapping process doesn't hot-loop restart attempts.

### `wait_ready`/`listen_timeout` were deliberately removed — and why

An earlier version of this config used PM2's `wait_ready`/`listen_timeout` options, which delay marking a reloaded worker "ready" until it calls `process.send('ready')`, gating the next worker's reload on that signal. This was removed after directly verifying that **Next.js's standalone `server.js` never calls `process.send('ready')`** — under PM2 6.0.14, with `wait_ready` set, every reload just sat idle for the full `listen_timeout` window before PM2 gave up waiting and moved on anyway. It added a dead delay to every reload with none of the readiness confirmation it's supposed to provide, so it was taken out.

Real readiness gating instead happens one layer up, at the Nginx/load-balancer layer, via the dedicated readiness endpoint:

```
GET /api/v1/health/ready
```

(`src/app/api/v1/health/ready/route.ts`) — distinct from the plain liveness check at `/api/v1/health` used by Docker's `HEALTHCHECK`. The readiness endpoint checks environment config (`getEnv()`) and that the data store is initialized, returning `503` if not ready. If you wire up an external load balancer or orchestrator health check in front of PM2/Nginx, point it at `/api/v1/health/ready`, not `/api/v1/health`, when you specifically need to gate traffic on "ready to serve," not just "process is alive."

`kill_timeout: 5000` still does real, useful work on top of this: on `pm2 reload`, PM2 sends a graceful shutdown signal and gives the outgoing worker up to 5 seconds to finish in-flight requests before force-killing it, one worker at a time, so a reload doesn't drop active connections.

### Environment blocks

```js
env: {
  NODE_ENV: "development",
  PORT: 3045,
  HOSTNAME: "127.0.0.1",
},
env_production: {
  NODE_ENV: "production",
  PORT: 3045,
  HOSTNAME: "127.0.0.1",
},
```

Note `HOSTNAME: "127.0.0.1"` — the app binds to localhost only, not `0.0.0.0`. It is not meant to be reachable directly from outside the host; only Nginx (also on `127.0.0.1`, per `deploy/nginx/body-tracker.conf`'s `upstream` block) talks to it directly. This is the opposite of the Docker image's default (`HOSTNAME=0.0.0.0` in `Dockerfile`), which makes sense there since the container's network namespace is already isolated by Docker.

Secrets — `BTK_JWT_SECRET`, and eventually `DATABASE_URL`/`REDIS_URL` once the data layer is Prisma/Redis-backed (see `docs/ops/docker-guide.md`'s note on `src/server/db/store.ts`) — are **deliberately not hardcoded** in `ecosystem.config.js`. They must come from the real process environment (a systemd `EnvironmentFile`, a real `.env` sourced before `pm2 start`, etc.) at deploy time.

### Logs

```js
out_file: "logs/pm2/out.log",
error_file: "logs/pm2/error.log",
merge_logs: true,
log_date_format: "YYYY-MM-DD HH:mm:ss Z",
```

All cluster workers' stdout/stderr are merged into these two files under `logs/pm2/` (relative to the repo root, since `cwd: __dirname`).

## First-time setup: `scripts/pm2-setup.sh`

This script is **not** run automatically by anything in the repo — it's meant to be read, then run by hand as the deploy user (not root) on the target host:

```bash
bash scripts/pm2-setup.sh
```

Walking through what it does:

1. `npm ci && npm run build` — clean install + production build.
2. `cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public` — the manual static-asset copy described above.
3. `pm2 start ecosystem.config.js --env production` — starts the cluster.
4. `pm2 save` — persists the current process list so PM2 knows what to restore later.
5. `pm2 startup` — this line is **printed but not executed automatically**. PM2 will print a real command like `sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u <user> --hp <home>` (exact form depends on OS/init system/user). You must copy that exact printed line and run it yourself, once, as root — it's not run for you because it installs a real systemd unit on the host, which the script deliberately won't do unattended.
6. Prints (but does not run) the optional log-rotation setup — see below.

## Zero-downtime deploys: `pm2 reload`

For a code update after the initial setup:

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/.env.local
pm2 reload body-tracker
```

`pm2 reload` (not `pm2 restart`) reloads cluster workers **one at a time**, relying on `kill_timeout` to let each outgoing worker drain in-flight requests before the next one is cycled — this is what makes it zero-downtime, since at every point during the reload at least some workers are still serving traffic on the shared port. This was verified directly against this exact `ecosystem.config.js`. `pm2 restart` by contrast kills and restarts everything more abruptly and should be avoided for routine deploys.

## Observability

```bash
pm2 logs body-tracker        # tail merged stdout/stderr live
pm2 logs body-tracker --lines 200 --nostream   # last 200 lines, no follow
pm2 monit                    # live CPU/memory dashboard per worker, in-terminal
pm2 status                   # one-line-per-process table: uptime, restarts, memory
pm2 describe body-tracker    # full detail on the process (env, paths, restart count)
```

## Log rotation: `pm2 install pm2-logrotate`

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
```

Important distinction: `pm2 install <name>` installs a **PM2 module** — a plugin that runs inside PM2's own process manager — not an npm package. It is not, and should not be, added to this project's `package.json`; it lives entirely in PM2's own module registry on the host, independent of the app's dependency tree. Without it, `logs/pm2/out.log`/`error.log` grow unbounded.

## Surviving reboots: `pm2 startup` + `pm2 save`

Two separate steps, both required:

- **`pm2 save`** — snapshots the currently running process list (what `scripts/pm2-setup.sh` already does after the initial `pm2 start`). Run this again any time the process list itself changes (not needed for a routine `pm2 reload`, which doesn't change the process list).
- **`pm2 startup`** — generates and prints an OS-specific systemd (or equivalent init system) command that, when run once as root, installs a service that runs `pm2 resurrect` on boot, restoring whatever was last saved with `pm2 save`.

Run `pm2 save` after `pm2 startup`'s printed command has been executed, and again after any future change to the process list (e.g. changing `instances` in `ecosystem.config.js` and reloading), so a reboot restores the intended state.

## Quick reference

```bash
# First-time bootstrap
bash scripts/pm2-setup.sh
# ...then copy/paste and run the printed `pm2 startup` command as root
pm2 save

# Routine zero-downtime deploy
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/.env.local
pm2 reload body-tracker

# Observability
pm2 logs body-tracker
pm2 monit
pm2 status

# Log rotation (one-time)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
```
