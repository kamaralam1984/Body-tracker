# Troubleshooting Guide

A symptom → diagnosis → fix runbook for operating Body Tracker's Phase 14 API platform (`/api/v1/*`) in production. Every behavior described here was verified by reading the actual route handlers, not guessed.

## Quick reference — error envelope and codes

Every API response follows one of two shapes (`src/server/http/respond.ts`):

Success:

```json
{ "data": { ... }, "meta": { "traceId": "..." } }
```

Error:

```json
{ "error": { "code": "...", "message": "...", "details": null }, "meta": { "traceId": "..." } }
```

`error.code` is always one of (`src/server/http/errors.ts`):

| code               | HTTP status |
| ------------------ | ----------- |
| `bad_request`      | 400         |
| `validation_error` | 422         |
| `unauthorized`     | 401         |
| `forbidden`        | 403         |
| `not_found`        | 404         |
| `conflict`         | 409         |
| `rate_limited`     | 429         |
| `internal_error`   | 500         |

Every single response — success or error — also carries a `meta.traceId` (a fresh UUID minted per request), and every response gets an `X-Request-Id` header (a UUID set in `src/proxy.ts`, distinct from `traceId`). Keep both handy; see "Where do I find a specific failed request" below.

---

## Symptom: API returns 401 or 403

**401 (`unauthorized`)** and **403 (`forbidden`)** mean different things here — don't conflate them:

- `401 unauthorized` = "I don't know who you are" (missing, malformed, expired, or revoked credential).
- `403 forbidden` = "I know who you are, but you're not allowed to do this" (valid credential, insufficient scope).

### Diagnosis steps

1. **Check the `Authorization` header format.** `resolvePrincipal()` (`src/server/http/principal.ts`) accepts exactly two schemes and nothing else:
   - `Authorization: Bearer <jwt>` — a user access token from `/api/v1/auth/login` or `/api/v1/auth/refresh`.
   - `Authorization: ApiKey <key>` — an API key from `/api/v1/api-keys`.

   Anything else (missing header, wrong scheme name, extra whitespace mangling the split) throws `unauthorized("Missing Authorization header — use \`Bearer <token>\` or \`ApiKey <key>\`")`. If you see that exact message, the header isn't being sent in the form the server expects — check for a lowercased scheme, a missing space after `Bearer`/`ApiKey`, or the token being sent as a query param instead of a header on a route that doesn't support that (the tracking SSE stream is the one exception — see below).

2. **Check token/key expiry.**
   - Access tokens (`Bearer`) are short-lived: **15 minutes** (`ACCESS_TOKEN_TTL_SECONDS = 15 * 60` in `src/server/auth/tokens.ts`). `verifyAccessToken()` rejects anything past `exp` with a plain `null`, which surfaces as `unauthorized("Invalid or expired access token")`. If a client hasn't refreshed in >15 minutes, this is expected, not a bug — call `/api/v1/auth/refresh` with the refresh token to get a new access token.
   - API keys can also expire (`ApiKey.expiresAt`) or be revoked (`status !== "active"`) — both throw `unauthorized("Invalid or revoked API key")` or `unauthorized("API key expired")` respectively. Check `GET /api/v1/api-keys` to see a key's current `status` and `expiresAt`.

3. **Check role scopes if you're getting 403, not 401.** Every route calls `requireScope(principal, "<scope>")` after resolving the principal; a valid credential with the wrong scope throws `forbidden("Missing required scope: <scope>")` — that exact message tells you precisely which scope was missing, which is the fastest way to diagnose this. Cross-check what scopes a role actually carries by querying:

   ```bash
   curl -H "Authorization: Bearer <token>" \
     https://your-host/api/v1/organizations/<orgId>/roles
   ```

   This returns each role's `defaultScopes`. Enforcement itself lives in `ROLE_SCOPES` in `src/server/http/principal.ts` — `owner` and `admin` get every scope; `manager` gets everything except `organizations:write`; `viewer` is read-only across the board; `member` sits in between (see the scope-gap story below).

   For API-key auth, the scopes that matter are whatever was set on the key at creation time (`POST /api/v1/api-keys` body's `scopes` array), not the owning user's role — a key can be deliberately scoped narrower than its owner.

### A real example: the `member` role scope gap

During integration testing of this platform, the real test suite caught the `member` role initially missing `users:write`, `api-keys:read`/`api-keys:write`, and `webhooks:read`/`webhooks:write` in `ROLE_SCOPES` — a `member` could track sessions and read analytics but got an unexpected 403 the moment they tried anything API-key or webhook related, which wasn't the intended behavior for that role. This was caught by an integration test asserting `member`-role requests to those endpoints should succeed, failing with 403 instead — a good example of test-driven discovery of an authz gap, not a hypothetical. It was fixed by adding those scopes to `ROLE_SCOPES` in `src/server/http/principal.ts`, which is the actual source of truth enforced on every request.

**Operational note:** the `/api/v1/organizations/{id}/roles` endpoint returns a separate, hand-maintained descriptor table (`ROLE_DESCRIPTORS` in `src/server/services/organizations-service.ts`) meant to mirror `ROLE_SCOPES` for documentation purposes. If you ever see a 403 for a scope that `/roles` claims a role should have (or vice versa), trust actual request behavior — `ROLE_SCOPES` in `principal.ts` is what's enforced — and treat `/roles`'s output as reference text that can drift out of sync if the two aren't updated together. Worth a periodic diff between the two tables.

---

## Symptom: API returns 429

`429` is always `error.code: "rate_limited"`, thrown by `checkRateLimit()` in `src/server/http/rate-limit.ts` when a caller exceeds their window.

### Diagnosis steps

1. **Read the rate-limit headers** — every authenticated response (success _and_ error) carries them, set from `rateLimitHeaders()`:

   ```
   X-RateLimit-Limit: 120
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1732400000
   ```

   `X-RateLimit-Reset` is a Unix timestamp (seconds) for when the current window rolls over. `Remaining` hitting 0 right before a 429 confirms the limiter, not something else, is the cause.

2. **Know the limits.** This is an in-memory sliding-window limiter, keyed per caller:
   - Bearer-token (user) callers: **600 requests / 60 seconds**, keyed by `user:<userId>`.
   - API-key callers: a **per-key configurable** limit, keyed by `apikey:<keyId>` — defaults to **120 requests/60 seconds** if not set at creation (`rateLimitPerMinute` in the `POST /api/v1/api-keys` body), but can be set higher or lower per key.

3. **The 429 error body includes `retryAfterMs`** in `error.details` — use that instead of guessing a backoff.

4. **Remember this is per-process, in-memory state** (`src/server/http/rate-limit.ts`'s comment notes this is a stand-in for a Redis-backed limiter). In a PM2 cluster-mode or multi-container deployment, each worker/replica tracks its own window independently — so the _effective_ limit for a caller hitting a load-balanced pool of N workers is closer to `limit × N` in the worst case, not the documented per-caller number. If you see 429s firing later (or less consistently) than the documented limit suggests, check how many app processes/replicas are actually running.

### Fix

Client-side: back off using `X-RateLimit-Reset` or `retryAfterMs`, and batch/cache requests where possible. Server-side: bump `rateLimitPerMinute` on the specific API key (rotate isn't required — this requires a direct data change today, as there's no PATCH-scopes-only endpoint; see the administrator guide for the current API-key management surface) or raise the flat 600/60s bearer-token limit in `principal.ts` if legitimate traffic patterns require it.

---

## Symptom: SSE stream seems stuck / no events arriving

This is the single most likely "is it a bug or is it the host" scenario you'll hit operating this platform, and it has a real, previously-diagnosed root cause worth understanding before you start debugging the route code.

### Background: how the stream actually works

`GET /api/v1/tracking/{sessionId}/stream` (`src/app/api/v1/tracking/[sessionId]/stream/route.ts`) is a real Server-Sent-Events endpoint. It authenticates via `Authorization: Bearer <jwt>` **or** a `?access_token=<jwt>` query param (the query-param fallback exists specifically because browsers' native `EventSource` API cannot set custom headers — this route deliberately bypasses the shared `resolvePrincipal()` header-only helper to support it, without loosening auth anywhere else). Once connected, it runs a `setInterval` every **1000ms** that polls the in-memory event store for new events on that session, writes any new ones as `data: ...` frames, sends a `event: ping` heartbeat every 15 ticks (~15s), and closes with `event: closed` once the session's status flips to `completed`.

The critical detail: **this is a timer-driven poll, not a push.** New events only get flushed to the client on the next `setInterval` tick. If the Node event loop is delayed — for any reason — event delivery is delayed by exactly that much, because the timer itself can't fire on schedule.

### A real incident, and how it was actually diagnosed

On this platform's own dev/test host — a shared, multi-tenant machine — the stream was observed to "hang" under a tight test timeout. Load average was independently observed at 6.5–9 on a 4-core box, caused entirely by _other, unrelated tenants'_ processes on the same host suddenly spinning up — nothing to do with Body Tracker's own code. That CPU contention delayed the Node event loop, which delayed the `setInterval` tick, which delayed event delivery — exactly the mechanism above.

This was proven to **not** be a route bug via multiple independent checks, all of which succeeded under normal (non-contended) load:

- Raw `curl -N` directly against the app, bypassing any proxy.
- The same request routed through the real Nginx reverse proxy (`deploy/nginx/body-tracker.conf`'s `/api/v1/tracking/` location block, which correctly sets `proxy_buffering off`, `proxy_cache off`, and a 1-hour `proxy_read_timeout` specifically for this route).
- The browser-based API Explorer at `/docs/api-explorer`, using a real `EventSource` connection.

All three worked correctly once host load returned to normal. The fix was not a code change — it was recognizing host contention as the cause.

### Diagnosis steps (use this order)

1. **Check whether the app itself is responsive at all.** Hit a fast, unrelated endpoint:

   ```bash
   curl -w "\n%{time_total}s\n" http://localhost:3000/api/v1/health
   ```

   `/api/v1/health` does zero dependency checks — it's about as close to "is the event loop even scheduling callbacks" as you can get. If this is also slow, the problem is host-wide or process-wide, not specific to the SSE route — stop looking at `stream/route.ts` and go to step 3.

2. **Check `/api/v1/status` for uptime and memory.**

   ```bash
   curl http://localhost:3000/api/v1/status
   ```

   Look at `uptimeSeconds` (did the process just restart, losing in-memory session state?) and `memory.rssMb`/`memory.heapUsedMb` (is the process under memory pressure, which can also cause GC pauses that look like "hangs"?).

3. **If you have host shell access, check load average directly:**

   ```bash
   uptime
   # or
   cat /proc/loadavg
   ```

   A 1-minute load average significantly above the core count (e.g. >4 on a 4-core box) sustained over the period you saw the "hang" is a strong signal of host contention, especially on shared/multi-tenant hosts — compare against `nproc` for the actual core count.

4. **Bypass the proxy and test the route directly with `curl -N`** (the `-N` disables curl's own output buffering, which matters for streaming responses):

   ```bash
   curl -N -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/tracking/<sessionId>/stream
   ```

   You should see a `data: ...` frame within ~1s of any new event on that session, and an `event: ping` heartbeat at least every ~15s even with no session activity. If heartbeats themselves are delayed beyond what host load can explain, _now_ it's worth looking at the route code. If heartbeats are on time but session events aren't appearing, check that events are actually being written to the session (e.g. via `POST /api/v1/tracking/{sessionId}/rep`) — the stream only ever surfaces what's already in the store.

5. **Confirm via the real Nginx layer** if the client normally goes through it — `deploy/nginx/body-tracker.conf` already sets `proxy_buffering off` for `/api/v1/tracking/`, which is required for SSE; if someone has since edited that config and re-enabled buffering, Nginx itself will hold frames until a buffer fills, which looks identical to a stuck stream from the client's point of view. `nginx -T | grep -A5 'location /api/v1/tracking'` to confirm the live config still matches.

### The decision rule

- **Other fast endpoints (`/api/v1/health`) are also slow** → host-wide problem (CPU contention, memory pressure, noisy neighbors on a shared box). Not a code bug. Check `uptime`/`load average`, and on shared infrastructure, check what else is running.
- **Only the stream is slow, everything else is fast, and heartbeats (`event: ping`) are on time** → the stream is working correctly, just waiting for actual session events; check that events are being produced.
- **Only the stream is slow and even heartbeats are late** → now worth actually reading `stream/route.ts` for a real regression (e.g. an unhandled exception inside the `setInterval` callback silently stalling it — none is currently known, but this is the one class of check that would actually implicate the route itself).

---

## Symptom: Report download returns 409

`GET /api/v1/reports/{id}/download` (`src/app/api/v1/reports/[id]/download/route.ts`) throws `conflict("Report is not ready yet")` — HTTP 409 — whenever the report's `status` isn't `"ready"`.

### Diagnosis steps

1. **Check the report's status before downloading:**

   ```bash
   curl -H "Authorization: Bearer <token>" \
     https://your-host/api/v1/reports/<reportId>
   ```

   `status` will be one of `"queued"`, `"generating"`, `"ready"`, or `"failed"`. Only `"ready"` will succeed on `/download`.

2. **If stuck on `"queued"`/`"generating"`**, this is a generation-pipeline issue upstream of the download endpoint itself — that's a separate code path from `download/route.ts`, which only ever reads `report.status`, it doesn't drive report generation forward.

3. **If `"failed"`**, the download will keep 409ing — a failed report needs to be regenerated (create a new report request), not retried against the same `id`.

4. Note: even a `"ready"` report can hit a brief server-side regeneration if the in-memory content cache was cleared (e.g. by a dev-server restart) — the download route deterministically rebuilds the same bytes from the underlying analytics snapshots in that case, so this is transparent and doesn't itself cause a 409; only `status` gates the response.

---

## Symptom: Deploy succeeded but app won't start (or starts but serves broken pages)

This is a genuinely easy-to-forget gotcha with Next.js's `output: "standalone"` build mode (set in `next.config.ts`), and it bites the bare-metal/PM2 deploy path more often than Docker because Docker's `Dockerfile` already does the right thing for you.

### What's actually happening

`next build` with `output: "standalone"` produces `.next/standalone/` — a self-contained `server.js` plus a trimmed `node_modules`. Critically, **it does not automatically include `.next/static/` or the top-level `public/` directory.** Those have to be copied in manually. If they're missing:

- `node .next/standalone/server.js` will often still start and listen on the configured port — so "the process is running" doesn't mean "the app works."
- Every request for a JS/CSS chunk under `/_next/static/...` or any file that lived in `public/` (images, favicons, etc.) 404s, because those paths simply don't exist inside the standalone output on their own.
- The end-user experience is a blank/unstyled page, broken images, or a client-side hydration failure — not a clean "won't start" crash, which makes this easy to misdiagnose as a code bug.

The reference implementation is `Dockerfile`, which gets this right:

```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
```

Three separate `COPY` lines, on purpose — the standalone directory, then `.next/static`, then `public`, each landing in the exact relative path `server.js` expects at runtime.

### Diagnosis steps

1. Confirm the process is actually up: `curl -w "%{http_code}" http://localhost:<port>/api/v1/health` — a `200` with `{"status":"ok",...}` means the Node process itself is fine.
2. Load the actual app in a browser (or `curl -I` a page route) and check dev tools' Network tab (or curl status codes) for `/_next/static/...` requests. A wave of 404s there is the signature of this exact issue.
3. On the PM2/bare-metal path specifically, check that the deploy script copied `.next/static` and `public/` into `.next/standalone/` (or wherever `ecosystem.config.js`'s `script: ".next/standalone/server.js"` and `cwd` expect to find them) — this step is trivial to skip because `npm run build` succeeds regardless of whether you remembered the copy, and PM2 will happily start the process either way.

### Fix

Make sure your deploy script (or PM2 deploy hook) includes, after `npm run build`:

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

adjusted for wherever your PM2 `cwd`/`script` actually point relative to the build output. If deploying via Docker, this is already handled by `Dockerfile` — this failure mode is specific to manual/scripted bare-metal deploys that reimplement the copy step themselves.

---

## Symptom: Where do I find a specific failed request

Two independent correlation IDs exist for exactly this purpose — use both together:

1. **`X-Request-Id` response header** — set on _every_ response, including non-API pages, by `src/proxy.ts` (`response.headers.set("X-Request-Id", crypto.randomUUID())`). This is the one to hand a user reporting a bug ("what does the response header say?") or to grep for in Nginx access logs if you've configured Nginx to log it (add `$upstream_http_x_request_id` to a custom `log_format` if not already present).

2. **`meta.traceId`** — present in the JSON body of every `/api/v1/*` response, success or error (`src/server/http/respond.ts`'s `ok()`/`errorResponse()` both mint one). This is the one that shows up in **app-side logs**: unhandled errors are logged server-side as `[api] unhandled error trace=<traceId>` (see `errorResponse()`), so grepping PM2/container logs for that string finds the exact stack trace for a given failed request.

**Note these are two different IDs, minted independently** — `X-Request-Id` is set once per request in `proxy.ts` regardless of what the route does; `traceId` is minted fresh inside `respond.ts` for the JSON body. They will _not_ match each other. If a user reports "my request failed" and can only give you one of the two, that's still enough — just make sure you're grepping the right log source for the ID you actually have (Nginx access logs for `X-Request-Id`, PM2/app logs for `traceId`).

### Practical correlation workflow

1. Get the failing response's `meta.traceId` from the client (e.g. shown in an error toast, or from the raw response body if you have it) or the `X-Request-Id` header (from browser dev tools' Network tab, or a proxy log line).
2. If you have `traceId`: `grep 'trace=<traceId>'` across PM2 logs (`logs/pm2/error.log`, `logs/pm2/out.log` per `ecosystem.config.js`) or `docker compose logs app` for the Docker path, to find the exact unhandled-error log line and stack trace, if the failure was a 500.
3. If you have `X-Request-Id`: grep Nginx's access log for it (requires it to be part of your `log_format` — it isn't in the default Nginx `combined` format, so this needs to be added explicitly if you want this workflow to work end-to-end) to find the exact request line — method, path, status, timing — as seen at the edge.
4. Cross-reference timestamps between the two log sources if you only have one ID and need to find the other — both logs are timestamped close to the actual request time.
