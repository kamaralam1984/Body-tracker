"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Code2,
  CreditCard,
  GitBranch,
  Mail,
  MessageSquare,
  MessagesSquare,
  Puzzle,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntegrationsQuery, useSettingsStore } from "@/features/settings";
import type { IntegrationCategory } from "@/features/settings";
import { cn } from "@/lib/utils";
import { IntegrationCard } from "./integration-card";

const ICONS: Record<string, LucideIcon> = {
  google: Calendar,
  microsoft: Mail,
  slack: MessageSquare,
  discord: MessagesSquare,
  zoom: Video,
  zapier: Zap,
  github: GitBranch,
  stripe: CreditCard,
  "rest-api": Code2,
  custom: Puzzle,
};

const CATEGORY_FILTERS: { value: IntegrationCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "productivity", label: "Productivity" },
  { value: "communication", label: "Communication" },
  { value: "development", label: "Development" },
  { value: "payments", label: "Payments" },
  { value: "automation", label: "Automation" },
];

const iconClassName = "size-5 text-muted-foreground";

export function IntegrationsGrid() {
  const { data: integrations, isLoading } = useIntegrationsQuery();
  const setIntegrationConnected = useSettingsStore((s) => s.setIntegrationConnected);
  const [filter, setFilter] = useState<IntegrationCategory | "all">("all");

  const filtered = useMemo(() => {
    if (!integrations) return [];
    return filter === "all" ? integrations : integrations.filter((i) => i.category === filter);
  }, [integrations, filter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <button key={option.value} type="button" onClick={() => setFilter(option.value)}>
              <Badge
                variant={active ? "accent" : "outline"}
                className={cn(
                  "cursor-pointer px-3 py-1 text-[13px] transition-colors duration-150",
                  !active && "hover:bg-muted",
                )}
              >
                {option.label}
              </Badge>
            </button>
          );
        })}
      </div>

      {isLoading || !integrations ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((integration) => {
            const Icon = ICONS[integration.id] ?? Puzzle;
            return (
              <IntegrationCard
                key={integration.id}
                name={integration.name}
                description={integration.description}
                icon={<Icon className={iconClassName} strokeWidth={1.75} />}
                connected={integration.connected}
                onToggle={() => setIntegrationConnected(integration.id, !integration.connected)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
