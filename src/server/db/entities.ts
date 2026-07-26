/**
 * Backend entity model for the API Platform.
 *
 * This is the in-memory stand-in for what a production deployment would
 * persist in PostgreSQL via Prisma (see prisma/schema.prisma for the real
 * intended schema). Shapes here intentionally mirror that schema 1:1 so
 * swapping the store implementation later doesn't require touching every
 * route handler.
 */

export type Role = "owner" | "admin" | "manager" | "member" | "viewer";

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

export const ALL_SCOPES: Scope[] = [
  "users:read",
  "users:write",
  "organizations:read",
  "organizations:write",
  "sessions:read",
  "sessions:write",
  "tracking:read",
  "tracking:write",
  "analytics:read",
  "reports:read",
  "reports:write",
  "webhooks:read",
  "webhooks:write",
  "api-keys:read",
  "api-keys:write",
  "oauth-clients:read",
  "oauth-clients:write",
  "service-accounts:read",
  "service-accounts:write",
];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "growth" | "enterprise";
  createdAt: string;
}

export interface Team {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  orgId: string;
  teamId: string | null;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  status: "active" | "invited" | "suspended";
  createdAt: string;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface ApiKey {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: Scope[];
  status: "active" | "revoked";
  rateLimitPerMinute: number;
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export type TrackingStatus = "idle" | "active" | "paused" | "completed";

export interface TrackingSession {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  activityKind: string;
  status: TrackingStatus;
  startedAt: string;
  pausedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  repCount: number;
  caloriesEstimate: number;
  avgFormScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingEvent {
  id: string;
  sessionId: string;
  type: "started" | "paused" | "resumed" | "rep" | "form-alert" | "completed";
  message: string;
  data: Record<string, number | string>;
  createdAt: string;
}

export interface AnalyticsSnapshot {
  id: string;
  orgId: string;
  userId: string;
  date: string;
  activeMinutes: number;
  sessionsCompleted: number;
  repsTotal: number;
  avgFormScore: number;
  focusScore: number;
  postureScore: number;
}

export interface Report {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  format: "pdf" | "csv";
  status: "queued" | "generating" | "ready" | "failed";
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  readyAt: string | null;
  sizeBytes: number | null;
}

export type WebhookEvent =
  "session.started" | "session.completed" | "tracking.form-alert" | "report.ready" | "user.invited";

export interface Webhook {
  id: string;
  orgId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  status: "active" | "disabled";
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  attempt: number;
  status: "pending" | "success" | "failed";
  responseStatus: number | null;
  durationMs: number | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  actorId: string;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
