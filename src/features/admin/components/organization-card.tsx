"use client";

/**
 * A single organization tile for the card-grid view — Stripe/GitHub
 * Enterprise "customer card" treatment: a brand-mark logo tile, plan/status
 * badges, and seats/storage usage bars. Mirrors the technique established by
 * `session-management/components/session-card.tsx` (hover lift + staggered
 * entrance handled by the grid).
 *
 * <OrganizationGrid> renders one of these per `Organization`.
 */

import { motion } from "framer-motion";
import { Building2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAdminStore } from "../store/admin-store";
import { formatRelativeDate, formatStorage } from "../lib/admin-format";
import type { Organization } from "../types";
import { OrgPlanBadge, OrgStatusBadge } from "./admin-badges";

const EASE = [0.16, 1, 0.3, 1] as const;

const LOGO_TILE_CLASS =
  "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200 flex size-11 shrink-0 items-center justify-center rounded-lg text-base font-semibold";

export function OrganizationLogoTile({
  initial,
  className,
}: {
  initial: string;
  className?: string;
}) {
  return <div className={cn(LOGO_TILE_CLASS, className)}>{initial}</div>;
}

function usageVariant(used: number, limit: number): "accent" | "warning" {
  if (limit <= 0) return "accent";
  return used / limit >= 0.85 ? "warning" : "accent";
}

export function OrganizationCard({
  organization,
  className,
}: {
  organization: Organization;
  className?: string;
}) {
  const openOrgDrawer = useAdminStore((state) => state.openOrgDrawer);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={cn("group", className)}
    >
      <Card
        interactive
        onClick={() => openOrgDrawer(organization.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openOrgDrawer(organization.id);
          }
        }}
        className="flex flex-col gap-4 p-4 transition-shadow duration-200 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <OrganizationLogoTile initial={organization.logoInitial} />
            <div className="flex min-w-0 flex-col">
              <p
                className="text-foreground truncate text-sm font-semibold"
                title={organization.name}
              >
                {organization.name}
              </p>
              <p className="text-muted-foreground truncate text-xs">{organization.domain}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <OrgStatusBadge status={organization.status} />
          <OrgPlanBadge plan={organization.plan} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>
                Seats: {organization.seatsUsed}/{organization.seatsLimit}
              </span>
            </div>
            <Progress
              value={organization.seatsUsed}
              max={organization.seatsLimit}
              size="sm"
              variant={usageVariant(organization.seatsUsed, organization.seatsLimit)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>
                Storage: {formatStorage(organization.storageUsedGb)}/
                {formatStorage(organization.storageLimitGb)}
              </span>
            </div>
            <Progress
              value={organization.storageUsedGb}
              max={organization.storageLimitGb}
              size="sm"
              variant={usageVariant(organization.storageUsedGb, organization.storageLimitGb)}
            />
          </div>
        </div>

        <div className="border-border-subtle text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" strokeWidth={1.75} />
              {organization.memberCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3.5" strokeWidth={1.75} />
              {organization.teamCount}
            </span>
          </div>
          <span>{formatRelativeDate(organization.createdAt)}</span>
        </div>
      </Card>
    </motion.div>
  );
}
