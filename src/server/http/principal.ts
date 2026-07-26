import type { Scope } from "../db/entities";
import { ALL_SCOPES } from "../db/entities";
import { getPrisma } from "../db/prisma";
import { hashApiKey } from "../auth/api-keys";
import { verifyAccessToken } from "../auth/tokens";
import { ApiError, forbidden, unauthorized } from "./errors";
import { checkRateLimit, rateLimitHeaders, type RateLimitResult } from "./rate-limit";
import { beginRequestContext, setRequestPrincipal } from "./request-context";
import { logger } from "../logging/logger";

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
  beginRequestContext(request);

  const header = request.headers.get("authorization") ?? "";
  const prisma = await getPrisma();

  if (header.startsWith("ApiKey ")) {
    const plaintext = header.slice("ApiKey ".length).trim();
    const hash = hashApiKey(plaintext);
    const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
    if (!key || key.status !== "active") throw unauthorized("Invalid or revoked API key");
    if (key.expiresAt && key.expiresAt.getTime() < Date.now())
      throw unauthorized("API key expired");

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
        throw unauthorized("API key's service account not found or disabled");
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
    if (!user) throw unauthorized("API key owner not found");

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
      rateLimit,
    };
  }

  throw unauthorized("Missing Authorization header — use `Bearer <token>` or `ApiKey <key>`");
}

export function requireScope(principal: Principal, scope: Scope) {
  if (!principal.scopes.includes(scope)) {
    throw forbidden(`Missing required scope: ${scope}`);
  }
}

export function rateLimitResponseHeaders(principal: Principal): Record<string, string> {
  return rateLimitHeaders(principal.rateLimit);
}

export { ApiError };
