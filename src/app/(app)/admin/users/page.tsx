"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BulkUserActionBar,
  NoResultsEmptyState,
  NoUsersEmptyState,
  UserFilterBar,
  UserTable,
  filterUsers,
  useAdminStore,
  useUsersQuery,
} from "@/features/admin";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useUsersQuery();
  const userFilters = useAdminStore((state) => state.userFilters);
  const activeOrganizationId = useAdminStore((state) => state.activeOrganizationId);
  const setInviteUserOpen = useAdminStore((state) => state.setInviteUserOpen);

  const scoped = useMemo(() => {
    const all = users ?? [];
    return activeOrganizationId === "all"
      ? all
      : all.filter((u) => u.organizationId === activeOrganizationId);
  }, [users, activeOrganizationId]);

  const visible = useMemo(() => filterUsers(scoped, userFilters), [scoped, userFilters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Users</h2>
          <p className="text-muted-foreground text-sm">
            {scoped.length} user{scoped.length === 1 ? "" : "s"}
            {activeOrganizationId === "all" ? " across the platform" : " in this organization"}
          </p>
        </div>
        <Button variant="primary" onClick={() => setInviteUserOpen(true)}>
          <Plus />
          Invite user
        </Button>
      </div>

      <UserFilterBar />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : scoped.length === 0 ? (
        <NoUsersEmptyState
          action={
            <Button variant="primary" onClick={() => setInviteUserOpen(true)}>
              Invite your first user
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <NoResultsEmptyState />
      ) : (
        <UserTable users={visible} />
      )}

      <BulkUserActionBar />
    </div>
  );
}
