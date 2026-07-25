"use client";

/**
 * Search/filter bar for the user table — mirrors `OrganizationFilterBar`'s
 * established pattern exactly: reads/writes `userFilters` directly from
 * `useAdminStore`, filtering logic itself lives in `filterUsers`
 * (`../lib/admin-query.ts`), called by the page that renders the table.
 *
 * <UserFilterBar />
 */

import { SearchInput } from "@/components/ui/input-extras";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminStore } from "../store/admin-store";
import type { AdminDatePreset, UserStatus } from "../types";

const statusOptions: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
  { value: "deactivated", label: "Deactivated" },
];

const datePresets: { value: AdminDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export function UserFilterBar({ className }: { className?: string }) {
  const userFilters = useAdminStore((state) => state.userFilters);
  const setUserFilters = useAdminStore((state) => state.setUserFilters);

  function patch(next: Partial<typeof userFilters>) {
    setUserFilters({ ...userFilters, ...next });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by name, email, or ID…"
          value={userFilters.search}
          onChange={(event) => patch({ search: event.target.value })}
          onClear={() => patch({ search: "" })}
          className="w-full sm:max-w-sm"
        />

        <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
          <Select
            options={statusOptions}
            value={userFilters.status}
            onValueChange={(value) => patch({ status: value })}
            placeholder="Status"
            className="w-full sm:w-40"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Joined
        </span>
        {datePresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => patch({ datePreset: preset.value })}
          >
            <Badge
              variant={userFilters.datePreset === preset.value ? "accent" : "outline"}
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
