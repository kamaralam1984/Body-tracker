"use client";

/**
 * Controlled search/filter bar for the team management page. Unlike
 * `session-management`'s `SessionFilterBar` (which is fully controlled via
 * props), this reads/writes `teamFilters` directly from `useAdminStore` — the
 * pattern the admin feature's other filter bars use. The parent page runs
 * `filterTeams` (from `../lib/admin-query.ts`) against the live query result
 * using the `teamFilters` this component mutates; no filtering happens here.
 * No status chip row — `Team` has no status field.
 */

import { SearchInput } from "@/components/ui/input-extras";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminStore } from "../store/admin-store";
import type { AdminDatePreset } from "../types";

const DATE_PRESETS: { value: AdminDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export function TeamFilterBar({ className }: { className?: string }) {
  const teamFilters = useAdminStore((s) => s.teamFilters);
  const setTeamFilters = useAdminStore((s) => s.setTeamFilters);

  function patch(next: Partial<typeof teamFilters>) {
    setTeamFilters({ ...teamFilters, ...next });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <SearchInput
        placeholder="Search by name or department…"
        value={teamFilters.search}
        onChange={(event) => patch({ search: event.target.value })}
        onClear={() => patch({ search: "" })}
        className="w-full sm:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          When
        </span>
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => patch({ datePreset: preset.value })}
          >
            <Badge
              variant={teamFilters.datePreset === preset.value ? "accent" : "outline"}
              className="hover:bg-muted cursor-pointer transition-colors"
            >
              {preset.label}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
