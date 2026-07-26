"use client";

/**
 * Real cross-org API key admin page — `/api/v1/platform/api-keys` (see
 * `use-platform-queries.ts`). Deliberately does NOT use the shared
 * `OrganizationSwitcher`/`useAdminStore.activeOrganizationId` that every
 * other (still-mock) admin page reads — those pages filter mock rows by
 * fake org ids that don't correspond to real organizations, so wiring
 * the shared switcher to real org ids would silently break their
 * filtering. This page gets its own small, real, page-local org filter
 * instead.
 */

import { useState } from "react";
import { Layers } from "lucide-react";
import { Select } from "@/components/ui/select";
import {
  usePlatformOrganizationsQuery,
  usePlatformApiKeysQuery,
} from "@/features/admin/hooks/use-platform-queries";
import { PlatformApiKeyTable } from "@/features/admin/components/platform-api-key-table";

export default function AdminApiKeysPage() {
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const { data: organizations } = usePlatformOrganizationsQuery();
  const { data: keys, isLoading } = usePlatformApiKeysQuery(
    orgFilter === "all" ? undefined : orgFilter,
  );

  const orgOptions = [
    { value: "all", label: "All organizations" },
    ...(organizations ?? []).map((org) => ({ value: org.id, label: org.name })),
  ];

  const count = keys?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-foreground text-lg font-semibold">API Keys</h2>
          <p className="text-muted-foreground text-sm">
            {count} key{count === 1 ? "" : "s"}
            {orgFilter === "all" ? " across every real organization" : " in this organization"} —
            real data, not a demo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="text-muted-foreground size-4" strokeWidth={1.75} />
          <span className="text-muted-foreground text-sm">Filter by org:</span>
          <Select
            options={orgOptions}
            value={orgFilter}
            onValueChange={setOrgFilter}
            className="w-56"
          />
        </div>
      </div>

      <PlatformApiKeyTable keys={keys ?? []} loading={isLoading} />
    </div>
  );
}
