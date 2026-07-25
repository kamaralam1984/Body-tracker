# Disaster Recovery Guide

A real incident-response playbook: how you'd find out something is wrong,
how to check health fast, how to roll back a bad deploy, how to restore from
a database backup in an emergency, and two realistic incident walkthroughs.

## How you'd find out

`deploy/monitoring/alerts.yml` defines the real Prometheus alert rules,
loaded by `deploy/monitoring/prometheus.yml`, paired with a real
Alertmanager instance (not included in this repo — see
`docs/ops/monitoring-guide.md` for wiring Slack/PagerDuty/email receivers).

Alerts that are real and scrapeable **today** from `/api/v1/metrics`:

| Alert                      | Fires when                                                                           | Severity |
| -------------------------- | ------------------------------------------------------------------------------------ | -------- |
| `BodyTrackerAppDown`       | `up{job="body-tracker-app"} == 0` for 1m — Prometheus can't scrape `/api/v1/metrics` | critical |
| `BodyTrackerHighErrorRate` | >5% of requests are 5xx over 5m                                                      | warning  |
| `BodyTrackerHighMemory`    | RSS > 900MB for 5m (past PM2's 512M-per-worker `max_memory_restart` ceiling)         | warning  |
| `BodyTrackerRecentRestart` | process uptime < 60s (deploy just happened, or a crash)                              | info     |

Alerts that need companion exporters this repo doesn't bundle (real,
standard Prometheus exporters that run outside the app):

| Alert                 | Requires            | Fires when                                                                                                                           |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `HostDiskAlmostFull`  | `node_exporter`     | <10% free space on `/`                                                                                                               |
| `HostHighCPU`         | `node_exporter`     | sustained >90% CPU for 10m — explicitly noted as a cause of delayed timer-driven long-lived connections (see the SSE incident below) |
| `HostHighMemory`      | `node_exporter`     | >90% host memory used for 10m                                                                                                        |
| `SslCertExpiringSoon` | `blackbox_exporter` | TLS cert expires within 14 days — usually means Certbot's renewal timer itself is broken                                             |
| `SiteUnreachable`     | `blackbox_exporter` | public HTTPS probe fails for 2m                                                                                                      |

## Fast health checks

Four endpoints, in order of how much you'd trust them mid-incident:

```bash
# 1. Liveness — always fast, no dependency checks. If this hangs or times
#    out, the process itself is the problem (or the network path to it).
curl -s https://<host>/api/v1/health

# 2. Readiness — checks env config and that the data layer is initialized.
#    Returns HTTP 503 (not just a bad body) if unready. This is the one
#    deploy.yml and rollback.sh both check post-deploy.
curl -s -o /dev/null -w "%{http_code}\n" https://<host>/api/v1/health/ready
curl -s https://<host>/api/v1/health/ready | jq   # see which check failed

# 3. Operational snapshot — uptime, memory, request metrics, per-entity
#    data-store record counts. Low uptimeSeconds means a recent
#    restart/deploy/crash; check memory.rssMb against the 512M PM2 ceiling.
curl -s https://<host>/api/v1/status | jq

# 4. Prometheus text-exposition metrics — same data as /status plus
#    btk_http_requests_total broken down by status_class, for spotting a
#    5xx spike directly.
curl -s https://<host>/api/v1/metrics
```

`/api/v1/health/ready`'s response shape:

```json
{ "ready": true, "checks": { "env": { "ok": true }, "dataStore": { "ok": true } } }
```

If `ready: false`, the `checks` object tells you which check failed and why
(`detail` field) — that's usually your fastest signal of _what kind_ of
problem you have (config vs. data-layer) before touching anything else.

## Rolling back a bad deploy: `scripts/rollback.sh`

Run **on the target server** (not in CI) after a bad deploy to PM2/bare-metal
hosts.

```bash
./scripts/rollback.sh [git-ref]
```

`git-ref` defaults to `HEAD~1` — "undo the last deploy." Pass an explicit
tag or SHA to roll back further.

What it does, step by step:

1. Records the current deployed commit (`git rev-parse HEAD`) so it can tell
   you how to roll forward again afterward.
2. `git fetch origin && git reset --hard "$TARGET_REF"` — hard-resets the
   working tree to the target ref. **This discards any uncommitted local
   changes on the server** (there shouldn't be any on a properly-deployed
   host, but be aware).
3. Rebuilds at the rolled-back commit: `npm ci && npm run build`.
4. Re-copies static assets into the standalone build (same gotcha as
   `deploy.yml`): `cp -r .next/static .next/standalone/.next/static` and
   `cp -r public .next/standalone/public`.
5. `pm2 reload ecosystem.config.js --env production` — zero-downtime,
   one-worker-at-a-time reload.
6. Waits 3s, then verifies: `curl -f
http://127.0.0.1:${PORT:-3045}/api/v1/health/ready`.
7. Prints the previously-deployed commit SHA and the exact command to roll
   **forward** again once the underlying issue is fixed:
   ```bash
   git reset --hard <previous-sha> && npm run build && pm2 reload ecosystem.config.js
   ```

Because `rollback.sh` uses the same build-and-reload shape as `deploy.yml`,
rolling back is not a special/risky code path — it's the identical deploy
mechanism pointed at an older ref, which is exactly why it's trustworthy
under pressure.

Note this script covers the **Path A (PM2 bare-metal)** deployment only. For
the Docker path, "rollback" means re-deploying the previous image tag from
GHCR (see `docs/ops/production-deployment-guide.md` and
`.github/workflows/release.yml` for how versioned tags are produced) via
whatever orchestrator you're running — there's no Docker-specific rollback
script in this repo today.

## Restoring from a database backup

For data-loss scenarios (not "the app is broken," but "the data itself is
wrong or gone") once the app is on the real Postgres-backed store: see
`docs/ops/restore-guide.md` for the full walkthrough of
`scripts/restore-db.sh`. In short — it's destructive
(`gunzip | psql "$DATABASE_URL"`, overwriting the target database, with a
5-second Ctrl+C abort window), supports encrypted backups produced by
`scripts/backup-db.sh` (transparently decrypts `.enc` files given
`BACKUP_ENCRYPTION_KEY`), and should be treated as a last resort after
confirming a bad deploy/rollback isn't the actual cause — restoring from
backup loses everything written since that backup's timestamp.

## Incident walkthrough 1: bad deploy causing a 5xx spike

**Symptom**: `BodyTrackerHighErrorRate` fires, or you notice
`btk_http_requests_total{status_class="5xx"}` climbing via `/api/v1/metrics`
shortly after a deploy.

1. **Confirm it's deploy-related, not a slow burn.** Check
   `/api/v1/status`'s `uptimeSeconds` — if it's small, a deploy (or crash
   loop) just happened. Cross-check against the deploy timeline in the
   `Deploy` workflow's run history in GitHub Actions.
2. **Check readiness immediately**:
   `curl -s https://<host>/api/v1/health/ready | jq` — if `ready: false`,
   the `checks` block tells you whether it's an env/config problem or a
   data-layer problem introduced by the new code.
3. **Don't spend time debugging in production.** The fastest safe action is
   almost always to roll back first, root-cause after:
   ```bash
   ssh <deploy-user>@<host>
   cd /srv/body-tracker
   ./scripts/rollback.sh          # defaults to HEAD~1 — "undo the last deploy"
   ```
4. **Verify the rollback worked**: the script's own final `curl -f
.../health/ready` check will fail loudly (`set -euo pipefail`) if it
   didn't. Follow up manually with `/api/v1/status` and a spot-check of
   `/api/v1/metrics`'s `status_class="5xx"` counter trend.
5. **Root-cause offline**, against the rolled-back-from commit, in a
   non-production environment (staging, or local).
6. **Roll forward once fixed**, using the exact command `rollback.sh`
   printed: `git reset --hard <bad-sha> && npm run build && pm2 reload
ecosystem.config.js` — but only after the fix has gone through CI
   (`ci.yml`) and, ideally, a staging deploy first.

## Incident walkthrough 2: host CPU contention causing slow responses (not a bug)

**Symptom**: requests — especially the tracking SSE stream — feel slow or
laggy, but nothing looks structurally broken: no errors, no 5xx, no failed
health checks.

This is a real, previously-observed scenario worth knowing by name, because
it's easy to mistake for an application bug and go debugging the wrong
layer. During development, the timer-driven (`setInterval`-based) tracking
SSE stream showed a reproducible response delay. It was confirmed **not**
to be a code bug via three independent verification methods, all of which
worked correctly under normal load:

- Direct `curl` against the app
- Through the Nginx proxy
- Via the browser-based API Explorer

The actual cause was host-level: the development host was a **shared,
multi-tenant machine**, observed at a **load average of 6.5–9 on a 4-core
box**, driven by unrelated processes. A CPU-starved host starves Node's
event loop, which delays anything timer-driven — a `setInterval` feeding a
long-lived SSE connection is exactly the kind of thing that degrades first
and most visibly under this condition, since each tick has to wait its turn
for CPU time the OS scheduler isn't reliably giving it.

**How to diagnose this vs. an actual app bug**, step by step:

1. **Check `/api/v1/status`** — `uptimeSeconds` and `memory.rssMb`. If
   uptime is long and memory is stable (not climbing), it's not a leak or
   crash-loop.
2. **Check host-level load, not just app-level metrics**:
   ```bash
   uptime          # load average — compare to core count (nproc)
   top -bn1 | head -20
   vmstat 1 5
   ```
   A load average significantly above the core count (e.g. 6.5–9 on 4
   cores) is a strong signal of host contention, especially if the app's
   own process isn't the one consuming the CPU (check `top`'s per-process
   breakdown — if unrelated processes dominate, that confirms it's not this
   app's workload causing its own slowdown).
3. **Reproduce against the app directly, bypassing the proxy**, to rule out
   Nginx as the bottleneck: `curl` the endpoint directly against
   `127.0.0.1:3045` and compare timing to going through the public domain.
   If both are equally slow, the proxy isn't the cause.
4. **Run `scripts/load-test.mjs` and compare against a known-good
   baseline** run on an uncontended host — a sudden regression in p95/p99
   latency with no corresponding error-rate increase is consistent with
   host contention rather than an app-level bug (see
   `docs/ops/scaling-guide.md` for the full note on why load-test numbers
   must come from the real, dedicated target host to mean anything).
5. **Distinguish from a real bug**: an app bug would typically show up as
   errors, a specific endpoint being slow while others are fine, or memory
   climbing. Host contention shows up as _uniformly_ elevated latency across
   otherwise-healthy, error-free requests, correlated with host-level load
   average rather than anything in the app's own request/error metrics.
6. **Remediate**: this isn't something you fix in the app. Move to a
   dedicated host or a cloud instance with guaranteed (not burstable/shared)
   CPU. If staying on a shared host is unavoidable short-term, pinning
   `ecosystem.config.js`'s `instances` to fewer than `"max"` can leave
   headroom for other tenants' processes, but that only reduces contention,
   it doesn't eliminate it as a production strategy.

The operational lesson: **when something is slow but nothing is actually
failing, check host-level CPU contention before assuming an app bug** —
`uptime`/`top`/`vmstat` and a load-test comparison are faster and more
conclusive than reading application code under pressure.
