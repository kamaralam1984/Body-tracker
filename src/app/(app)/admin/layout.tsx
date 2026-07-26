"use client";

import { AdminLayout } from "@/components/layout/admin-layout";
import {
  CreateOrganizationDialog,
  CreateRoleDialog,
  CreateTeamDialog,
  InviteUserDialog,
  OrganizationDetailDrawer,
  OrganizationSwitcher,
  TeamDetailDrawer,
  UserDetailDrawer,
} from "@/features/admin";

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-muted-foreground text-sm">
            The command center for organizations, users, roles, and platform operations.
          </p>
        </div>
        <OrganizationSwitcher />
      </div>

      <AdminLayout>{children}</AdminLayout>

      <InviteUserDialog />
      <CreateOrganizationDialog />
      <CreateTeamDialog />
      <CreateRoleDialog />
      <UserDetailDrawer />
      <OrganizationDetailDrawer />
      <TeamDetailDrawer />
    </div>
  );
}
