"use client";

/**
 * Search/filter bar for the API key table. Same established pattern as
 * `organization-filter-bar.tsx`: reads and writes `apiKeyFilters` directly
 * from `useAdminStore`. The actual filtering logic lives in `filterApiKeys`
 * (`../lib/admin-query.ts`), called by the page that renders the table.
 *
 * <ApiKeyFilterBar />
 */

import { SearchInput } from "@/components/ui/input-extras";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrganizationsQuery } from "../hooks/use-admin-queries";
import { useAdminStore } from "../store/admin-store";
import type { AdminDatePreset, ApiKeyStatus } from "../types";

const statusOptions: { value: ApiKeyStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
  { value: "revoked", label: "Revoked" },
];

const datePresets: { value: AdminDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export function ApiKeyFilterBar({ className }: { className?: string }) {
  const apiKeyFilters = useAdminStore((state) => state.apiKeyFilters);
  const setApiKeyFilters = useAdminStore((state) => state.setApiKeyFilters);
  const { data: organizations } = useOrganizationsQuery();

  const orgOptions = [
    { value: "all", label: "All organizations" },
    ...(organizations ?? []).map((org) => ({ value: org.id, label: org.name })),
  ];

  function patch(next: Partial<typeof apiKeyFilters>) {
    setApiKeyFilters({ ...apiKeyFilters, ...next });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by name or key…"
          value={apiKeyFilters.search}
          onChange={(event) => patch({ search: event.target.value })}
          onClear={() => patch({ search: "" })}
          className="w-full sm:max-w-sm"
        />

        <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
          <Select
            options={orgOptions}
            value={apiKeyFilters.organizationId}
            onValueChange={(value) => patch({ organizationId: value })}
            placeholder="Organization"
            className="w-full sm:w-48"
          />
          <Select
            options={statusOptions}
            value={apiKeyFilters.status}
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
              variant={apiKeyFilters.datePreset === preset.value ? "accent" : "outline"}
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
