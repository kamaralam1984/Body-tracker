# Monitoring Guide

How to stand up the optional Prometheus + Grafana overlay for Body Tracker, what the app's own `/api/v1/metrics` endpoint exposes today, and how to work through the real alert rules that ship with it.

## What's real here

Everything in this guide is live and testable today, with one honest gap called out below (no pre-built Grafana dashboard JSON yet). Specifically:

- `GET /api/v1/metrics` (`src/app/api/v1/metrics/route.ts`) — a real Prometheus text-exposition-format endpoint. Process metrics come from Node's own `process` API; the request counters are the same ones every route increments via `src/server/http/respond.ts`'s `ok()`/`errorResponse()` helpers (through `src/server/http/metrics.ts`'s `recordRequest()`); the data-store gauges reflect the real in-memory store sizes.
- `deploy/monitoring/prometheus.yml` — a real scrape config that polls that endpoint.
- `deploy/monitoring/alerts.yml` — real alert rules, three groups, with a genuine split between "works today" and "needs an exporter you haven't installed yet."
- `docker-compose.monitoring.yml` — a real optional Compose overlay (Prometheus + Grafana) that wires the above together and pre-provisions Grafana's datasource.

## 1. Standing up the overlay

The monitoring stack is an _overlay_ — it's not part of the base `docker-compose.yml` deployment, so the app runs fine without it. Bring it up by layering both compose files:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

This starts two additional services on top of the normal app stack:

| Service      | Image                    | Port                               | Config source                                                                          |
| ------------ | ------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `prometheus` | `prom/prometheus:latest` | `9090`                             | `deploy/monitoring/prometheus.yml` + `deploy/monitoring/alerts.yml`, mounted read-only |
| `grafana`    | `grafana/grafana:latest` | `3001` (host) → `3000` (container) | `deploy/monitoring/grafana/provisioning/`, mounted read-only                           |

Prometheus's scrape config (`deploy/monitoring/prometheus.yml`) targets the app container directly on the Docker Compose network:

```yaml
scrape_configs:
  - job_name: body-tracker-app
    metrics_path: /api/v1/metrics
    static_configs:
      - targets: ["app:3000"]
```

`app:3000` resolves via Compose's internal DNS to the `app` service defined in `docker-compose.yml` — this only works when both compose files are up together on the same network, which is exactly what the command above does.

Prometheus also scrapes itself (`job_name: prometheus`, target `localhost:9090`) so its own health shows up in the same instance.

Once running:

- Prometheus UI: `http://<host>:9090` — useful for running ad-hoc PromQL queries and checking the **Status → Targets** page (confirm `body-tracker-app` shows `UP`).
- Grafana UI: `http://<host>:3001` — pre-provisioned with Prometheus as its default datasource (`deploy/monitoring/grafana/provisioning/datasources/prometheus.yml`, pointed at `http://prometheus:9090`). No manual datasource setup required.

To tear it down without touching the base app stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml down
```

(Add `-v` if you also want to drop the `prometheus_data`/`grafana_data` volumes and lose scrape history / dashboard edits.)

## 2. Sanity-check `/api/v1/metrics` directly with curl

Before wiring up Grafana, it's worth confirming the metrics endpoint itself is producing sane output — this rules out "Grafana is misconfigured" vs. "the app isn't exposing what I expect."

```bash
curl -s http://localhost:3000/api/v1/metrics
```

Expected shape (real metric names, read straight from `src/app/api/v1/metrics/route.ts` — these are the _exact_ names Prometheus will scrape, so use them verbatim in any PromQL you write):

```
# HELP btk_process_uptime_seconds Process uptime in seconds.
# TYPE btk_process_uptime_seconds gauge
btk_process_uptime_seconds 1234.567

# HELP btk_process_resident_memory_bytes Resident set size in bytes.
# TYPE btk_process_resident_memory_bytes gauge
btk_process_resident_memory_bytes 123456789

# HELP btk_process_heap_used_bytes V8 heap used in bytes.
# TYPE btk_process_heap_used_bytes gauge
btk_process_heap_used_bytes 87654321

# HELP btk_http_requests_total Total HTTP requests handled, by status class.
# TYPE btk_http_requests_total counter
btk_http_requests_total{status_class="2xx"} 412
btk_http_requests_total{status_class="4xx"} 9
btk_http_requests_total{status_class="5xx"} 0

# HELP btk_datastore_records Records currently held per entity in the data store.
# TYPE btk_datastore_records gauge
btk_datastore_records{entity="organizations"} 3
btk_datastore_records{entity="users"} 18
btk_datastore_records{entity="tracking_sessions"} 42
btk_datastore_records{entity="reports"} 7
btk_datastore_records{entity="webhooks"} 2
btk_datastore_records{entity="api_keys"} 4
```

Notes on what you're looking at:

- `btk_http_requests_total` only has label values for status classes that have actually occurred since process start (`recordRequest()` in `src/server/http/metrics.ts` buckets by `Math.floor(status / 100)}xx`) — a freshly started process with no 5xx responses yet simply won't have a `status_class="5xx"` series at all. That's expected, not a bug; `sum(rate(...))` over an absent series is `0`/no data, which the alert expressions below are written to tolerate (see `BodyTrackerHighErrorRate`).
- `btk_datastore_records` reflects the real in-memory store (`src/server/db/store.ts`) — restart the app and these reset along with the store.
- If you get a connection refused instead of this output, the app isn't listening where you expect (wrong port, or you're curling the host while the metrics-scraping target should be the container's internal `app:3000` — those are two different addresses).

Once curl looks right, the exact same bytes are what Prometheus's `body-tracker-app` target will show as `UP` with a fresh scrape on its **Targets** page.

## 3. Alert rules — what fires today vs. what needs more setup

`deploy/monitoring/alerts.yml` defines three rule groups. Read the file directly for the authoritative expressions; the table below is a faithful summary.

### Group 1 — `body-tracker-app` (works today, zero extra setup)

These evaluate purely against `btk_*` metrics your app is already exposing, so they're live the moment the overlay is up and Prometheus has scraped once.

| Alert                      | Expression                                                                                                    | `for`  | Severity | Meaning                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BodyTrackerAppDown`       | `up{job="body-tracker-app"} == 0`                                                                             | `1m`   | critical | Prometheus has failed to scrape `/api/v1/metrics` for over a minute — the app is unreachable or down.                                                                                                                                                                          |
| `BodyTrackerHighErrorRate` | `sum(rate(btk_http_requests_total{status_class=~"5xx"}[5m])) / sum(rate(btk_http_requests_total[5m])) > 0.05` | `5m`   | warning  | More than 5% of requests returned 5xx over the trailing 5 minutes.                                                                                                                                                                                                             |
| `BodyTrackerHighMemory`    | `btk_process_resident_memory_bytes > 900 * 1024 * 1024`                                                       | `5m`   | warning  | RSS above 900MB for 5 minutes. Note: PM2's `max_memory_restart` (see `ecosystem.config.js`) is 512M _per worker_ — if this fires, a worker has leaked past its own PM2 restart threshold, which is itself worth investigating rather than just waiting for the alert to clear. |
| `BodyTrackerRecentRestart` | `btk_process_uptime_seconds < 60`                                                                             | (none) | info     | Process uptime under a minute — either a deploy just happened or the process crashed and got restarted. Cross-check deploy/PM2 logs to tell which.                                                                                                                             |

### Group 2 — `body-tracker-host` (requires `node_exporter`, not bundled)

These reference `node_*` metrics that only exist if you're separately running Prometheus's [`node_exporter`](https://github.com/prometheus/node_exporter) on the host and have added a scrape job for it to `deploy/monitoring/prometheus.yml`. Nothing in this repo installs or configures `node_exporter` — until you do, these rules are defined but will never fire (no matching series to evaluate).

| Alert                | Expression                                                                                       | `for` | Severity |
| -------------------- | ------------------------------------------------------------------------------------------------ | ----- | -------- |
| `HostDiskAlmostFull` | `node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1` | `10m` | critical |
| `HostHighCPU`        | `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90`           | `10m` | warning  |
| `HostHighMemory`     | `(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.9`                      | `10m` | warning  |

To enable this group: install `node_exporter` on the host (or run it as a sibling container), then add a scrape job for it to `deploy/monitoring/prometheus.yml`, e.g.:

```yaml
- job_name: node
  static_configs:
    - targets: ["node-exporter:9100"]
```

Worth doing early: `HostHighCPU` directly documents a real failure mode this platform has already hit — sustained host CPU contention delays timer-driven long-lived connections (the tracking SSE stream polls every ~1s via `setInterval`). See `docs/ops/troubleshooting-guide.md`'s "SSE stream seems stuck" section for the full story.

### Group 3 — `body-tracker-tls` (requires `blackbox_exporter`, not bundled)

These reference `probe_*` metrics produced by Prometheus's [`blackbox_exporter`](https://github.com/prometheus/blackbox_exporter), configured to probe `https://<your-domain>` with the `http_2xx`/`tls_connect` module. Also not installed or configured by this repo.

| Alert                 | Expression                                             | `for`  | Severity |
| --------------------- | ------------------------------------------------------ | ------ | -------- |
| `SslCertExpiringSoon` | `probe_ssl_earliest_cert_expiry - time() < 14 * 86400` | (none) | warning  |
| `SiteUnreachable`     | `probe_success{job="blackbox-https"} == 0`             | `2m`   | critical |

`SslCertExpiringSoon`'s own annotation is worth internalizing: Certbot should auto-renew well before 14 days out under normal operation, so if this fires, treat it as a sign the renewal timer/cron itself is broken — not just "renew now and move on."

### Honest summary

If you deploy the monitoring overlay as-is and do nothing else, you get real, working alerting on app-down, elevated error rate, high memory, and unexpected restarts — that's the whole `body-tracker-app` group. The `body-tracker-host` and `body-tracker-tls` groups are real, correctly written Prometheus rules, but they are inert until you install and wire up `node_exporter` and `blackbox_exporter` respectively. Nothing will silently fail — the rules just won't evaluate against any data.

Also note: none of this fires a notification anywhere by itself. `alerts.yml` defines _rules_; routing them to Slack/PagerDuty/email requires a real Alertmanager instance and receiver config, which is not included in this repo. Wiring that up is a reasonable next infrastructure step once the dashboards below exist.

## 4. Changing the default Grafana password

`docker-compose.monitoring.yml` sets Grafana's admin password from an environment variable with an insecure placeholder default:

```yaml
grafana:
  environment:
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-change-me}
```

**This defaults to the literal string `change-me` if `GRAFANA_ADMIN_PASSWORD` isn't set in your environment.** Treat this as insecure-by-default and never run the overlay on anything internet-reachable without overriding it. Before bringing the stack up:

```bash
export GRAFANA_ADMIN_PASSWORD="$(openssl rand -base64 24)"
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Or put `GRAFANA_ADMIN_PASSWORD=...` in a `.env` file at the repo root that Compose picks up automatically — just don't commit it. If you've already started Grafana with the default and are changing it after the fact, either recreate the container (`docker compose ... up -d --force-recreate grafana` after exporting the new value) or log in and change the password via Grafana's own admin UI, since the env var is only read on first initialization of the `grafana_data` volume.

`GF_USERS_ALLOW_SIGN_UP` is already set to `"false"`, so self-service account creation is off by default — the admin password is genuinely the only credential gate here.

## 5. Dashboards — a real, honest gap

Grafana's dashboard provisioner is already wired up (`deploy/monitoring/grafana/provisioning/dashboards/dashboards.yml`):

```yaml
providers:
  - name: body-tracker
    orgId: 1
    folder: "Body Tracker"
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /etc/grafana/provisioning/dashboards/json
```

It watches `/etc/grafana/provisioning/dashboards/json` inside the container — which maps to `deploy/monitoring/grafana/provisioning/dashboards/json/` on the host — and auto-loads (and auto-refreshes every 30s) any dashboard JSON files it finds there, into a "Body Tracker" folder in Grafana.

**As of this writing, that directory is empty. No dashboards are pre-built.** This is a real gap, not an oversight to work around — it's the next concrete piece of monitoring work for whoever picks this up:

1. Build dashboards in the Grafana UI (querying the `btk_*` metrics documented above — e.g. request rate by status class, RSS/heap over time, datastore record counts, uptime since last restart).
2. Export each as JSON (Grafana's dashboard settings → JSON Model, or the "Export" action).
3. Drop the exported file(s) into `deploy/monitoring/grafana/provisioning/dashboards/json/`.
4. Either wait up to 30s for the provisioner's next scan, or restart the `grafana` container to pick them up immediately.

Until then, `curl http://localhost:3000/api/v1/metrics` and the Prometheus UI's own graph/query tools (`http://<host>:9090/graph`) are the fastest way to look at these numbers.
