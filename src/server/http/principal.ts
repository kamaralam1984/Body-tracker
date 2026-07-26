import type { Scope } from "../db/entities";
import { ALL_SCOPES } from "../db/entities";
import { getPrisma } from "../db/prisma";
import { hashApiKey } from "../auth/api-keys";
import { verifyAccessToken } from "../auth/tokens";
import { ApiError, unauthorized } from "./errors";
import { checkRateLimit, rateLimitHeaders, type RateLimitResult } from "./rate-limit";
import { beginRequestContext, setRequestPrincipal } from "./request-context";
import { logger } from "../logging/logger";
import { isIpAllowed } from "./ip-restriction";
import { isOriginAllowed } from "./origin-restriction";

export interface Principal {
  userId: string;
  orgId: string;
  role: string;
  scopes: Scope[];
  authMethod: "bearer" | "api-key";
  apiKeyId?: string;
  // Present when this Bearer token was issued via the OAuth2 flow
  // (src/app/api/v1/oauth/token/route.ts) rather than a normal login —
  // `scopes` above is then the consented subset, not the user's full role
  // scopes. See AccessTokenPayload in src/server/auth/tokens.ts.
  oauthClientId?: string;
  // Present when this principal is a machine identity (see ServiceAccount
  // in prisma/schema.prisma), not a human. `userId` is then the service
  // account's own id (there's no User row) and `role` is the synthetic
  // string "service_account" — scopes come only from the API key's own
  // explicit grant, never a role lookup.
  serviceAccountId?: string;
  rateLimit: RateLimitResult;
  // Only ever true for a Bearer-token principal whose User row has
  // `isPlatformAdmin: true` — never set for API-key or service-account
  // principals (see the ApiKey branch below and the schema comment on
  // `User.isPlatformAdmin`). Gates the dedicated /api/v1/platform/* routes
  // only; every normal route stays scoped by `orgId` regardless of this.
  isPlatformAdmin?: boolean;
}

const ROLE_SCOPES: Record<string, Scope[]> = {
  owner: ALL_SCOPES,
  admin: ALL_SCOPES,
  manager: ALL_SCOPES.filter((s) => s !== "organizations:write"),
  member: [
    "sessions:read",
    "sessions:write",
    "tracking:read",
    "tracking:write",
    "analytics:read",
    "reports:read",
    "reports:write",
    "users:read",
    "users:write",
    "api-keys:read",
    "api-keys:write",
    "webhooks:read",
    "webhooks:write",
  ],
  viewer: [
    "sessions:read",
    "tracking:read",
    "analytics:read",
    "reports:read",
    "users:read",
    "api-keys:read",
    "webhooks:read",
  ],
};

/** Resolves the caller from a Bearer JWT or `Authorization: ApiKey <key>` header, applying rate limits. */
export async function resolvePrincipal(request: Request): Promise<Principal> {
  // Started before the auth check below can throw, so failed-auth attempts
  // (bad/missing header, invalid key, expired token) are still logged.
  const requestContext = beginRequestContext(request);

  const header = request.headers.get("authorization") ?? "";
  const prisma = await getPrisma();

  if (header.startsWith("ApiKey ")) {
    const plaintext = header.slice("ApiKey ".length).trim();
    const hash = hashApiKey(plaintext);
    const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
    if (!key) throw new ApiError("invalid_api_key", "The provided API key is invalid.");
    // Attributed to the org as soon as a real key row is found — even
    // though the request may still fail below (revoked/expired/IP-blocked/
    // etc.) — so `ApiRequestLog` can attribute a failed attempt to the
    // right org (see the Security Center's failed-auth-spike detection,
    // `/api/v1/security-center/overview`). A genuinely unknown/invalid key
    // (no matching row at all) correctly stays unattributed — there's no
    // real org to blame it on.
    setRequestPrincipal({ orgId: key.orgId, apiKeyId: key.id });
    if (key.status !== "active")
      throw new ApiError("revoked_key", "This API key has been revoked.");
    if (key.expiresAt && key.expiresAt.getTime() < Date.now())
      throw new ApiError("expired_key", "This API key has expired.");
    // A rotated-out key's grace period passing is checked directly here as
    // a safety net — the sweep in src/instrumentation.ts flips `status` to
    // "revoked" once this happens, but only runs every 60s, so this catches
    // the gap between the deadline passing and the next sweep tick.
    if (key.gracePeriodEndsAt && key.gracePeriodEndsAt.getTime() < Date.now()) {
      throw new ApiError("revoked_key", "This API key was rotated and its grace period has ended.");
    }
    if (!isIpAllowed(requestContext.ip, key.allowedIps)) {
      throw new ApiError(
        "ip_not_allowed",
        "This request's IP address is not on this API key's allowlist.",
      );
    }
    if (!isOriginAllowed(request, key.allowedOrigins)) {
      throw new ApiError(
        "invalid_origin",
        "This request's origin is not on this API key's allowlist.",
      );
    }

    // Best-effort usage tracking — doesn't block the request on failure.
    prisma.apiKey
      .update({
        where: { id: key.id },
        data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
      })
      .catch((error) =>
        logger.error({ err: error, apiKeyId: key.id }, "failed to record API key usage"),
      );

    const rateLimit = await checkRateLimit(`apikey:${key.id}`, {
      limit: key.rateLimitPerMinute,
      windowMs: 60_000,
    });

    if (key.serviceAccountId) {
      const serviceAccount = await prisma.serviceAccount.findUnique({
        where: { id: key.serviceAccountId },
      });
      if (!serviceAccount || serviceAccount.status !== "active") {
        throw new ApiError(
          "revoked_key",
          "This API key's service account is disabled or was deleted.",
        );
      }

      setRequestPrincipal({ orgId: key.orgId, userId: serviceAccount.id, apiKeyId: key.id });

      return {
        userId: serviceAccount.id,
        orgId: key.orgId,
        role: "service_account",
        scopes: key.scopes as Scope[],
        authMethod: "api-key",
        apiKeyId: key.id,
        serviceAccountId: serviceAccount.id,
        rateLimit,
      };
    }

    const user = key.userId ? await prisma.user.findUnique({ where: { id: key.userId } }) : null;
    if (!user) throw new ApiError("invalid_api_key", "This API key's owner no longer exists.");

    setRequestPrincipal({ orgId: key.orgId, userId: user.id, apiKeyId: key.id });

    return {
      userId: user.id,
      orgId: key.orgId,
      role: user.role,
      scopes: key.scopes as Scope[],
      authMethod: "api-key",
      apiKeyId: key.id,
      rateLimit,
    };
  }

  if (header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    const payload = verifyAccessToken(token);
    if (!payload) throw unauthorized("Invalid or expired access token");
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw unauthorized("Token subject not found");

    const rateLimit = await checkRateLimit(`user:${user.id}`, { limit: 600, windowMs: 60_000 });

    setRequestPrincipal({ orgId: user.orgId, userId: user.id });

    // OAuth2-issued tokens carry their consented scopes right on the JWT
    // payload — use those instead of the user's full role scopes. A
    // normal login-issued token never has this field (see signAccessToken).
    const scopes = payload.scopes ? (payload.scopes as Scope[]) : (ROLE_SCOPES[user.role] ?? []);

    return {
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
      scopes,
      authMethod: "bearer",
      ...(payload.oauthClientId ? { oauthClientId: payload.oauthClientId } : {}),
      // Never for an OAuth2-issued token (same reasoning as scopes above —
      // a third-party app's consented-scope token shouldn't inherit
      // platform-wide reach just because the user who authorized it
      // happens to be a platform admin).
      ...(!payload.oauthClientId && user.isPlatformAdmin ? { isPlatformAdmin: true } : {}),
      rateLimit,
    };
  }

  throw unauthorized("Missing Authorization header — use `Bearer <token>` or `ApiKey <key>`");
}

export function requireScope(principal: Principal, scope: Scope) {
  if (!principal.scopes.includes(scope)) {
    throw new ApiError("insufficient_scope", `Missing required scope: ${scope}`);
  }
}

/** Gates the dedicated /api/v1/platform/* routes — see the Principal.isPlatformAdmin doc comment for why this is a separate axis from requireScope(). */
export function requirePlatformAdmin(principal: Principal) {
  if (!principal.isPlatformAdmin) {
    throw new ApiError(
      "platform_admin_required",
      "This action requires platform administrator access.",
    );
  }
}

export function rateLimitResponseHeaders(principal: Principal): Record<string, string> {
  return rateLimitHeaders(principal.rateLimit);
}

export { ApiError };
