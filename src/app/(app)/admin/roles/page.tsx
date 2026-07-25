"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FeatureFlagList,
  FeatureFlagListSkeleton,
  RoleList,
  RoleListSkeleton,
  useAdminStore,
  useFeatureFlagsQuery,
  useRolesQuery,
} from "@/features/admin";

export default function AdminRolesPage() {
  const { data: roles, isLoading: isRolesLoading } = useRolesQuery();
  const { data: flags, isLoading: isFlagsLoading } = useFeatureFlagsQuery();
  const setCreateRoleOpen = useAdminStore((state) => state.setCreateRoleOpen);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">Roles & Permissions</h2>
            <p className="text-muted-foreground text-sm">
              {roles?.length ?? 0} roles, from platform-wide built-ins to organization-specific
              custom roles.
            </p>
          </div>
          <Button variant="primary" onClick={() => setCreateRoleOpen(true)}>
            <Plus />
            New custom role
          </Button>
        </div>

        {isRolesLoading ? <RoleListSkeleton /> : <RoleList roles={roles ?? []} />}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Feature flags</h2>
          <p className="text-muted-foreground text-sm">
            Roll out new platform capabilities gradually and gate access by feature.
          </p>
        </div>
        {isFlagsLoading ? <FeatureFlagListSkeleton /> : <FeatureFlagList flags={flags ?? []} />}
      </div>
    </div>
  );
}
