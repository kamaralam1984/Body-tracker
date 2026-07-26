import { AsyncLocalStorage } from "node:async_hooks";
import { getPrisma } from "../db/prisma";
import { logger } from "../logging/logger";

/**
 * Per-request logging context — an `AsyncLocalStorage` instead of threading
 * a `request`/`principal` parameter through every route and through
 * `respond.ts`'s `ok()`/`errorResponse()` (which every route already
 * funnels through). `beginRequestContext()` is called once near the start
 * of a request (inside `resolvePrincipal()` for the ~45 routes that use
 * it, or explicitly for the handful that don't — see the short list in
 * INCOMPLETE.md); `.enterWith()` makes the context available for the rest
 * of that request's async call chain without wrapping the whole handler
 * body in a callback.
 */

export interface RequestContext {
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
  startedAt: number;
  orgId?: string;
  userId?: string;
  apiKeyId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Starts (or returns the already-started) logging context for the current request. */
export function beginRequestContext(request: Request): RequestContext {
  const existing = storage.getStore();
  if (existing) return existing;

  const url = new URL(request.url);
  const forwardedFor = request.headers.get("x-forwarded-for");

  const ctx: RequestContext = {
    method: request.method,
    path: url.pathname,
    ip: forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent"),
    startedAt: Date.now(),
  };
  storage.enterWith(ctx);
  return ctx;
}

/** Attaches the resolved caller identity to the current request's context, once auth succeeds. */
export function setRequestPrincipal(info: {
  orgId?: string;
  userId?: string;
  apiKeyId?: string;
}): void {
  const ctx = storage.getStore();
  if (ctx) Object.assign(ctx, info);
}

/**
 * Fire-and-forget `ApiRequestLog` write — call once, right before a route
 * returns its response. A no-op if `beginRequestContext()` was never
 * called on this request.
 */
export function logApiRequest(statusCode: number): void {
  const ctx = storage.getStore();
  if (!ctx) return;

  const latencyMs = Date.now() - ctx.startedAt;
  getPrisma()
    .then((prisma) =>
      prisma.apiRequestLog.create({
        data: {
          orgId: ctx.orgId ?? null,
          userId: ctx.userId ?? null,
          apiKeyId: ctx.apiKeyId ?? null,
          method: ctx.method,
          path: ctx.path,
          statusCode,
          latencyMs,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
      }),
    )
    .catch((error) => logger.error({ err: error }, "failed to write api request log"));
}
