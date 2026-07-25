"use client";

/**
 * SHARED status badges for the admin console — every Phase-10 admin page
 * imports from here so org/user/role/key/invoice/health states render with
 * one consistent visual language across the whole feature.
 *
 * Mirrors the `SessionStatusBadge` technique: a `Badge` + a small dot,
 * pulsing only for states that represent an actively "live" condition
 * (currently just an operational system-health check, the status-page
 * convention for "all good, monitoring live").
 *
 * <OrgStatusBadge status={org.status} />
 * <OrgPlanBadge plan={org.plan} />
 * <UserStatusBadge status={user.status} />
 * <RoleBadge role={role} />
 * <ApiKeyStatusBadge status={key.status} />
 * <InvoiceStatusBadge status={invoice.status} />
 * <SystemHealthBadge status={metric.status} />
 */

import { Crown, ShieldCheck, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Badge, badgeVariants, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ApiKeyStatus,
  InvoiceStatus,
  OrgPlan,
  OrgStatus,
  Role,
  SystemHealthMetric,
  UserStatus,
} from "../types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

interface StatusMeta {
  variant: BadgeVariant;
  label: string;
  /** Subtle pulsing opacity loop on the status dot, for live/transitional states. */
  pulse?: boolean;
}

const DOT_COLOR_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-muted-foreground",
  accent: "bg-accent-600 dark:bg-accent-300",
  success: "bg-success-600 dark:bg-success-500",
  warning: "bg-warning-600 dark:bg-warning-500",
  danger: "bg-danger-600 dark:bg-danger-500",
  info: "bg-info-600 dark:bg-info-500",
  outline: "bg-foreground",
};

function StatusPill({ meta, className }: { meta: StatusMeta; className?: string }) {
  return (
    <span className={cn(badgeVariants({ variant: meta.variant }), "gap-1.5", className)}>
      <motion.span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", DOT_COLOR_CLASS[meta.variant])}
        animate={meta.pulse ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
        transition={
          meta.pulse ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }
        }
      />
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Organization status
// ---------------------------------------------------------------------------

const ORG_STATUS_META: Record<OrgStatus, StatusMeta> = {
  active: { variant: "success", label: "Active" },
  trial: { variant: "info", label: "Trial" },
  past_due: { variant: "warning", label: "Past due" },
  suspended: { variant: "danger", label: "Suspended" },
};

export function OrgStatusBadge({ status, className }: { status: OrgStatus; className?: string }) {
  return <StatusPill meta={ORG_STATUS_META[status]} className={className} />;
}

// ---------------------------------------------------------------------------
// Organization plan
// ---------------------------------------------------------------------------

const PLAN_LABEL: Record<OrgPlan, string> = {
  free: "Free",
  starter: "Starter",
  professional: "Professional",
  business: "Business",
  enterprise: "Enterprise",
};

export function OrgPlanBadge({ plan, className }: { plan: OrgPlan; className?: string }) {
  return (
    <Badge variant={plan === "enterprise" ? "accent" : "outline"} className={className}>
      {PLAN_LABEL[plan]}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// User status
// ---------------------------------------------------------------------------

const USER_STATUS_META: Record<UserStatus, StatusMeta> = {
  active: { variant: "success", label: "Active" },
  invited: { variant: "info", label: "Invited" },
  suspended: { variant: "warning", label: "Suspended" },
  deactivated: { variant: "neutral", label: "Deactivated" },
};

export function UserStatusBadge({ status, className }: { status: UserStatus; className?: string }) {
  return <StatusPill meta={USER_STATUS_META[status]} className={className} />;
}

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

const ROLE_ICON: Record<string, LucideIcon> = {
  owner: Crown,
  "super-admin": ShieldCheck,
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const Icon = ROLE_ICON[role.id];
  return (
    <Badge variant={role.isCustom ? "outline" : "neutral"} className={className}>
      {Icon && <Icon className="size-3" strokeWidth={2} />}
      {role.name}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// API key status
// ---------------------------------------------------------------------------

const API_KEY_STATUS_META: Record<ApiKeyStatus, StatusMeta> = {
  active: { variant: "success", label: "Active" },
  disabled: { variant: "neutral", label: "Disabled" },
  revoked: { variant: "danger", label: "Revoked" },
};

export function ApiKeyStatusBadge({
  status,
  className,
}: {
  status: ApiKeyStatus;
  className?: string;
}) {
  return <StatusPill meta={API_KEY_STATUS_META[status]} className={className} />;
}

// ---------------------------------------------------------------------------
// Invoice status
// ---------------------------------------------------------------------------

const INVOICE_STATUS_META: Record<InvoiceStatus, StatusMeta> = {
  paid: { variant: "success", label: "Paid" },
  pending: { variant: "warning", label: "Pending" },
  failed: { variant: "danger", label: "Failed" },
  refunded: { variant: "neutral", label: "Refunded" },
};

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  return <StatusPill meta={INVOICE_STATUS_META[status]} className={className} />;
}

// ---------------------------------------------------------------------------
// System health
// ---------------------------------------------------------------------------

const SYSTEM_HEALTH_META: Record<SystemHealthMetric["status"], StatusMeta> = {
  operational: { variant: "success", label: "Operational", pulse: true },
  degraded: { variant: "warning", label: "Degraded" },
  outage: { variant: "danger", label: "Outage" },
};

export function SystemHealthBadge({
  status,
  className,
}: {
  status: SystemHealthMetric["status"];
  className?: string;
}) {
  return <StatusPill meta={SYSTEM_HEALTH_META[status]} className={className} />;
}
