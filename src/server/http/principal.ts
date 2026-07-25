import type { Scope } from "../db/entities";
import { ALL_SCOPES } from "../db/entities";
import { getPrisma } from "../db/prisma";
import { hashApiKey } from "../auth/api-keys";
import { verifyAccessToken } from "../auth/tokens";
import { ApiError, forbidden, unauthorized } from "./errors";
import { checkRateLimit, rateLimitHeaders, type RateLimitResult } from "./rate-limit";

export interface Principal {
  userId: string;
  orgId: string;
  role: string;
  scopes: Scope[];
  authMethod: "bearer" | "api-key";
  apiKeyId?: string;
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
  const header = request.headers.get("authorization") ?? "";
  const prisma = await getPrisma();

  if (header.startsWith("ApiKey ")) {
    const plaintext = header.slice("ApiKey ".length).trim();
    const hash = hashApiKey(plaintext);
    const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
    if (!key || key.status !== "active") throw unauthorized("Invalid or revoked API key");
    if (key.expiresAt && key.expiresAt.getTime() < Date.now())
      throw unauthorized("API key expired");

    const user = await prisma.user.findUnique({ where: { id: key.userId } });
    if (!user) throw unauthorized("API key owner not found");

    // Best-effort usage tracking — doesn't block the request on failure.
    prisma.apiKey
      .update({
        where: { id: key.id },
        data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
      })
      .catch((error) => console.error("[principal] failed to record API key usage", error));

    const rateLimit = checkRateLimit(`apikey:${key.id}`, {
      limit: key.rateLimitPerMinute,
      windowMs: 60_000,
    });

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

    const rateLimit = checkRateLimit(`user:${user.id}`, { limit: 600, windowMs: 60_000 });

    return {
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
      scopes: ROLE_SCOPES[user.role] ?? [],
      authMethod: "bearer",
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
