"use client";

/**
 * User Management table — wraps the shared `DataTable` with admin-user
 * specific columns and row actions. Receives an already-filtered `users`
 * array (the caller is expected to run `filterUsers` + the org-switcher's
 * `activeOrganizationId` scoping before passing rows in here — this
 * component is a pure display layer and does not refilter).
 *
 * None of the row actions (reset password, suspend, deactivate, delete)
 * have a real backend yet. Suspend/Deactivate give real optimistic-feeling
 * feedback via a local status override so the row visibly updates; Reset
 * password and Delete are honest stubs via the toast system.
 *
 * <UserTable users={filteredUsers} />
 */

import { useMemo, useState } from "react";
import {
  Ban,
  KeyRound,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { useOrganizationsQuery, useRolesQuery } from "../hooks/use-admin-queries";
import { useAdminStore } from "../store/admin-store";
import { formatAbsoluteDate, formatRelativeDate } from "../lib/admin-format";
import { RoleBadge, UserStatusBadge } from "./admin-badges";
import type { AdminUser, UserStatus } from "../types";

export interface UserTableProps {
  users: AdminUser[];
  className?: string;
}

export function UserTable({ users, className }: UserTableProps) {
  const { data: roles } = useRolesQuery();
  const { data: organizations } = useOrganizationsQuery();
  const openUserDrawer = useAdminStore((state) => state.openUserDrawer);
  const selectedUserIds = useAdminStore((state) => state.selectedUserIds);
  const toggleUserSelected = useAdminStore((state) => state.toggleUserSelected);

  // Local-only status overrides so Suspend/Reactivate/Deactivate feel real
  // without a backend to persist to — mock data (and store-created users)
  // are never mutated directly.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, UserStatus>>({});

  const roleMap = useMemo(() => new Map((roles ?? []).map((role) => [role.id, role])), [roles]);
  const orgMap = useMemo(
    () => new Map((organizations ?? []).map((org) => [org.id, org])),
    [organizations],
  );

  function effectiveStatus(user: AdminUser): UserStatus {
    return statusOverrides[user.id] ?? user.status;
  }

  function setStatus(user: AdminUser, status: UserStatus, message: string) {
    setStatusOverrides((prev) => ({ ...prev, [user.id]: status }));
    toast.success(message);
  }

  // DataTable's selection is a controlled `Set<string>` (`selected` /
  // `onSelectedChange`), but the store only exposes a per-id toggle — so a
  // "select all on page" click reconciles by toggling each id that changed.
  function handleSelectedChange(next: Set<string>) {
    selectedUserIds.forEach((id) => {
      if (!next.has(id)) toggleUserSelected(id);
    });
    next.forEach((id) => {
      if (!selectedUserIds.has(id)) toggleUserSelected(id);
    });
  }

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (user) => user.name,
      render: (user) => (
        <button
          type="button"
          onClick={() => openUserDrawer(user.id)}
          className="flex w-full items-center gap-3 text-left"
        >
          <Avatar size="sm" src={user.avatarSrc} alt={user.name} fallback={user.name} />
          <div className="flex min-w-0 flex-col">
            <span className="text-foreground truncate text-sm font-medium">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">{user.email}</span>
            <span className="text-muted-foreground/70 truncate text-[11px]">
              {orgMap.get(user.organizationId)?.name ?? "Unknown organization"}
            </span>
          </div>
        </button>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user) => {
        const role = roleMap.get(user.roleId);
        return role ? (
          <RoleBadge role={role} />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (user) => <UserStatusBadge status={effectiveStatus(user)} />,
    },
    {
      key: "lastActive",
      header: "Last active",
      sortable: true,
      sortValue: (user) => (user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0),
      render: (user) => (
        <span className="text-muted-foreground text-sm">
          {user.lastActiveAt ? formatRelativeDate(user.lastActiveAt) : "Never"}
        </span>
      ),
    },
    {
      key: "created",
      header: "Created",
      sortable: true,
      sortValue: (user) => new Date(user.createdAt).getTime(),
      render: (user) => (
        <span className="text-muted-foreground text-sm">{formatAbsoluteDate(user.createdAt)}</span>
      ),
    },
    {
      key: "twoFactor",
      header: "2FA",
      align: "center",
      render: (user) =>
        user.twoFactorEnabled ? (
          <ShieldCheck
            className="text-success-600 dark:text-success-500 mx-auto size-4"
            strokeWidth={1.75}
            aria-label="Two-factor authentication enabled"
          />
        ) : (
          <ShieldOff
            className="text-muted-foreground mx-auto size-4"
            strokeWidth={1.75}
            aria-label="Two-factor authentication disabled"
          />
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (user) => {
        const status = effectiveStatus(user);
        return (
          <DropdownMenu
            placement="bottom-end"
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${user.name}`}
              >
                <MoreHorizontal className="size-4" strokeWidth={1.75} />
              </Button>
            }
          >
            <DropdownMenuItem icon={UserCheck} onSelect={() => openUserDrawer(user.id)}>
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={KeyRound}
              onSelect={() =>
                toast.info("Password reset isn't wired to a backend yet", {
                  description: `An email would be sent to ${user.email}.`,
                })
              }
            >
              Reset password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {status === "suspended" ? (
              <DropdownMenuItem
                icon={UserCheck}
                onSelect={() => setStatus(user, "active", `${user.name} reactivated`)}
              >
                Reactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                icon={Ban}
                onSelect={() => setStatus(user, "suspended", `${user.name} suspended`)}
              >
                Suspend
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              icon={UserX}
              onSelect={() => setStatus(user, "deactivated", `${user.name} deactivated`)}
            >
              Deactivate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              icon={Trash2}
              destructive
              onSelect={() =>
                toast.info("Deletion needs confirmation — coming soon", {
                  description: `${user.name} was not deleted.`,
                })
              }
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DataTable
      data={users}
      columns={columns}
      getRowId={(user) => user.id}
      searchable
      searchPlaceholder="Search users…"
      searchKeys={(user) => `${user.name} ${user.email} ${user.id}`}
      selectable
      selected={selectedUserIds}
      onSelectedChange={handleSelectedChange}
      pageSize={10}
      emptyTitle="No users match your filters"
      emptyDescription="Try adjusting your search or filters."
      className={className}
    />
  );
}
