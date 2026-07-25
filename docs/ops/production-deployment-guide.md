# Production Deployment Guide

The end-to-end story for getting a change from a merged commit on `main` to
serving production traffic: which deployment path to pick, what CI has to
pass first, how the automated staging/manual-production pipeline works, how
to verify a deploy actually succeeded, and how tagged releases produce
versioned Docker images.

This document is the "how it all fits together" guide. It deliberately does
**not** re-explain the internals of the individual pieces — see:

- `docs/ops/server-setup-guide.md` — provisioning a bare Ubuntu 24 LTS host
- `docs/ops/pm2-guide.md` — PM2 process management internals
- `docs/ops/nginx-guide.md` — the reverse-proxy config in depth
- `docs/ops/docker-guide.md` — the containerized path in depth
- `docs/ops/scaling-guide.md` — vertical vs. horizontal scaling
- `docs/ops/disaster-recovery-guide.md` — incident response and rollback

## Two real deployment paths

Body Tracker has two independent, fully-working deployment paths. Pick one
per environment — they are not meant to be mixed on the same host.

|                        | Path A: Bare-metal / VM                        | Path B: Docker                                                                                                                                      |
| ---------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Process manager        | PM2 (cluster mode, `ecosystem.config.js`)      | Container runtime (`docker-compose.yml` / any orchestrator)                                                                                         |
| Reverse proxy          | Nginx (`deploy/nginx/body-tracker.conf`)       | Nginx or a cloud LB in front of the container(s)                                                                                                    |
| Build artifact         | `.next/standalone` copied onto the host        | `Dockerfile` multi-stage build                                                                                                                      |
| Best for               | A single dedicated VM/server you fully control | Environments that already standardize on containers, or where you want the `docker-compose.yml`-described Postgres/Redis topology alongside the app |
| Deploy flow used below | `pm2 reload` (zero-downtime)                   | Image build + push in `release.yml`, pulled/run by your orchestrator                                                                                |

Both are real, tested paths in this repo. `deploy.yml` (below) is written for
Path A (PM2 + SSH). If you deploy via Path B instead, swap the SSH/`pm2
reload` steps for your orchestrator's rolling-update mechanism, and lean on
`release.yml`'s versioned images for what to deploy.

## Step 1: CI must pass (`.github/workflows/ci.yml`)

Every push to `main` and every PR into `main` runs the `CI` workflow, which
has two jobs.

**`lint-typecheck-build`** (must pass before anything else runs):

1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 22, npm cache
3. `npm ci` — install dependencies
4. `npm run lint` — ESLint
5. `npx tsc --noEmit` — type check
6. `npm run build` — production Next.js build (`BTK_JWT_SECRET=ci-build-only-secret`)
7. **API integration tests** — this is the important one:
   ```bash
   npm run start -- -p 3045 &
   npx wait-on http://localhost:3045/api/v1/health --timeout 30000
   node scripts/api-tests.mjs
   ```
   This boots the actual built app on port 3045, waits (up to 30s) for
   `/api/v1/health` to respond, then runs `scripts/api-tests.mjs` — a real
   43-test integration suite against the live server, with no mocking.
   Env: `BTK_JWT_SECRET=ci-integration-test-secret`,
   `BTK_API_BASE_URL=http://localhost:3045`.

**`docker-build`** (runs after `lint-typecheck-build` succeeds, via `needs`):

1. `actions/checkout@v4`
2. `docker/setup-buildx-action@v3`
3. `docker/build-push-action@v6` with `push: false`, tag `body-tracker:ci` —
   validates the `Dockerfile` builds cleanly. The image is not pushed
   anywhere by this job.

Nothing downstream (staging or production deploys) should happen unless
this workflow is green.

## Step 2: Deploys (`.github/workflows/deploy.yml`)

The `Deploy` workflow has two jobs, both of which SSH into a target host via
`appleboy/ssh-action@v1` and run the same deploy script shape.

### Triggers

- **`workflow_run`** — fires automatically when the `CI` workflow completes
  on `main`. If it concluded successfully, `deploy-staging` runs.
- **`workflow_dispatch`** — manual trigger from the Actions tab (or `gh
workflow run deploy.yml -f target=staging|production`) with a required
  `target` input (`staging` or `production`).

So: **staging deploys automatically** after every green CI run on `main`.
**Production deploys only ever happen manually**, via `workflow_dispatch`
with `target: production`.

### `deploy-staging`

Condition: `github.event.workflow_run.conclusion == 'success' ||
github.event.inputs.target == 'staging'` — runs on the `staging` GitHub
Environment.

```bash
cd /srv/body-tracker
git fetch origin main
git reset --hard origin/main
npm ci
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/.env.local
pm2 reload ecosystem.config.js --env production
```

The `cp -r` steps exist because of a real Next.js standalone-output gotcha:
`next build`'s standalone server bundle does **not** include the
`.next/static` assets or the `public/` directory — you have to copy them in
next to `server.js` yourself, or the running app will 404 on its own static
assets. `pm2 reload` (not `restart`) does a one-worker-at-a-time rolling
reload across the PM2 cluster, so there's no dropped-connections window (see
`ecosystem.config.js`'s `kill_timeout: 5000`).

After the SSH step, the workflow waits 5s and checks:

```bash
curl -f https://staging.example.com/api/v1/health/ready
```

### `deploy-production`

Condition: `github.event.inputs.target == 'production'` — runs on the
`production` GitHub Environment, targeting the same `/srv/body-tracker`
deploy path and identical build/reload steps, then:

```bash
sleep 5
curl -f https://example.com/api/v1/health/ready
```

with a final `if: failure()` step that prints a pointer to
`docs/ops/disaster-recovery-guide.md` and `scripts/rollback.sh`.

**The manual-approval gate**: `deploy-production` targets the `production`
GitHub Environment. GitHub Environments support **required reviewers** — a
setting that pauses the job until a designated person approves it in the
Actions UI. This workflow's YAML shape is correct for that gate, but the
gate itself is configured outside the YAML, in the repo:

> **Settings → Environments → production → Required reviewers** — add the
> people who must approve a production deploy before the job proceeds.

Without configuring this, `target: production` will deploy immediately on
dispatch with no human checkpoint — treat this as a required setup step
before this pipeline is trusted with real production traffic (see the
checklist below).

### Required secrets

Both jobs read the same four secrets, scoped per-Environment so `staging`
and `production` can point at different hosts/credentials:

| Secret                             | Purpose                            |
| ---------------------------------- | ---------------------------------- |
| `STAGING_HOST` / `PRODUCTION_HOST` | SSH host for the respective target |
| `DEPLOY_USER`                      | SSH username                       |
| `DEPLOY_SSH_KEY`                   | SSH private key                    |

None of these are configured in this sandbox — the workflow shape is real
and correct, but it has never actually run end-to-end here. Configure them
under **Settings → Environments → \<env\> → Secrets** (Environment-scoped
secrets, not repo-level, so staging and production can't cross-deploy by
accident).

## Step 3: Verifying a deploy

After any deploy (automatic staging or manual production), verify by hand
in addition to the workflow's own `curl -f .../health/ready` check:

```bash
# Readiness — validates env config and that the data layer is initialized.
# Returns 503 (not just a non-2xx body) if anything is unready.
curl -s https://<host>/api/v1/health/ready | jq

# Operational snapshot — uptime, memory, in-memory data-store record counts,
# and request metrics. Confirm uptimeSeconds is small (just restarted) and
# memory looks sane.
curl -s https://<host>/api/v1/status | jq
```

`/api/v1/health` (no `/ready`) is a pure liveness check — always fast, no
dependency checks, just confirms the process is alive. `/api/v1/health/ready`
is the meaningful one post-deploy: it checks environment configuration
(`getEnv()`) and that the data store is initialized, returning `503` if
either check fails. `/api/v1/status` additionally reports
`uptimeSeconds`, `memory.{rssMb,heapUsedMb}`, request metrics, and
per-entity data-store record counts — useful for confirming the new
process actually started (low uptime) and isn't already leaking memory.

If either check fails or looks wrong, go straight to
`docs/ops/disaster-recovery-guide.md` and `scripts/rollback.sh`.

## Step 4: Tagged releases (`.github/workflows/release.yml`)

For versioned, immutable Docker images (independent of the staging/prod SSH
deploy flow above — useful for anyone running Body Tracker via Docker
outside this repo's own hosts), push a semver tag:

```bash
git tag v1.2.0
git push origin v1.2.0
```

This triggers `Release`, which:

1. Checks out the repo, sets up `docker/setup-buildx-action@v3`
2. Logs into `ghcr.io` via `docker/login-action@v3`, using
   `github.actor` / `secrets.GITHUB_TOKEN` (no extra secrets needed — GHCR
   works with the built-in token)
3. Extracts the version from the tag (`v1.2.0` → `1.2.0`) into a
   `steps.version.outputs.version` output
4. Builds and pushes with `docker/build-push-action@v6`, tagging:
   - `ghcr.io/<owner>/<repo>:1.2.0`
   - `ghcr.io/<owner>/<repo>:latest`

   with GitHub Actions cache (`cache-from`/`cache-to: type=gha`) to speed up
   rebuilds.

5. Creates a GitHub Release named `v1.2.0` via
   `softprops/action-gh-release@v2` with `generate_release_notes: true` —
   GitHub auto-drafts the changelog from merged PRs since the last tag.

This job needs `permissions: contents: write, packages: write` (already set
in the workflow) so the built-in `GITHUB_TOKEN` can push both the package
and the release.

## First production deploy checklist

Concrete, in order, for standing up production for the first time:

1. **Provision the host(s)** per `docs/ops/server-setup-guide.md` (Ubuntu 24
   LTS, Node 22, PM2 or Docker installed per your chosen path).
2. **Set up the reverse proxy** per `docs/ops/nginx-guide.md`, including a
   real domain and TLS cert (replace the placeholder `example.com` in
   `deploy/nginx/body-tracker.conf`).
3. **Choose Path A or Path B** (PM2 vs. Docker) for this environment and
   follow `docs/ops/pm2-guide.md` or `docs/ops/docker-guide.md` accordingly.
4. **Clone the repo to `/srv/body-tracker`** on the target host (or update
   `deploy.yml`'s `cd` path if using a different location) and do one manual
   `npm ci && npm run build` to confirm the build works on that host.
5. **Set real environment variables** on the host (`BTK_JWT_SECRET`, and
   once the Postgres/Redis-backed store lands, `DATABASE_URL`/`REDIS_URL`) —
   never hardcoded into `ecosystem.config.js` or committed anywhere.
6. **Start the app once manually** to confirm it comes up:
   `pm2 start ecosystem.config.js --env production && pm2 save`.
7. **Confirm health locally on the host**:
   `curl -f http://127.0.0.1:3045/api/v1/health/ready`.
8. **Create the `staging` and `production` GitHub Environments** in repo
   Settings, and add `STAGING_HOST`/`PRODUCTION_HOST`/`DEPLOY_USER`/
   `DEPLOY_SSH_KEY` as Environment-scoped secrets for each.
9. **Add required reviewers to the `production` Environment** — this is the
   manual-approval gate for `deploy-production`; without it, a
   `workflow_dispatch` to production deploys immediately, unreviewed.
10. **Merge to `main` and confirm CI is green**, then confirm
    `deploy-staging` ran automatically and `https://staging.<domain>/api/v1/health/ready`
    responds `200`.
11. **Dispatch a production deploy manually**
    (`workflow_dispatch`, `target: production`), approve it as the
    designated reviewer, and confirm
    `https://<domain>/api/v1/health/ready` and `/api/v1/status` both look
    correct.
12. **Set up monitoring** per the alert rules in
    `deploy/monitoring/alerts.yml` (see `docs/ops/monitoring-guide.md`) so
    you find out about problems before a customer does.
13. **Confirm the rollback path works** by reading
    `docs/ops/disaster-recovery-guide.md` and dry-running
    `scripts/rollback.sh --help`-equivalent understanding — don't discover
    how rollback works for the first time during a real incident.
14. **Tag a first release** (`git tag v1.0.0 && git push origin v1.0.0`) if
    you also want a versioned image in GHCR for the Docker path.
