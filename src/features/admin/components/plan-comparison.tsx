"use client";

/**
 * Plan comparison grid — Free/Starter/Professional/Business/Enterprise side
 * by side. The current plan (`plan.id === currentPlanId`) is highlighted
 * with an accent border and a "Current plan" badge; every other card gets
 * an Upgrade/Downgrade button, an honest `toast.info` stub since real plan
 * changes need a real payment processor.
 *
 * <PlanComparison currentPlanId={organization.plan} />
 */

import { Check } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { usePlansQuery } from "../hooks/use-admin-queries";
import { formatCompactNumber, formatCurrency } from "../lib/admin-format";
import type { OrgPlan } from "../types";

const FEATURE_LIMIT = 4;
const PLAN_ORDER: OrgPlan[] = ["free", "starter", "professional", "business", "enterprise"];

function handlePlanChange(action: "Upgrade" | "Downgrade", planName: string) {
  toast.info("Plan changes aren't wired to a backend yet", {
    description: `${action} to ${planName} was not applied — real billing changes need a real payment processor.`,
  });
}

export function PlanComparison({
  currentPlanId,
  className,
}: {
  currentPlanId: OrgPlan;
  className?: string;
}) {
  const { data: plans, isLoading } = usePlansQuery();

  if (isLoading || !plans) {
    return (
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const currentIndex = PLAN_ORDER.indexOf(currentPlanId);

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5", className)}>
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const planIndex = PLAN_ORDER.indexOf(plan.id);
        const action: "Upgrade" | "Downgrade" = planIndex >= currentIndex ? "Upgrade" : "Downgrade";

        return (
          <Card
            key={plan.id}
            selected={isCurrent}
            className={cn("flex flex-col", isCurrent && "shadow-md")}
          >
            <CardHeader className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-foreground text-sm font-semibold">{plan.name}</p>
                {isCurrent && <Badge variant="accent">Current plan</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-foreground text-2xl font-semibold tracking-tight">
                  {formatCurrency(plan.priceMonthly)}
                </span>
                <span className="text-muted-foreground text-xs">/mo</span>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="text-muted-foreground flex flex-col gap-1 text-xs">
                <span>{formatCompactNumber(plan.seatsIncluded)} seats</span>
                <span>
                  {plan.storageGb >= 1000 ? `${plan.storageGb / 1000} TB` : `${plan.storageGb} GB`}{" "}
                  storage
                </span>
                <span>{formatCompactNumber(plan.apiCallsIncluded)} API calls / mo</span>
              </div>

              <ul className="flex flex-1 flex-col gap-1.5">
                {plan.features.slice(0, FEATURE_LIMIT).map((feature) => (
                  <li key={feature} className="text-foreground flex items-start gap-2 text-xs">
                    <Check
                      className="text-success-600 dark:text-success-500 mt-0.5 size-3.5 shrink-0"
                      strokeWidth={2}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {!isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto"
                  onClick={() => handlePlanChange(action, plan.name)}
                >
                  {action}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
