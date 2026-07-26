/**
 * Hand-maintained entity types, shared by every resource module —
 * deliberately clean, Stripe-style names (`Session`, `ApiKeyRecord`)
 * rather than deep-indexing into `generated/openapi-types.ts`'s
 * `paths[...]["responses"]["200"]...` shapes. The generated types ARE
 * still the source of truth for the request bodies/query params that
 * are registered via `schemaRef()` server-side (re-exported as
 * `OpenApiComponents`/`OpenApiPaths` from the package root for advanced
 * callers) — these entity interfaces are just a more usable public
 * surface on top, kept in sync by hand against the real Prisma schema
 * and each route's real `sanitizeX()` output.
 */

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

export interface ListParams {
  cursor?: string;
  limit?: number;
  sort?: string;
  search?: string;
}

export type TrackingStatus = "idle" | "active" | "paused" | "completed";

export interface Session {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  activityKind: string;
  status: TrackingStatus;
  startedAt: string | null;
  pausedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  repCount: number;
  caloriesEstimate: number;
  avgFormScore: number;
  createdAt: string;
  updatedAt: string;
}

export type Scope =
  | "users:read"
  | "users:write"
  | "organizations:read"
  | "organizations:write"
  | "sessions:read"
  | "sessions:write"
  | "tracking:read"
  | "tracking:write"
  | "analytics:read"
  | "reports:read"
  | "reports:write"
  | "webhooks:read"
  | "webhooks:write"
  | "api-keys:read"
  | "api-keys:write"
  | "oauth-clients:read"
  | "oauth-clients:write"
  | "service-accounts:read"
  | "service-accounts:write";

export type ApiKeyEnvironment = "test" | "live";
export type ApiKeyType = "secret" | "publishable";
export type ApiKeyStatus = "active" | "revoked";
export type RevokeReason =
  "Compromised" | "Unused" | "Employee Left" | "Testing Complete" | "Manual";

export interface ApiKeyRecord {
  id: string;
  orgId: string;
  userId: string | null;
  serviceAccountId: string | null;
  name: string;
  keyPrefix: string;
  scopes: Scope[];
  status: ApiKeyStatus;
  rateLimitPerMinute: number;
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedReason: string | null;
  environment: ApiKeyEnvironment;
  keyType: ApiKeyType;
  allowedIps: string[];
  allowedOrigins: string[];
  gracePeriodEndsAt: string | null;
  supersedesId: string | null;
}

/** Only present on the one response that ever includes it — the real plaintext secret, shown exactly once (creation or rotation). */
export interface ApiKeyWithSecret extends ApiKeyRecord {
  apiKey: string;
}

export interface RotatedApiKey extends ApiKeyWithSecret {
  oldKeyId: string;
  gracePeriodEndsAt: string;
}

export interface RotationHistoryEntry {
  rotatedAt: string;
  rotatedBy: string | null;
  newKeyId: string;
  oldKeyId: string | null;
  gracePeriodEndsAt: string | null;
}
