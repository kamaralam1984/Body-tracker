"use client";

/**
 * Settings-style toggle list for feature flags (mirrors the visual style of
 * NotificationToggleList). Self-contained page state — no store slice for
 * flags, since they're lower-stakes and don't need cross-component sync.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { FeatureFlag } from "../types";

export function FeatureFlagList({
  flags,
  className,
}: {
  flags: FeatureFlag[];
  className?: string;
}) {
  const [state, setState] = useState<FeatureFlag[]>(flags);

  function handleToggle(flag: FeatureFlag, enabled: boolean) {
    setState((prev) => prev.map((f) => (f.id === flag.id ? { ...f, enabled } : f)));
    toast.info(`${flag.name} ${enabled ? "enabled" : "disabled"}`);
  }

  return (
    <Card className={cn("divide-border-subtle flex flex-col divide-y", className)}>
      {state.map((flag) => (
        <div key={flag.id} className="flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <label htmlFor={flag.id} className="text-foreground text-sm font-medium">
              {flag.name}
            </label>
            <p className="text-muted-foreground text-sm">{flag.description}</p>
            <p className="text-muted-foreground text-xs">{flag.rolloutPercent}% rollout</p>
          </div>
          <Switch
            id={flag.id}
            checked={flag.enabled}
            onCheckedChange={(checked) => handleToggle(flag, checked)}
          />
        </div>
      ))}
    </Card>
  );
}

export function FeatureFlagListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Card className="divide-border-subtle flex flex-col divide-y">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-56" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
        </div>
      ))}
    </Card>
  );
}
