"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NoTeamResultsEmptyState,
  NoTeamsEmptyState,
  TeamFilterBar,
  TeamGrid,
  TeamGridSkeleton,
  filterTeams,
  useAdminStore,
  useTeamsQuery,
} from "@/features/admin";

export default function AdminTeamsPage() {
  const { data: teams, isLoading } = useTeamsQuery();
  const teamFilters = useAdminStore((state) => state.teamFilters);
  const activeOrganizationId = useAdminStore((state) => state.activeOrganizationId);
  const setCreateTeamOpen = useAdminStore((state) => state.setCreateTeamOpen);

  const scoped = useMemo(() => {
    const all = teams ?? [];
    return activeOrganizationId === "all"
      ? all
      : all.filter((t) => t.organizationId === activeOrganizationId);
  }, [teams, activeOrganizationId]);

  const visible = useMemo(() => filterTeams(scoped, teamFilters), [scoped, teamFilters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Teams</h2>
          <p className="text-muted-foreground text-sm">
            {scoped.length} team{scoped.length === 1 ? "" : "s"}
            {activeOrganizationId === "all" ? " across the platform" : " in this organization"}
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateTeamOpen(true)}>
          <Plus />
          New team
        </Button>
      </div>

      <TeamFilterBar />

      {isLoading ? (
        <TeamGridSkeleton />
      ) : scoped.length === 0 ? (
        <NoTeamsEmptyState
          action={
            <Button variant="primary" onClick={() => setCreateTeamOpen(true)}>
              Create your first team
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <NoTeamResultsEmptyState />
      ) : (
        <TeamGrid teams={visible} />
      )}
    </div>
  );
}
