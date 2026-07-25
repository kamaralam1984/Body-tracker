"use client";

/**
 * Billing summary for a single resolved organization — plan, monthly cost,
 * seats/storage usage bars, and a mock payment-method row. Takes an already
 * resolved `Organization` (the assembling page decides what to do when the
 * org-switcher is scoped to "all", e.g. pick a representative org or show a
 * "select an organization" prompt — that's out of scope here).
 *
 * Deliberately owns its own usage-bar markup rather than importing from
 * `organization-card.tsx` — different file, different agent, may not exist
 * yet when this renders.
 *
 * <BillingOverview organization={organization} />
 */

import { CreditCard } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { usePlansQuery } from "../hooks/use-admin-queries";
import { formatCurrency, formatStorage } from "../lib/admin-format";
import type { Organization } from "../types";
import { OrgPlanBadge } from "./admin-badges";

function usageVariant(used: number, limit: number): "accent" | "warning" | "danger" {
  if (limit <= 0) return "accent";
  const ratio = used / limit;
  if (ratio >= 1) return "danger";
  if (ratio >= 0.85) return "warning";
  return "accent";
}

export function BillingOverview({
  organization,
  className,
}: {
  organization: Organization;
  className?: string;
}) {
  const { data: plans, isLoading } = usePlansQuery();
  const plan = plans?.find((p) => p.id === organization.plan);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>{organization.name}</CardTitle>
          <p className="text-muted-foreground text-sm">{organization.billingEmail}</p>
        </div>
        <OrgPlanBadge plan={organization.plan} />
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex items-baseline gap-1.5">
          {isLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <>
              <span className="text-foreground text-3xl font-semibold tracking-tight">
                {formatCurrency(plan?.priceMonthly ?? 0)}
              </span>
              <span className="text-muted-foreground text-sm">/ month</span>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>Seats</span>
              <span className="tabular-nums">
                {organization.seatsUsed} / {organization.seatsLimit}
              </span>
            </div>
            <Progress
              value={organization.seatsUsed}
              max={organization.seatsLimit}
              size="sm"
              variant={usageVariant(organization.seatsUsed, organization.seatsLimit)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>Storage</span>
              <span className="tabular-nums">
                {formatStorage(organization.storageUsedGb)} /{" "}
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
      </CardContent>

      <CardFooter className="border-border-subtle flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-10 items-center justify-center rounded-md">
            <CreditCard className="text-muted-foreground size-4" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-foreground text-sm font-medium">Visa •••• 4242</p>
            <p className="text-muted-foreground text-xs">Expires 12/27</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            toast.info("Payment methods aren't wired to a backend yet", {
              description: "Real billing changes need a real payment processor.",
            })
          }
        >
          Update
        </Button>
      </CardFooter>
    </Card>
  );
}
