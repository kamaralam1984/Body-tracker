"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NoOrganizationResultsEmptyState,
  NoOrganizationsEmptyState,
  OrganizationFilterBar,
  OrganizationGrid,
  OrganizationGridSkeleton,
  filterOrganizations,
  useAdminStore,
  useOrganizationsQuery,
} from "@/features/admin";

export default function AdminOrganizationsPage() {
  const { data: organizations, isLoading } = useOrganizationsQuery();
  const orgFilters = useAdminStore((state) => state.orgFilters);
  const setCreateOrgOpen = useAdminStore((state) => state.setCreateOrgOpen);

  const all = useMemo(() => organizations ?? [], [organizations]);
  const visible = useMemo(() => filterOrganizations(all, orgFilters), [all, orgFilters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Organizations</h2>
          <p className="text-muted-foreground text-sm">
            {all.length} organization{all.length === 1 ? "" : "s"} on the platform
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOrgOpen(true)}>
          <Plus />
          New organization
        </Button>
      </div>

      <OrganizationFilterBar />

      {isLoading ? (
        <OrganizationGridSkeleton />
      ) : all.length === 0 ? (
        <NoOrganizationsEmptyState
          action={
            <Button variant="primary" onClick={() => setCreateOrgOpen(true)}>
              Create your first organization
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <NoOrganizationResultsEmptyState />
      ) : (
        <OrganizationGrid organizations={visible} />
      )}
    </div>
  );
}
