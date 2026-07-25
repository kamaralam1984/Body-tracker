/**
 * Placeholder admin-console data — no backend exists yet. One deterministic
 * (seeded) dataset shared by every admin page so cross-references are
 * consistent: users belong to real organizations and hold a real role,
 * teams belong to real organizations, activity/audit events reference real
 * actors, API keys and invoices belong to real organizations. Same
 * artificial-latency Promise convention used by every other mock service in
 * this app.
 */

import type {
  ActivityCategory,
  ActivityEvent,
  ActivityEventType,
  AdminDashboardStats,
  AdminUser,
  ApiKey,
  FeatureFlag,
  Invoice,
  LoginHistoryEntry,
  Organization,
  OrgPlan,
  OrgStatus,
  PermissionMatrix,
  PlanDefinition,
  Role,
  SystemHealthMetric,
  Team,
  UserStatus,
} from "../types";

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seededRandom(seed) * items.length) % items.length];
}

function allPermissions(): PermissionMatrix {
  return {
    users: ["read", "create", "update", "delete", "export", "import"],
    organizations: ["read", "create", "update", "delete", "export", "import"],
    billing: ["read", "create", "update", "delete", "export", "import"],
    reports: ["read", "create", "update", "delete", "export", "import"],
    analytics: ["read", "create", "update", "delete", "export", "import"],
    api: ["read", "create", "update", "delete", "export", "import"],
    settings: ["read", "create", "update", "delete", "export", "import"],
    audit: ["read", "create", "update", "delete", "export", "import"],
  };
}

function readOnly(resources: (keyof PermissionMatrix)[]): PermissionMatrix {
  const base: PermissionMatrix = {
    users: [],
    organizations: [],
    billing: [],
    reports: [],
    analytics: [],
    api: [],
    settings: [],
    audit: [],
  };
  resources.forEach((r) => (base[r] = ["read"]));
  return base;
}

function merge(...matrices: PermissionMatrix[]): PermissionMatrix {
  const base: PermissionMatrix = {
    users: [],
    organizations: [],
    billing: [],
    reports: [],
    analytics: [],
    api: [],
    settings: [],
    audit: [],
  };
  for (const m of matrices) {
    (Object.keys(base) as (keyof PermissionMatrix)[]).forEach((key) => {
      base[key] = Array.from(new Set([...base[key], ...m[key]]));
    });
  }
  return base;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

const ORG_NAMES = [
  "Acme Corp",
  "Globex Industries",
  "Initech Solutions",
  "Umbrella Health",
  "Stark Dynamics",
  "Wayne Analytics",
  "Hooli Labs",
  "Wonka Systems",
];

const ORG_PLANS: OrgPlan[] = ["free", "starter", "professional", "business", "enterprise"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildOrganizations(): Organization[] {
  return ORG_NAMES.map((name, i) => {
    const seed = i * 23 + 5;
    const plan = pick(ORG_PLANS, seed);
    const status: OrgStatus =
      seededRandom(seed + 1) > 0.92
        ? "past_due"
        : seededRandom(seed + 2) > 0.85
          ? "trial"
          : "active";
    const slug = slugify(name);
    const seatsLimit =
      plan === "free"
        ? 5
        : plan === "starter"
          ? 20
          : plan === "professional"
            ? 50
            : plan === "business"
              ? 150
              : 500;
    const seatsUsed = Math.min(
      seatsLimit,
      Math.floor(seatsLimit * (0.3 + seededRandom(seed + 3) * 0.6)),
    );
    const storageLimitGb =
      plan === "free"
        ? 5
        : plan === "starter"
          ? 50
          : plan === "professional"
            ? 250
            : plan === "business"
              ? 1000
              : 5000;
    return {
      id: `ORG-${100 + i}`,
      name,
      slug,
      domain: `${slug}.com`,
      logoInitial: name.charAt(0),
      plan,
      status,
      memberCount: seatsUsed,
      teamCount: 2 + Math.floor(seededRandom(seed + 4) * 3),
      storageUsedGb: Math.round(storageLimitGb * (0.15 + seededRandom(seed + 5) * 0.6) * 10) / 10,
      storageLimitGb,
      seatsUsed,
      seatsLimit,
      createdAt: new Date(Date.now() - (200 + i * 47) * 86_400_000).toISOString(),
      billingEmail: `billing@${slug}.com`,
      customDomain: seededRandom(seed + 6) > 0.6 ? `app.${slug}.com` : null,
    } satisfies Organization;
  });
}

export const ORGANIZATIONS = buildOrganizations();

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

function buildRoles(): Role[] {
  const roles: Role[] = [
    {
      id: "owner",
      name: "Owner",
      description: "Full control over the organization, billing, and all data.",
      isCustom: false,
      memberCount: 0,
      permissions: allPermissions(),
    },
    {
      id: "super-admin",
      name: "Super Admin",
      description: "Full administrative access across the platform.",
      isCustom: false,
      memberCount: 0,
      permissions: allPermissions(),
    },
    {
      id: "admin",
      name: "Admin",
      description: "Manage users, teams, and settings for the organization.",
      isCustom: false,
      memberCount: 0,
      permissions: merge(readOnly(["billing"]), {
        users: ["read", "create", "update", "delete"],
        organizations: ["read", "update"],
        reports: ["read", "create", "export"],
        analytics: ["read", "export"],
        api: ["read", "create", "update"],
        settings: ["read", "update"],
        audit: ["read"],
        billing: ["read"],
      }),
    },
    {
      id: "manager",
      name: "Manager",
      description: "Oversee team members and review reports.",
      isCustom: false,
      memberCount: 0,
      permissions: {
        users: ["read", "update"],
        organizations: ["read"],
        billing: [],
        reports: ["read", "create", "export"],
        analytics: ["read", "export"],
        api: ["read"],
        settings: ["read"],
        audit: [],
      },
    },
    {
      id: "supervisor",
      name: "Supervisor",
      description: "Review activity and reports for assigned teams.",
      isCustom: false,
      memberCount: 0,
      permissions: {
        users: ["read"],
        organizations: ["read"],
        billing: [],
        reports: ["read", "export"],
        analytics: ["read"],
        api: [],
        settings: [],
        audit: [],
      },
    },
    {
      id: "operator",
      name: "Operator",
      description: "Day-to-day tracking session operation and API access.",
      isCustom: false,
      memberCount: 0,
      permissions: {
        users: ["read"],
        organizations: [],
        billing: [],
        reports: ["read"],
        analytics: ["read"],
        api: ["read", "create"],
        settings: [],
        audit: [],
      },
    },
    {
      id: "viewer",
      name: "Viewer",
      description: "Read-only access to reports and analytics.",
      isCustom: false,
      memberCount: 0,
      permissions: readOnly(["reports", "analytics"]),
    },
    {
      id: "guest",
      name: "Guest",
      description: "Limited read-only access to shared reports only.",
      isCustom: false,
      memberCount: 0,
      permissions: readOnly(["reports"]),
    },
    {
      id: "custom-billing-manager",
      name: "Billing Manager",
      description: "Custom role: full billing control, read-only elsewhere.",
      isCustom: true,
      memberCount: 0,
      permissions: merge(readOnly(["users", "organizations", "reports", "analytics"]), {
        ...emptyPermissionMatrix(),
        billing: ["read", "create", "update", "delete", "export"],
      }),
    },
    {
      id: "custom-support-agent",
      name: "Support Agent",
      description: "Custom role: manage user accounts and view audit history.",
      isCustom: true,
      memberCount: 0,
      permissions: {
        users: ["read", "update"],
        organizations: ["read"],
        billing: [],
        reports: [],
        analytics: [],
        api: [],
        settings: [],
        audit: ["read"],
      },
    },
  ];
  return roles;
}

export const ROLES = buildRoles();

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  "Sarah",
  "Marcus",
  "Priya",
  "Diego",
  "Elena",
  "Jordan",
  "Alex",
  "Nadia",
  "Liam",
  "Yuki",
  "Omar",
  "Freya",
  "Noah",
  "Ines",
  "Theo",
  "Maya",
];
const LAST_NAMES = [
  "Chen",
  "Webb",
  "Nair",
  "Alvarez",
  "Kowalski",
  "Rivera",
  "Kim",
  "Hassan",
  "Bennett",
  "Sato",
  "Farouk",
  "Lindgren",
  "Cohen",
  "Silva",
  "Novak",
  "Patel",
];

const ROLE_WEIGHTS: string[] = [
  "owner",
  "admin",
  "admin",
  "manager",
  "manager",
  "supervisor",
  "operator",
  "operator",
  "operator",
  "viewer",
  "viewer",
  "guest",
  "custom-billing-manager",
  "custom-support-agent",
];

const USER_STATUS_WEIGHTS: UserStatus[] = [
  "active",
  "active",
  "active",
  "active",
  "active",
  "active",
  "invited",
  "invited",
  "suspended",
  "deactivated",
];

const TOTAL_USERS = 72;

function buildUsers(): AdminUser[] {
  return Array.from({ length: TOTAL_USERS }, (_, i) => {
    const seed = i * 29 + 13;
    const org = pick(ORGANIZATIONS, seed);
    const first = pick(FIRST_NAMES, seed + 1);
    const last = pick(LAST_NAMES, seed + 2);
    const name = i === 0 ? "Jordan Rivera" : `${first} ${last}`;
    const roleId = i === 0 ? "owner" : pick(ROLE_WEIGHTS, seed + 3);
    const status = pick(USER_STATUS_WEIGHTS, seed + 4);
    const daysAgo = Math.floor(seededRandom(seed + 5) * 400);
    const lastActiveDaysAgo = Math.floor(seededRandom(seed + 6) * 21);
    const emailLocal =
      i === 0 ? "jordan.rivera" : `${first.toLowerCase()}.${last.toLowerCase()}${i}`;
    return {
      id: `USR-${1000 + i}`,
      name,
      email: `${emailLocal}@${org.domain}`,
      organizationId: org.id,
      roleId,
      teamIds: [],
      status,
      lastActiveAt:
        status === "deactivated"
          ? null
          : new Date(Date.now() - lastActiveDaysAgo * 86_400_000).toISOString(),
      createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      twoFactorEnabled: seededRandom(seed + 7) > 0.55,
    } satisfies AdminUser;
  });
}

export const USERS = buildUsers();

// Backfill role member counts now that USERS exists.
ROLES.forEach((role) => {
  role.memberCount = USERS.filter((u) => u.roleId === role.id).length;
});

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Sales",
  "Support",
  "Operations",
  "Marketing",
  "Data Science",
  "Product",
];

function buildTeams(): Team[] {
  const teams: Team[] = [];
  let counter = 0;
  ORGANIZATIONS.forEach((org, orgIndex) => {
    const orgUsers = USERS.filter((u) => u.organizationId === org.id);
    const teamCount = 2 + (orgIndex % 3);
    for (let t = 0; t < teamCount; t++) {
      const seed = orgIndex * 41 + t * 7 + 3;
      const department = pick(DEPARTMENTS, seed);
      const members = orgUsers.filter((_, idx) => idx % teamCount === t);
      counter += 1;
      const team: Team = {
        id: `TEAM-${500 + counter}`,
        organizationId: org.id,
        name: `${department} Team`,
        department,
        memberIds: members.map((m) => m.id),
        managerId:
          members.find((m) => m.roleId === "manager" || m.roleId === "admin")?.id ??
          members[0]?.id ??
          null,
        projectCount: 1 + Math.floor(seededRandom(seed + 1) * 5),
        createdAt: new Date(Date.now() - (100 + counter * 11) * 86_400_000).toISOString(),
      };
      teams.push(team);
      members.forEach((m) => m.teamIds.push(team.id));
    }
  });
  return teams;
}

export const TEAMS = buildTeams();

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export const FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: "flag-advanced-rbac",
    name: "Advanced RBAC",
    description: "Enable custom role creation and granular permission matrices.",
    enabled: true,
    rolloutPercent: 100,
  },
  {
    id: "flag-sso-enforcement",
    name: "SSO Enforcement",
    description: "Require single sign-on for all organization members.",
    enabled: false,
    rolloutPercent: 0,
  },
  {
    id: "flag-bulk-export",
    name: "Bulk Export",
    description: "Allow bulk CSV/PDF export across admin tables.",
    enabled: true,
    rolloutPercent: 100,
  },
  {
    id: "flag-api-v2",
    name: "API v2",
    description: "New API surface with expanded scopes and rate limits.",
    enabled: true,
    rolloutPercent: 40,
  },
  {
    id: "flag-audit-retention",
    name: "Extended Audit Retention",
    description: "Retain audit logs for 24 months instead of 6.",
    enabled: false,
    rolloutPercent: 10,
  },
  {
    id: "flag-team-projects",
    name: "Team Projects",
    description: "Enable project tracking within teams.",
    enabled: true,
    rolloutPercent: 75,
  },
  {
    id: "flag-billing-self-serve",
    name: "Self-Serve Plan Changes",
    description: "Let organization owners upgrade/downgrade without support.",
    enabled: true,
    rolloutPercent: 100,
  },
  {
    id: "flag-ai-insights",
    name: "AI Insights (Experimental)",
    description: "Experimental rule-based insight suggestions in reports.",
    enabled: false,
    rolloutPercent: 5,
  },
];

// ---------------------------------------------------------------------------
// Activity / audit events
// ---------------------------------------------------------------------------

const AUDIT_TYPES: ActivityEventType[] = [
  "login",
  "logout",
  "permission-changed",
  "settings-changed",
];

const EVENT_TEMPLATES: { type: ActivityEventType; describe: (target: string) => string }[] = [
  { type: "login", describe: () => "Signed in" },
  { type: "logout", describe: () => "Signed out" },
  { type: "created", describe: (t) => `Created ${t}` },
  { type: "updated", describe: (t) => `Updated ${t}` },
  { type: "deleted", describe: (t) => `Deleted ${t}` },
  { type: "exported", describe: (t) => `Exported ${t}` },
  { type: "downloaded", describe: (t) => `Downloaded ${t}` },
  { type: "shared", describe: (t) => `Shared ${t}` },
  { type: "permission-changed", describe: (t) => `Changed permissions for ${t}` },
  { type: "settings-changed", describe: (t) => `Updated ${t} settings` },
  { type: "organization-changed", describe: (t) => `Updated organization ${t}` },
];

const TARGET_POOL = [
  "a report",
  "a session",
  "a user account",
  "billing settings",
  "an API key",
  "a team",
  "the organization profile",
  "an invoice",
];

function categoryFor(type: ActivityEventType): ActivityCategory {
  return AUDIT_TYPES.includes(type) ? "audit" : "activity";
}

function buildActivityEvents(count: number): ActivityEvent[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = i * 17 + 9;
    const actor = pick(USERS, seed);
    const template = pick(EVENT_TEMPLATES, seed + 1);
    const target = pick(TARGET_POOL, seed + 2);
    const minutesAgo = Math.round(seededRandom(seed + 3) * 60 * 24 * 30);
    return {
      id: `EVT-${i}`,
      type: template.type,
      category: categoryFor(template.type),
      actor: { name: actor.name, avatarSrc: actor.avatarSrc },
      organizationId: actor.organizationId,
      target,
      description: template.describe(target),
      timestamp: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
      ipAddress: `${10 + (i % 200)}.${(i * 3) % 255}.${(i * 7) % 255}.${(i * 11) % 255}`,
    } satisfies ActivityEvent;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export const ACTIVITY_EVENTS = buildActivityEvents(220);

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

const SCOPE_POOL = [
  "read:sessions",
  "write:sessions",
  "read:reports",
  "read:users",
  "write:users",
  "read:analytics",
  "read:activity",
  "write:webhooks",
];

function buildApiKeys(): ApiKey[] {
  return Array.from({ length: 18 }, (_, i) => {
    const seed = i * 31 + 7;
    const org = pick(ORGANIZATIONS, seed);
    const creator = USERS.find((u) => u.organizationId === org.id) ?? USERS[0];
    const isLive = seededRandom(seed + 1) > 0.4;
    const status =
      seededRandom(seed + 2) > 0.85
        ? "disabled"
        : seededRandom(seed + 3) > 0.95
          ? "revoked"
          : "active";
    const scopeCount = 1 + Math.floor(seededRandom(seed + 4) * 3);
    const quota = 10_000 * (1 + Math.floor(seededRandom(seed + 5) * 10));
    return {
      id: `KEY-${800 + i}`,
      name: `${org.name.split(" ")[0]} ${isLive ? "Production" : "Test"} Key`,
      organizationId: org.id,
      prefix: isLive ? "sk_live_" : "sk_test_",
      lastFour: String(1000 + Math.floor(seededRandom(seed + 6) * 8999)),
      scopes: Array.from(
        new Set(Array.from({ length: scopeCount }, (_, s) => pick(SCOPE_POOL, seed + 7 + s))),
      ),
      status,
      createdAt: new Date(
        Date.now() - Math.floor(seededRandom(seed + 8) * 300) * 86_400_000,
      ).toISOString(),
      lastUsedAt:
        status === "active"
          ? new Date(Date.now() - Math.floor(seededRandom(seed + 9) * 5) * 86_400_000).toISOString()
          : null,
      expiresAt:
        seededRandom(seed + 10) > 0.6
          ? new Date(
              Date.now() + Math.floor(seededRandom(seed + 11) * 200) * 86_400_000,
            ).toISOString()
          : null,
      requestsThisMonth: Math.floor(seededRandom(seed + 12) * quota),
      quota,
      rateLimitPerMinute: pick([60, 120, 300, 600], seed + 13),
      createdBy: creator.name,
    } satisfies ApiKey;
  });
}

export const API_KEYS = buildApiKeys();

// ---------------------------------------------------------------------------
// Plans & invoices
// ---------------------------------------------------------------------------

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    seatsIncluded: 5,
    storageGb: 5,
    apiCallsIncluded: 10_000,
    features: ["Basic tracking", "Community support", "1 organization"],
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 49,
    seatsIncluded: 20,
    storageGb: 50,
    apiCallsIncluded: 100_000,
    features: ["Everything in Free", "Email support", "Session exports"],
  },
  {
    id: "professional",
    name: "Professional",
    priceMonthly: 199,
    seatsIncluded: 50,
    storageGb: 250,
    apiCallsIncluded: 500_000,
    features: ["Everything in Starter", "Advanced reporting", "Priority support"],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 599,
    seatsIncluded: 150,
    storageGb: 1000,
    apiCallsIncluded: 2_000_000,
    features: ["Everything in Professional", "SSO", "Custom roles", "Audit log export"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 1999,
    seatsIncluded: 500,
    storageGb: 5000,
    apiCallsIncluded: 10_000_000,
    features: ["Everything in Business", "Dedicated support", "Custom contracts", "SLA guarantee"],
  },
];

const INVOICE_STATUS_WEIGHTS: Invoice["status"][] = [
  "paid",
  "paid",
  "paid",
  "paid",
  "paid",
  "pending",
  "failed",
  "refunded",
];

function buildInvoices(): Invoice[] {
  const invoices: Invoice[] = [];
  let counter = 0;
  ORGANIZATIONS.forEach((org, orgIndex) => {
    const plan = PLANS.find((p) => p.id === org.plan) ?? PLANS[0];
    for (let m = 0; m < 6; m++) {
      const seed = orgIndex * 53 + m * 5 + 11;
      const issued = new Date(Date.now() - m * 30 * 86_400_000);
      counter += 1;
      invoices.push({
        id: `INV-${9000 + counter}`,
        organizationId: org.id,
        number: `INV-${issued.getFullYear()}-${String(counter).padStart(4, "0")}`,
        amount: plan.priceMonthly,
        status: m === 0 ? pick(INVOICE_STATUS_WEIGHTS, seed) : "paid",
        issuedAt: issued.toISOString(),
        dueAt: new Date(issued.getTime() + 14 * 86_400_000).toISOString(),
        periodLabel: issued.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
    }
  });
  return invoices.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
}

export const INVOICES = buildInvoices();

// ---------------------------------------------------------------------------
// Login history (generated on demand per user, small deterministic set)
// ---------------------------------------------------------------------------

function buildLoginHistory(userId: string): LoginHistoryEntry[] {
  const userIndex = USERS.findIndex((u) => u.id === userId);
  if (userIndex === -1) return [];
  const devices = [
    "MacBook Pro · Chrome",
    "iPhone 15 · Safari",
    "Windows Desktop · Edge",
    "iPad Pro · Safari",
  ];
  const locations = [
    "San Francisco, US",
    "New York, US",
    "London, UK",
    "Berlin, DE",
    "Bengaluru, IN",
  ];
  return Array.from({ length: 8 }, (_, i) => {
    const seed = userIndex * 61 + i * 3 + 2;
    return {
      id: `${userId}-login-${i}`,
      timestamp: new Date(
        Date.now() - Math.floor(seededRandom(seed) * 30) * 86_400_000 - i * 3_600_000,
      ).toISOString(),
      ipAddress: `${10 + (i % 200)}.${(i * 5) % 255}.${(i * 9) % 255}.${(i * 13) % 255}`,
      device: pick(devices, seed + 1),
      location: pick(locations, seed + 2),
      outcome: seededRandom(seed + 3) > 0.92 ? "failed" : "success",
    } satisfies LoginHistoryEntry;
  });
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

export function fetchOrganizations(): Promise<Organization[]> {
  return delay(ORGANIZATIONS, 500);
}

export function fetchOrganizationById(id: string): Promise<Organization | null> {
  return delay(ORGANIZATIONS.find((o) => o.id === id) ?? null, 300);
}

export function fetchUsers(): Promise<AdminUser[]> {
  return delay(USERS, 550);
}

export function fetchUserById(id: string): Promise<AdminUser | null> {
  return delay(USERS.find((u) => u.id === id) ?? null, 300);
}

export function fetchLoginHistory(userId: string): Promise<LoginHistoryEntry[]> {
  return delay(buildLoginHistory(userId), 350);
}

export function fetchTeams(): Promise<Team[]> {
  return delay(TEAMS, 500);
}

export function fetchRoles(): Promise<Role[]> {
  return delay(ROLES, 450);
}

export function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  return delay(FEATURE_FLAGS, 350);
}

export function fetchActivityEvents(): Promise<ActivityEvent[]> {
  return delay(ACTIVITY_EVENTS, 550);
}

export function fetchApiKeys(): Promise<ApiKey[]> {
  return delay(API_KEYS, 450);
}

export function fetchPlans(): Promise<PlanDefinition[]> {
  return delay(PLANS, 300);
}

export function fetchInvoices(): Promise<Invoice[]> {
  return delay(INVOICES, 500);
}

export function computeDashboardStats(): AdminDashboardStats {
  const activeToday = USERS.filter(
    (u) => u.lastActiveAt && Date.now() - new Date(u.lastActiveAt).getTime() < 86_400_000,
  ).length;
  const mrr = ORGANIZATIONS.reduce((sum, org) => {
    const plan = PLANS.find((p) => p.id === org.plan);
    return sum + (plan?.priceMonthly ?? 0);
  }, 0);
  return {
    totalOrganizations: ORGANIZATIONS.length,
    totalUsers: USERS.length,
    activeUsersToday: activeToday,
    totalTeams: TEAMS.length,
    mrr,
    apiRequestsToday: API_KEYS.reduce((sum, k) => sum + Math.round(k.requestsThisMonth / 30), 0),
    apiRequestsLimit: API_KEYS.reduce((sum, k) => sum + k.quota, 0),
    storageUsedGb: Math.round(ORGANIZATIONS.reduce((sum, o) => sum + o.storageUsedGb, 0)),
    storageLimitGb: Math.round(ORGANIZATIONS.reduce((sum, o) => sum + o.storageLimitGb, 0)),
  };
}

export function computeSystemHealth(): SystemHealthMetric[] {
  return [
    { label: "API", status: "operational", detail: "All endpoints responding normally" },
    {
      label: "Tracking pipeline",
      status: "operational",
      detail: "Detection latency within normal range",
    },
    { label: "Web app", status: "operational", detail: "No incidents reported" },
    {
      label: "Export service",
      status: "degraded",
      detail: "PDF exports experiencing minor delays",
    },
  ];
}

let userCounter = USERS.length;
export function createAdminUser(input: {
  name: string;
  email: string;
  organizationId: string;
  roleId: string;
}): AdminUser {
  userCounter += 1;
  return {
    id: `USR-${1000 + userCounter}`,
    name: input.name,
    email: input.email,
    organizationId: input.organizationId,
    roleId: input.roleId,
    teamIds: [],
    status: "invited",
    lastActiveAt: null,
    createdAt: new Date().toISOString(),
    twoFactorEnabled: false,
  };
}

let orgCounter = ORGANIZATIONS.length;
export function createOrganization(input: {
  name: string;
  domain: string;
  plan: OrgPlan;
}): Organization {
  orgCounter += 1;
  const slug = slugify(input.name);
  return {
    id: `ORG-${100 + orgCounter}`,
    name: input.name,
    slug,
    domain: input.domain || `${slug}.com`,
    logoInitial: input.name.charAt(0).toUpperCase(),
    plan: input.plan,
    status: "trial",
    memberCount: 1,
    teamCount: 0,
    storageUsedGb: 0,
    storageLimitGb: PLANS.find((p) => p.id === input.plan)?.storageGb ?? 5,
    seatsUsed: 1,
    seatsLimit: PLANS.find((p) => p.id === input.plan)?.seatsIncluded ?? 5,
    createdAt: new Date().toISOString(),
    billingEmail: `billing@${slug}.com`,
    customDomain: null,
  };
}

let teamCounter = TEAMS.length;
export function createTeam(input: {
  name: string;
  department: string;
  organizationId: string;
}): Team {
  teamCounter += 1;
  return {
    id: `TEAM-${500 + teamCounter}`,
    organizationId: input.organizationId,
    name: input.name,
    department: input.department,
    memberIds: [],
    managerId: null,
    projectCount: 0,
    createdAt: new Date().toISOString(),
  };
}

let roleCounter = ROLES.length;
export function createCustomRole(input: {
  name: string;
  description: string;
  permissions: PermissionMatrix;
}): Role {
  roleCounter += 1;
  return {
    id: `custom-role-${roleCounter}`,
    name: input.name,
    description: input.description,
    isCustom: true,
    memberCount: 0,
    permissions: input.permissions,
  };
}

let keyCounter = API_KEYS.length;
export function createApiKey(input: {
  name: string;
  organizationId: string;
  scopes: string[];
  isLive: boolean;
}): ApiKey {
  keyCounter += 1;
  return {
    id: `KEY-${800 + keyCounter}`,
    name: input.name,
    organizationId: input.organizationId,
    prefix: input.isLive ? "sk_live_" : "sk_test_",
    lastFour: String(1000 + Math.floor(Math.random() * 8999)),
    scopes: input.scopes,
    status: "active",
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    expiresAt: null,
    requestsThisMonth: 0,
    quota: 100_000,
    rateLimitPerMinute: 300,
    createdBy: "You",
  };
}

export function emptyPermissionMatrix(): PermissionMatrix {
  return {
    users: [],
    organizations: [],
    billing: [],
    reports: [],
    analytics: [],
    api: [],
    settings: [],
    audit: [],
  };
}
