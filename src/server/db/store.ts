import { randomUUID } from "node:crypto";
import { hashPassword } from "../auth/password";
import type {
  AnalyticsSnapshot,
  ApiKey,
  AuditLogEntry,
  Organization,
  RefreshToken,
  Report,
  Role,
  Team,
  TrackingEvent,
  TrackingSession,
  User,
  Webhook,
  WebhookDelivery,
} from "./entities";

/**
 * In-memory data store standing in for PostgreSQL+Prisma in this sandbox.
 * Cached on `globalThis` so Next.js dev-mode module reloads (Turbopack HMR)
 * don't wipe seeded data on every request, mirroring the standard
 * singleton-Prisma-client pattern used in real Next.js apps.
 */

interface Store {
  organizations: Map<string, Organization>;
  teams: Map<string, Team>;
  users: Map<string, User>;
  refreshTokens: Map<string, RefreshToken>;
  apiKeys: Map<string, ApiKey>;
  trackingSessions: Map<string, TrackingSession>;
  trackingEvents: Map<string, TrackingEvent[]>;
  analyticsSnapshots: Map<string, AnalyticsSnapshot>;
  reports: Map<string, Report>;
  webhooks: Map<string, Webhook>;
  webhookDeliveries: Map<string, WebhookDelivery>;
  auditLog: AuditLogEntry[];
}

declare global {
  var __btkStore: Store | undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function seed(): Store {
  const store: Store = {
    organizations: new Map(),
    teams: new Map(),
    users: new Map(),
    refreshTokens: new Map(),
    apiKeys: new Map(),
    trackingSessions: new Map(),
    trackingEvents: new Map(),
    analyticsSnapshots: new Map(),
    reports: new Map(),
    webhooks: new Map(),
    webhookDeliveries: new Map(),
    auditLog: [],
  };

  const org: Organization = {
    id: "org_apex",
    name: "Apex Performance Labs",
    slug: "apex-performance",
    plan: "enterprise",
    createdAt: daysAgoIso(400),
  };
  store.organizations.set(org.id, org);

  const team: Team = {
    id: "team_core",
    orgId: org.id,
    name: "Core Team",
    createdAt: daysAgoIso(390),
  };
  store.teams.set(team.id, team);

  const seedUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: Role;
    password: string;
  }> = [
    {
      id: "user_owner",
      email: "owner@apex-performance.dev",
      name: "Riley Sharma",
      role: "owner",
      password: "OwnerPass123!",
    },
    {
      id: "user_admin",
      email: "admin@apex-performance.dev",
      name: "Jordan Blake",
      role: "admin",
      password: "AdminPass123!",
    },
    {
      id: "user_member",
      email: "member@apex-performance.dev",
      name: "Casey Nguyen",
      role: "member",
      password: "MemberPass123!",
    },
  ];

  for (const u of seedUsers) {
    const user: User = {
      id: u.id,
      orgId: org.id,
      teamId: team.id,
      email: u.email,
      passwordHash: hashPassword(u.password),
      name: u.name,
      role: u.role,
      status: "active",
      createdAt: daysAgoIso(300),
    };
    store.users.set(user.id, user);
  }

  // Seed a handful of historical tracking sessions + analytics for the member user.
  const memberId = "user_member";
  const kinds = ["squat", "posture-check", "desk-focus", "mobility-flow"];
  for (let i = 0; i < 8; i++) {
    const id = `sess_seed_${i}`;
    const startedAt = daysAgoIso(8 - i);
    const durationSeconds = 600 + i * 45;
    store.trackingSessions.set(id, {
      id,
      orgId: org.id,
      userId: memberId,
      title: `Session ${i + 1}`,
      activityKind: kinds[i % kinds.length],
      status: "completed",
      startedAt,
      pausedAt: null,
      endedAt: startedAt,
      durationSeconds,
      repCount: 12 + i * 3,
      caloriesEstimate: 80 + i * 12,
      avgFormScore: 72 + (i % 5) * 4,
      createdAt: startedAt,
      updatedAt: startedAt,
    });

    store.analyticsSnapshots.set(id, {
      id,
      orgId: org.id,
      userId: memberId,
      date: startedAt.slice(0, 10),
      activeMinutes: Math.round(durationSeconds / 60),
      sessionsCompleted: 1,
      repsTotal: 12 + i * 3,
      avgFormScore: 72 + (i % 5) * 4,
      focusScore: 65 + (i % 6) * 5,
      postureScore: 70 + (i % 4) * 6,
    });
  }

  const report: Report = {
    id: "rpt_seed_1",
    orgId: org.id,
    userId: memberId,
    title: "Weekly Performance Summary",
    format: "pdf",
    status: "ready",
    periodStart: daysAgoIso(7),
    periodEnd: daysAgoIso(0),
    createdAt: daysAgoIso(1),
    readyAt: daysAgoIso(1),
    sizeBytes: 184_320,
  };
  store.reports.set(report.id, report);

  return store;
}

export function getStore(): Store {
  if (!globalThis.__btkStore) {
    globalThis.__btkStore = seed();
  }
  return globalThis.__btkStore;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export { nowIso };
