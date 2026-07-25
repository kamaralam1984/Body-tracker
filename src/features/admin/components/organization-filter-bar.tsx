"use client";

/**
 * Search/filter bar for the organization grid. Unlike
 * `session-management`'s filter bar (controlled, filter state lives in the
 * parent), this one reads and writes `orgFilters` directly from
 * `useAdminStore` — the established pattern for every Phase-10 admin filter
 * bar. The actual filtering logic lives in `filterOrganizations`
 * (`../lib/admin-query.ts`), called by the page that renders the grid.
 *
 * <OrganizationFilterBar />
 */

import { SearchInput } from "@/components/ui/input-extras";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminStore } from "../store/admin-store";
import type { AdminDatePreset, OrgStatus } from "../types";

const statusOptions: { value: OrgStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "past_due", label: "Past due" },
  { value: "suspended", label: "Suspended" },
];

const datePresets: { value: AdminDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export function OrganizationFilterBar({ className }: { className?: string }) {
  const orgFilters = useAdminStore((state) => state.orgFilters);
  const setOrgFilters = useAdminStore((state) => state.setOrgFilters);

  function patch(next: Partial<typeof orgFilters>) {
    setOrgFilters({ ...orgFilters, ...next });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by name, domain, or slug…"
          value={orgFilters.search}
          onChange={(event) => patch({ search: event.target.value })}
          onClear={() => patch({ search: "" })}
          className="w-full sm:max-w-sm"
        />

        <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
          <Select
            options={statusOptions}
            value={orgFilters.status}
            onValueChange={(value) => patch({ status: value })}
            placeholder="Status"
            className="w-full sm:w-40"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Created
        </span>
        {datePresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => patch({ datePreset: preset.value })}
          >
            <Badge
              variant={orgFilters.datePreset === preset.value ? "accent" : "outline"}
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
