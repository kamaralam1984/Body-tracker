# Administrator Guide

This guide is for whoever operates Body Tracker day-to-day — managing organizations, members, roles, API keys, and webhooks — not for engineers writing code against the platform. Every endpoint and behavior below was verified by reading the actual route handlers in `src/app/api/v1/`.

Two ways to do everything described here:

- **Directly via the API** with `curl` (or any HTTP client), shown throughout this guide.
- **No-code, via the API Explorer** at `/docs/api-explorer` — a browser UI that lets you authenticate and call these same real endpoints (including the SSE tracking stream, via a real `EventSource` connection) without writing any code.

All requests below assume an `Authorization` header — either `Bearer <access-token>` (from `/api/v1/auth/login`) for a logged-in user, or `ApiKey <key>` for programmatic/service access. Every authenticated response also carries `X-RateLimit-Limit`/`X-RateLimit-Remaining`/`X-RateLimit-Reset` headers — see `docs/ops/troubleshooting-guide.md` if you start hitting `429`s while doing bulk administration.

---

## 1. Roles and what each can do

There are five roles, each with a fixed scope set enforced by `ROLE_SCOPES` in `src/server/http/principal.ts` — this is the actual, real authorization check applied to every request, not documentation-only:

| Role        | Can do                                                                                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **owner**   | Everything. Every scope (`organizations:*`, `users:*`, `sessions:*`, `tracking:*`, `analytics:read`, `reports:*`, `webhooks:*`, `api-keys:*`). Cannot be removed from an organization via the API (`DELETE .../members/{userId}` explicitly refuses with a 409 if the target is an owner). |
| **admin**   | Same full scope set as owner — manages members, teams, and organization settings with equivalent operational access.                                                                                                                                                                       |
| **manager** | Everything _except_ `organizations:write` — can run/manage sessions, tracking, reports, members, API keys, and webhooks, but cannot change organization-level settings (name, slug, plan).                                                                                                 |
| **member**  | Standard contributor: `sessions:read/write`, `tracking:read/write`, `analytics:read`, `reports:read/write`, `users:read/write`, and — since a real fix, described below — `api-keys:read/write` and `webhooks:read/write`. Cannot touch `organizations:*`.                                 |
| **viewer**  | Read-only across the board: `sessions:read`, `tracking:read`, `analytics:read`, `reports:read`, `users:read`, `api-keys:read`, `webhooks:read`. No write scopes at all.                                                                                                                    |

Check what a role can do at any time via the roles reference endpoint:

```bash
curl -H "Authorization: Bearer <token>" \
  https://your-host/api/v1/organizations/<orgId>/roles
```

This requires the `users:read` scope and returns each role's label, a human description, and a `defaultScopes` array.

### A real story: how the `member` scope gap was found and fixed

Worth knowing as background, because it's a good model for how to verify authorization changes here going forward: `member` originally did **not** have `users:write`, `api-keys:read`/`api-keys:write`, or `webhooks:read`/`webhooks:write` in `ROLE_SCOPES`. This meant a `member`-role user got an unexpected `403 forbidden` the moment they tried to manage their org's API keys or webhooks — access that role was actually meant to have. It wasn't caught by manual testing; it was caught by the platform's real integration test suite, which asserted that `member`-role requests to those endpoints should succeed and instead got 403s. The fix was adding the missing scopes to `ROLE_SCOPES` in `src/server/http/principal.ts` — the single place that governs actual request authorization.

**Operational takeaway:** the `/api/v1/organizations/{id}/roles` endpoint's output (`ROLE_DESCRIPTORS` in `src/server/services/organizations-service.ts`) is a separate, hand-maintained table meant to describe the same thing as `ROLE_SCOPES`, but it is not read from `ROLE_SCOPES` directly — as of this writing its `member` entry still doesn't list `api-keys:*`/`webhooks:*`, even though real requests with those scopes now succeed. If what `/roles` reports and what a role can actually do ever disagree, trust actual behavior (a live request), not the `/roles` description — and flag the mismatch for someone to sync the two tables.

---

## 2. Managing organizations, members, and roles

### Listing and inviting members

```bash
# List members of an organization (paginated)
curl -H "Authorization: Bearer <token>" \
  "https://your-host/api/v1/organizations/<orgId>/members?limit=20"

# Invite a new member
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"email":"new.person@example.com","name":"New Person","role":"member"}' \
  https://your-host/api/v1/organizations/<orgId>/members
```

Inviting requires `organizations:write` (so `owner`/`admin`/`manager` only — `member` and `viewer` cannot invite). New members are created with `status: "invited"` and a random temporary password hash server-side — there's no email-invite delivery mechanism in this endpoint itself, it only creates the record. You cannot invite a duplicate email into the same org — that returns `409 conflict`, "A member with this email already exists in the organization."

You can only manage members of **your own** organization — every one of these endpoints checks the `{id}` in the URL against the caller's own `orgId` and returns `403 forbidden` ("Cannot access another organization") otherwise. There's no cross-org admin escape hatch in this API.

### Changing a member's role or status, or removing them

```bash
# Change role / team / status
curl -X PATCH -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"role":"manager"}' \
  https://your-host/api/v1/organizations/<orgId>/members/<userId>

# Remove a member
curl -X DELETE -H "Authorization: Bearer <token>" \
  https://your-host/api/v1/organizations/<orgId>/members/<userId>
```

Both require `organizations:write`. Removing an `owner` is explicitly blocked (`409 conflict`, "Cannot remove the organization owner") — transfer ownership by changing the target's role away from `owner` first if you genuinely need to remove that account, or promote a different member to `owner` before removing the original.

---

## 3. API keys — create, rotate, revoke

API keys let a service/integration authenticate without a user's short-lived (15-minute) access token. All key management requires the `api-keys:read`/`api-keys:write` scopes on the caller (owner/admin/manager/member all have both; viewer is read-only).

### Create

```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Reporting integration","scopes":["reports:read","analytics:read"],"rateLimitPerMinute":120}' \
  https://your-host/api/v1/api-keys
```

The response includes the **plaintext key exactly once**, under `apiKey` — the server only stores a hash (`keyHash`) and a display-safe prefix from then on. Copy it immediately; there is no way to retrieve the plaintext again later, only to rotate to a new one. `scopes` must be a non-empty subset of the platform's full scope list; requesting an unknown scope string is a `422 validation_error`. `rateLimitPerMinute` defaults to `120` if omitted.

### List

```bash
curl -H "Authorization: Bearer <token>" https://your-host/api/v1/api-keys
```

Returns sanitized key records (no `keyHash`/plaintext) including `status`, `scopes`, `rateLimitPerMinute`, `requestCount`, and `lastUsedAt` — useful for spotting keys that haven't been used in a long time as rotation/cleanup candidates.

### Rotate

```bash
curl -X POST -H "Authorization: Bearer <token>" \
  https://your-host/api/v1/api-keys/<keyId>/rotate
```

Issues a brand-new plaintext key (again returned exactly once, under `apiKey`) and replaces the stored hash/prefix on the _same_ key record — the key `id` and its `scopes`/`rateLimitPerMinute` are preserved, only the secret itself changes. Also flips `status` back to `"active"` if the key had been revoked. Any client still using the old plaintext immediately starts getting `401 unauthorized` ("Invalid or revoked API key") on their next request, since the old hash no longer matches anything.

### Revoke

```bash
curl -X DELETE -H "Authorization: Bearer <token>" \
  https://your-host/api/v1/api-keys/<keyId>
```

Sets `status: "revoked"` — the key record isn't deleted (so audit history/`requestCount` is preserved), but any request using it immediately fails with `401 unauthorized`. This is the correct action for "this key is compromised" or "this integration is decommissioned"; use rotate instead if the integration should keep working under a new secret.

All create/rotate/revoke actions write an audit log entry (`api-key.created`/`api-key.rotated`/`api-key.revoked`) via `src/server/http/audit.ts`.

---

## 4. Webhooks — register and read delivery logs

Webhooks let external systems receive real-time notifications for platform events. Requires `webhooks:read`/`webhooks:write` scopes.

### Supported events

```
session.started
session.completed
tracking.form-alert
report.ready
user.invited
```

### Register a webhook

```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/hooks/body-tracker","events":["session.completed","report.ready"]}' \
  https://your-host/api/v1/webhooks
```

The response includes the webhook's signing `secret` **in full, exactly once, at creation time only** — store it immediately. Every subsequent read of this webhook (`GET`/list) returns a sanitized record without the secret. Use the secret to verify the `X-BTK-Signature: sha256=<hmac>` header on incoming deliveries.

### List, update, delete

```bash
curl -H "Authorization: Bearer <token>" https://your-host/api/v1/webhooks

curl -X PATCH -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status":"disabled"}' \
  https://your-host/api/v1/webhooks/<webhookId>

curl -X DELETE -H "Authorization: Bearer <token>" \
  https://your-host/api/v1/webhooks/<webhookId>
```

Deleting a webhook also deletes all of its stored delivery-log records.

### Send a test delivery

```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"event":"session.completed"}' \
  https://your-host/api/v1/webhooks/<webhookId>/test
```

`event` is optional — omitted, it defaults to the webhook's first subscribed event. This makes a real outbound HTTP POST to the webhook's URL with a signed sample payload (5-second timeout), and records the outcome as a delivery-log entry regardless of whether the destination responded — a network error or timeout on the destination end is a legitimate, expected test outcome (delivery marked `"failed"`, `responseStatus: null`), not a bug in this endpoint.

### Read delivery logs

```bash
curl -H "Authorization: Bearer <token>" \
  "https://your-host/api/v1/webhooks/<webhookId>/deliveries?limit=20"
```

Returns paginated delivery records, newest first, each with `event`, `status` (`pending`/`success`/`failed`), `responseStatus`, and `durationMs` — the first place to look when a downstream integration claims "we're not receiving webhooks." A consistent `"failed"` status with `responseStatus: null` across recent deliveries points to a network/DNS/timeout issue on the receiving end; a `"failed"` status with a real non-2xx `responseStatus` means the receiving endpoint is reachable but rejecting the payload.

---

## 5. Platform health — where to actually look

Two endpoints report status, and **they are unrelated to each other** — don't conflate them when someone asks "is the platform up":

- **`GET /api/v1/status`** — the real, live application status. Returns actual `process.uptime()`, actual `process.memoryUsage()` (`rssMb`/`heapUsedMb`), real request counters by status class (`2xx`/`4xx`/`5xx`, counted from every response ever served since process start), and real in-memory data-store record counts (organizations, users, tracking sessions, reports, webhooks, API keys). This is the one to check for "is the app actually healthy right now."

  ```bash
  curl -H "Authorization: Bearer <token>" https://your-host/api/v1/status
  ```

  Note this one is _not_ on the auth-free liveness path — it's a normal authenticated API route, unlike `/api/v1/health` (no auth, pure liveness) and `/api/v1/health/ready` (no auth, checks env config + data-store initialization, returns 503 if not ready).

- **`/docs/status`** — a page in the SDK documentation portal (built in an earlier project phase), showing component-level status and an incident timeline. **This content is a static/mock status page** (`STATUS_COMPONENTS`/`RECENT_INCIDENTS` in `src/features/docs/lib/status-content.ts`) — it is not wired to the real app's live state the way `/api/v1/status` is. Treat it as documentation-portal decoration, not an operational signal. If you need to know whether the platform is actually up, use `/api/v1/status` (or `/api/v1/health`/`/api/v1/health/ready` for lighter-weight checks), never `/docs/status`.

For a Prometheus/Grafana-based view over time (uptime, memory trends, request-rate/error-rate graphs, alerting), see `docs/ops/monitoring-guide.md` — the real `/api/v1/metrics` endpoint and the optional monitoring overlay.

---

## 6. The `/admin` frontend section (a separate, existing thing)

There is also a visual `/admin` area in the app itself (route group `src/app/(app)/admin/`), with sub-pages for **Dashboard, Users, Organizations, Teams, Roles & Permissions, Logs, API Keys, and Billing**. This was built in an earlier project phase and is a genuinely different piece of the system from everything described above:

- It's **UI only**, backed by its **own older mock services** (`@/features/admin` — e.g. `useAdminStore`, `useRolesQuery`, `useFeatureFlagsQuery`) from that earlier phase.
- It is **not** connected to the real Phase 14 backend endpoints documented in this guide (`/api/v1/organizations/*`, `/api/v1/api-keys/*`, `/api/v1/webhooks/*`).

It's a reasonable place to point a non-technical stakeholder for a visual tour of what an admin experience could look like, but for any action that needs to actually take effect against real organizations, members, roles, API keys, or webhooks, use the real `/api/v1/*` endpoints in this guide directly, or the API Explorer (`/docs/api-explorer`) as the no-code front-end for those same real endpoints. Don't use `/admin` expecting it to change real platform state — as of this writing, it won't.
