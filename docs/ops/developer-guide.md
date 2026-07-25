# Developer Guide

Onboarding for a new engineer joining Body Tracker. Read this before writing any code.

## 0. First thing to know: this is not the Next.js you remember

Body Tracker runs on **Next.js 16.2.11**, which has real breaking changes from the Next.js an LLM's (or your own) training data likely assumes. The project's `AGENTS.md` (pulled in by `CLAUDE.md`) says it plainly:

> This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

This is not boilerplate caution — it caught a real mistake during this build. **Middleware was renamed to "Proxy" in Next.js 16.** The convention file is no longer `middleware.ts`; it's `src/proxy.ts`, exporting a `proxy()` function instead of `middleware()`. The correct shape was only found by reading `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — assuming the old `middleware.ts`/`export function middleware()` API (as most training data would) would have silently produced a file Next.js never invokes.

Look at `src/proxy.ts` itself — the header comment documents exactly this:

```ts
/**
 * App-wide security headers (Next.js 16 renamed Middleware to Proxy — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * ...
 */
export function proxy() { ... }
```

**Rule of thumb**: before implementing anything that touches a Next.js file convention, data-fetching pattern, routing API, or config option you're not 100% sure about in _this_ version, grep `node_modules/next/dist/docs/` for it first. Route handlers are another example worth internalizing early — in this version, dynamic route params are async:

```ts
// src/app/api/v1/sessions/[id]/route.ts style signature
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  ...
}
```

If your code assumes synchronous `params`, it will type-check-fail or misbehave. When in doubt, read the docs bundled with the actual installed `next` version, not memory.

## 1. Frontend architecture: feature-based

Code lives under `src/features/<name>/`, one directory per product area:

```
src/features/
  activity-intelligence/
  admin/
  camera/
  docs/
  intelligence/
  report-center/
  reporting/
  session-analytics/
  session-management/
  settings/
  tracking/
```

Each feature follows the same internal shape (not every feature has every folder, but this is the pattern):

```
src/features/<name>/
  types.ts       # feature-local types
  index.ts       # the feature's public surface — only import from here
  store/         # Zustand store(s) for this feature's client state
  hooks/         # TanStack Query hooks wrapping the feature's data access
  lib/           # mock services, pure helpers
  components/    # feature-scoped UI
```

**Decoupling rule**: features do not import directly from each other's internals. Cross-feature dependencies go through props or hooks passed down from a shared parent, not `import { X } from "@/features/other-feature/components/..."`. The only sanctioned exception is documented shared-vocabulary **type-only** imports (e.g. a shared `ActivityKind` type) — even then, prefer pulling shared types up rather than reaching into another feature.

**State/data conventions**:

- **Zustand** for client-side state (`store/` in each feature).
- **TanStack Query** for anything async — every mock frontend service wraps its fake network calls in a `delay()` helper (see `src/features/activity-intelligence/lib/mock-activity-service.ts` or `src/features/admin/lib/mock-admin-service.ts` for the pattern) so loading states, skeletons, and error boundaries are exercised realistically even against fake data.
- **Recharts**-based chart family lives centrally in `src/components/ui/charts/` (`chart-line.tsx`, `chart-bar.tsx`, `chart-area.tsx`, `chart-donut.tsx`, `chart-pie.tsx`, `chart-radar.tsx`, `chart-scatter.tsx`, `chart-stacked-bar.tsx`, `chart-heatmap.tsx`, `sparkline.tsx`, plus a `chart-download-button.tsx`) — reuse these rather than wiring Recharts directly inside a feature.
- **Framer Motion** for animation.
- Design system primitives (Button, Card, Badge, Input, Select, Table, Tabs, Textarea, etc.) live in `src/components/ui/*`. Colors are oklch tokens in `src/app/globals.css`; dark/light theming is via `next-themes`.

## 2. Backend architecture: `src/server/*`

```
src/server/
  db/            entities.ts (TS interfaces — the real data model), store.ts (in-memory Map-backed store, a stand-in for Postgres)
  auth/          tokens.ts (HMAC JWT-format access/refresh tokens), password.ts (scrypt hashing), api-keys.ts
  http/          errors.ts, respond.ts, validate.ts, rate-limit.ts, pagination.ts, principal.ts, audit.ts, metrics.ts
  openapi/       document.ts (base doc + mergePaths), paths/*.ts (one fragment per domain)
  services/      one *-service.ts per domain — business logic, kept out of route handlers
  env.ts         Zod-validated environment config, fail-fast at startup
```

`prisma/schema.prisma` is the **real, intended** production schema (Postgres) and mirrors `src/server/db/entities.ts` field-for-field. The app currently runs against `src/server/db/store.ts`, an in-memory stand-in — no live Postgres/Redis is wired into the running app yet, even though `docker-compose.yml` already provisions both and `DATABASE_URL`/`REDIS_URL` are validated by `src/server/env.ts` if set. Don't assume data persists across a restart.

### Adding a new API endpoint: use `sessions` as the template

Every domain follows the same three-piece pattern. Walk through the real `sessions` domain as a template:

1. **Route handler** — `src/app/api/v1/sessions/route.ts`. Thin: resolve the caller, check the scope, validate input with Zod, call into the service layer, respond.

   ```ts
   export async function GET(request: NextRequest) {
     try {
       const principal = resolvePrincipal(request);
       requireScope(principal, "sessions:read");
       const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
       const sessions = listOrgSessions(principal.orgId, {
         status: query.status,
         activityKind: query.activityKind,
       });
       const page = paginate(sessions, query.cursor, query.limit ?? 20);
       return ok(page, { headers: rateLimitResponseHeaders(principal) });
     } catch (error) {
       return errorResponse(error);
     }
   }
   ```

   Note the recurring shape: `resolvePrincipal` → `requireScope` → `parseJsonBody`/`parseQuery` → service call → `ok(...)`, all inside a `try { ... } catch (error) { return errorResponse(error); }`. Dynamic routes (e.g. `src/app/api/v1/sessions/[id]/route.ts`) use the Next.js 16 **async params** signature: `{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params;`.

2. **Service function** — `src/server/services/sessions-service.ts`. Pure business logic: org-scoped lookups, filtering/sorting, mutation helpers. Route handlers should not reach into `getStore()` directly for anything beyond a single create/update call — put shared logic here so the "404 if missing or wrong org" rule (see `getOrgSession`) can't drift between GET/PATCH/DELETE handlers.

3. **OpenAPI path fragment** — `src/server/openapi/paths/sessions.ts`. Exports an `OpenApiDocument["paths"]` object (`sessionsPaths`) describing every route/method/schema/response for the domain. Fragments are merged by `mergePaths(...)` in `src/server/openapi/document.ts` and served live at `GET /api/v1/openapi.json` (`src/app/api/v1/openapi.json/route.ts`), which also backs the interactive API Explorer at `/docs/api-explorer`.

When adding a new endpoint: create/extend the route handler under `src/app/api/v1/<domain>/`, add the logic to (or create) `src/server/services/<domain>-service.ts`, and add/extend `src/server/openapi/paths/<domain>.ts`, then wire the new fragment into `mergePaths(...)` in `document.ts` if it's a new domain. Always validate every input (body + query + path params) with Zod via `parseJsonBody`/`parseQuery` — see `src/server/http/validate.ts`.

### Auth, errors, and responses at a glance

- **Principal resolution & RBAC**: `resolvePrincipal(request)` in `src/server/http/principal.ts` accepts either `Authorization: Bearer <accessToken>` (verified via `verifyAccessToken`) or `Authorization: ApiKey <key>` (hashed and looked up), and returns a `Principal` with `scopes` derived from the caller's `role` (`owner`/`admin`/`manager`/`member`/`viewer`, see `ROLE_SCOPES`). `requireScope(principal, scope)` throws a 403 (`forbidden`) if the scope is missing.
- **Errors**: `src/server/http/errors.ts` defines a small closed set of `ApiErrorCode`s (`bad_request`, `validation_error`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `rate_limited`, `internal_error`) each mapped to a fixed HTTP status. Throw an `ApiError` (or one of the helpers: `notFound`, `unauthorized`, `forbidden`, `conflict`, `badRequest`) and let the route handler's `catch` block hand it to `errorResponse(error)`.
- **Responses**: `ok(data, opts)` and `errorResponse(error)` in `src/server/http/respond.ts` produce the consistent `{ data, meta: { traceId } }` / `{ error: { code, message, details }, meta: { traceId } }` envelope, and both call `recordRequest(status)` for the in-process metrics counters exposed at `/api/v1/metrics`.

## 3. Zero-new-dependencies norm

Across all 15 phases of this build, **no new npm dependency was ever added** for a backend/infra primitive. `package.json`'s dependency list has stayed the same core set (Next.js, React, Zustand, TanStack Query/Table/Virtual, Recharts, Framer Motion, Zod, react-hook-form, etc.) — every server-side primitive that a typical Node app would reach for a library to solve is hand-built on Node's own built-ins instead. This is a deliberate, enforced contribution norm, not an accident of scope.

Concrete real examples already in this codebase:

| Instead of...                                              | This project hand-builds...                                                                                                                                                                                                 | Where                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `jsonwebtoken`                                             | HMAC-SHA256 JWT-format access/refresh tokens on `node:crypto`'s `createHmac`/`timingSafeEqual` — real `header.payload.signature` base64url wire format, interoperable with any real JWT verifier given the same secret      | `src/server/auth/tokens.ts`                                                 |
| `bcrypt`                                                   | `scrypt` password hashing via `node:crypto`'s `scryptSync`, salted, timing-safe compared                                                                                                                                    | `src/server/auth/password.ts`                                               |
| `helmet`                                                   | Hand-set security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, production-only `Content-Security-Policy`) in the app's Proxy layer           | `src/proxy.ts`                                                              |
| `prom-client`                                              | Hand-written Prometheus text-exposition format (`# HELP`/`# TYPE` lines + metric samples), served with `Content-Type: text/plain; version=0.0.4`                                                                            | `src/app/api/v1/metrics/route.ts`, counters in `src/server/http/metrics.ts` |
| Redis-backed rate limiters (`rate-limiter-flexible`, etc.) | An in-memory sliding-window limiter (`Map<string, {count, resetAt}>`), correct for a single process; the plan to swap it for Redis `INCR`+`EXPIRE` once multiple workers/containers are running is documented, not yet done | `src/server/http/rate-limit.ts`                                             |
| `k6` / `autocannon`                                        | A dependency-free concurrent load tester using plain `fetch` with bounded concurrency, computing real p50/p95/p99 latency from actual wall-clock timings                                                                    | `scripts/load-test.mjs`                                                     |
| Jest / Vitest                                              | A plain `node:assert/strict` + `fetch` integration test script run against a live server                                                                                                                                    | `scripts/api-tests.mjs`                                                     |

**If you find yourself about to run `npm install <something>` to solve an infrastructure problem, stop and check whether it can be hand-built on Node's built-ins first** (`node:crypto`, `node:http`, `node:assert`, `fetch`, etc.) — that's the expected default here. If you genuinely believe a new dependency is warranted, raise it explicitly rather than adding it as an incidental part of an unrelated change.

This does not apply to genuinely new _product_ capability that has nothing to do with backend/infra primitives — but even there, check first; the project has gone 15 phases without adding one.

## 4. Running the app locally and verifying changes

See `docs/ops/installation-guide.md` for the full clean-clone setup (Node version, `npm install`, dev server on port 3045, seeded demo accounts, health checks, and the API Explorer/OpenAPI/docs portal URLs) — this guide won't repeat it.

## 5. Running the test suite before opening a PR

There is no Jest/Vitest/Playwright dependency in `package.json`. The real checks are:

```bash
# Type check — must be clean, no `any`-driven suppressions
npx tsc --noEmit

# Lint (ESLint via eslint-config-next)
npm run lint

# Integration tests — 43 real end-to-end tests against a LIVE server.
# Start the dev server first (npm run dev -- -p 3045), then in another shell:
node scripts/api-tests.mjs
```

`scripts/api-tests.mjs` is a plain-Node script (`node:assert/strict` + `fetch`) that exercises every domain end-to-end against a real running server — auth, users, api-keys, organizations, sessions, tracking, analytics, reports, webhooks. Nothing is mocked; every request hits a real Route Handler. All 43 tests must pass before opening a PR.

Playwright is used for manual UI verification during development via a cached `npx` install — it is **not** a `package.json` dependency, so don't add it as one; if you need to visually verify a UI change, run it ad hoc rather than wiring it into CI.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, build, and the full integration-test suite against a real built-and-started server on every push/PR to `main`, plus a Docker build-only sanity check — the same four checks you should run locally before pushing.

## 6. Real dev workflow for larger changes

The convention established across this build for anything bigger than a small fix:

1. Build the core/shared pieces yourself first (shared types, barrel/index files, cross-cutting server primitives).
2. Verify that core with `npx tsc --noEmit` and `npm run lint`.
3. For larger phases, delegate well-scoped, **disjoint** pieces to parallel agents/contributors with explicit file-ownership boundaries — nobody but you touches shared barrel/index files or another contributor's assigned files.
4. Personally wire everything together, then run full verification: typecheck, lint, build, and — for anything touching the API — a real end-to-end run of `node scripts/api-tests.mjs` against a live server. A phase isn't done until all of that is green.

## 7. Coding conventions

- **TypeScript strict mode** (`tsconfig.json` has `"strict": true`). No `any` — if you're tempted to reach for it, model the real type or use `unknown` with a narrowing check instead.
- **Zod validation at every API boundary.** Every route handler validates its body (`parseJsonBody(request, schema)`) and query string (`parseQuery(searchParams, schema)`) via `src/server/http/validate.ts` before touching business logic. Never trust `request.json()` or `searchParams` directly in a handler.
- Keep route handlers thin; put logic in `src/server/services/*`.
- Every new/changed API surface needs a matching OpenAPI path fragment (`src/server/openapi/paths/*.ts`) — the API Explorer and published OpenAPI spec are generated from these, not hand-maintained separately.
- Respect the feature-based frontend boundaries described in §1 — no reaching into another feature's internals.
- Follow the git workflow the repo is set up for even though this particular sandbox has no commits yet (see below): feature branches, PRs into `main`, CI must pass before merge.

## 8. Git status of this repo (honest note)

This sandbox has a git repository initialized (`.git/` exists) but it currently has **zero commits** — `git log` reports `your current branch 'master' does not have any commits yet`, and there is no remote configured. The intended real workflow, once this repo is pushed somewhere with a remote, is:

- Work on feature branches, open PRs into `main`.
- `.github/workflows/ci.yml` gates every PR (lint, typecheck, build, integration tests, a Docker build sanity check).
- `.github/workflows/deploy.yml` auto-deploys `main` to **staging** on every successful CI run on `main`, and deploys to **production** only via manual `workflow_dispatch` gated by the `production` GitHub Environment's required reviewers.
- `.github/workflows/release.yml` cuts a tagged Docker image + GitHub Release on `git push --tags` (see `docs/ops/release-checklist.md`).

Don't assume commits/history exist in this environment — if you need a baseline to diff against, that has to be created first.
