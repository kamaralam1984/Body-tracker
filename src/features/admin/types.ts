/**
 * Public contract for the admin feature — an enterprise console (Stripe /
 * GitHub Enterprise / Atlassian Admin style) scoped by an active
 * organization. One coherent domain model: Organizations contain Users and
 * Teams; Users hold a Role; Roles carry a permission matrix; ActivityEvents
 * and ApiKeys and Invoices all reference an Organization and, where
 * relevant, a User. Deliberately decoupled from every other feature — no
 * imports from session-management/reporting/etc — this is its own bounded
 * context, the way a real admin console's IAM layer would be.
 */

export type OrgPlan = "free" | "starter" | "professional" | "business" | "enterprise";
export type OrgStatus = "active" | "trial" | "past_due" | "suspended";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string;
  logoInitial: string;
  plan: OrgPlan;
  status: OrgStatus;
  memberCount: number;
  teamCount: number;
  storageUsedGb: number;
  storageLimitGb: number;
  seatsUsed: number;
  seatsLimit: number;
  createdAt: string;
  billingEmail: string;
  customDomain: string | null;
}

export type UserStatus = "active" | "invited" | "suspended" | "deactivated";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarSrc?: string;
  organizationId: string;
  roleId: string;
  teamIds: string[];
  status: UserStatus;
  lastActiveAt: string | null;
  createdAt: string;
  twoFactorEnabled: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  ipAddress: string;
  device: string;
  location: string;
  outcome: "success" | "failed";
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  department: string;
  memberIds: string[];
  managerId: string | null;
  projectCount: number;
  createdAt: string;
}

/** Fixed built-in roles plus any custom roles created in-session. */
export type BuiltInRoleId =
  "owner" | "super-admin" | "admin" | "manager" | "supervisor" | "operator" | "viewer" | "guest";

export type PermissionResource =
  "users" | "organizations" | "billing" | "reports" | "analytics" | "api" | "settings" | "audit";

export type PermissionAction = "read" | "create" | "update" | "delete" | "export" | "import";

export const PERMISSION_RESOURCES: PermissionResource[] = [
  "users",
  "organizations",
  "billing",
  "reports",
  "analytics",
  "api",
  "settings",
  "audit",
];

export const PERMISSION_ACTIONS: PermissionAction[] = [
  "read",
  "create",
  "update",
  "delete",
  "export",
  "import",
];

export type PermissionMatrix = Record<PermissionResource, PermissionAction[]>;

export interface Role {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  memberCount: number;
  permissions: PermissionMatrix;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercent: number;
}

export type ActivityEventType =
  | "login"
  | "logout"
  | "created"
  | "updated"
  | "deleted"
  | "exported"
  | "downloaded"
  | "shared"
  | "permission-changed"
  | "settings-changed"
  | "organization-changed";

export type ActivityCategory = "activity" | "audit";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  category: ActivityCategory;
  actor: { name: string; avatarSrc?: string };
  organizationId: string;
  target: string;
  description: string;
  timestamp: string;
  ipAddress: string;
}

export type ApiKeyStatus = "active" | "disabled" | "revoked";

export interface ApiKey {
  id: string;
  name: string;
  organizationId: string;
  prefix: string;
  lastFour: string;
  scopes: string[];
  status: ApiKeyStatus;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  requestsThisMonth: number;
  quota: number;
  rateLimitPerMinute: number;
  createdBy: string;
}

export interface PlanDefinition {
  id: OrgPlan;
  name: string;
  priceMonthly: number;
  seatsIncluded: number;
  storageGb: number;
  apiCallsIncluded: number;
  features: string[];
}

export type InvoiceStatus = "paid" | "pending" | "failed" | "refunded";

export interface Invoice {
  id: string;
  organizationId: string;
  number: string;
  amount: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  periodLabel: string;
}

export interface SystemHealthMetric {
  label: string;
  status: "operational" | "degraded" | "outage";
  detail: string;
}

export interface AdminDashboardStats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsersToday: number;
  totalTeams: number;
  mrr: number;
  apiRequestsToday: number;
  apiRequestsLimit: number;
  storageUsedGb: number;
  storageLimitGb: number;
}

export type AdminDatePreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "all";

export interface AdminFilters {
  search: string;
  organizationId: string | "all";
  status: string | "all";
  datePreset: AdminDatePreset;
}

export const DEFAULT_ADMIN_FILTERS: AdminFilters = {
  search: "",
  organizationId: "all",
  status: "all",
  datePreset: "all",
};
