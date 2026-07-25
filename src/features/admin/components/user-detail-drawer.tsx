"use client";

/**
 * Rich detail view for a single admin user — mounted once by the page with
 * no props. Visibility and which user to show are both driven by the
 * store's `userDrawerId` (open === `userDrawerId !== null`), so any call
 * site that wants to open it just does `openUserDrawer(id)`.
 *
 * Mirrors `session-management/components/session-details-drawer.tsx`'s
 * pattern: a widened `Drawer` with `Tabs` for Overview / Roles & Teams /
 * Login History.
 *
 * <UserDetailDrawer />
 */

import { useState, type ReactNode } from "react";
import { Ban, UserCheck } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  useLoginHistoryQuery,
  useOrganizationsQuery,
  useRolesQuery,
  useTeamsQuery,
  useUserQuery,
} from "../hooks/use-admin-queries";
import { useAdminStore } from "../store/admin-store";
import { formatAbsoluteDate, formatRelativeDate } from "../lib/admin-format";
import { RoleBadge, UserStatusBadge } from "./admin-badges";
import type { UserStatus } from "../types";

type DrawerTabValue = "overview" | "roles" | "login-history";

const FIELD_LABEL_CLASS = "text-muted-foreground text-xs font-medium";

export function UserDetailDrawer({ className }: { className?: string }) {
  const userDrawerId = useAdminStore((state) => state.userDrawerId);
  const closeUserDrawer = useAdminStore((state) => state.closeUserDrawer);

  const { data: user, isLoading: isUserLoading } = useUserQuery(userDrawerId);
  const { data: organizations } = useOrganizationsQuery();
  const { data: roles } = useRolesQuery();
  const { data: teams } = useTeamsQuery();
  const { data: loginHistory, isLoading: isLoginHistoryLoading } =
    useLoginHistoryQuery(userDrawerId);

  const [tab, setTab] = useState<DrawerTabValue>("overview");
  const [lastOpenedId, setLastOpenedId] = useState(userDrawerId);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSeededForId, setRoleSeededForId] = useState<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<UserStatus | null>(null);

  // Reset local UI state whenever a different user is opened, and seed the
  // role-reassignment draft once that user's record has loaded. Adjusting
  // state during render (guarded against a previous-render value) instead
  // of in an effect avoids an extra cascading render pass.
  if (userDrawerId !== lastOpenedId) {
    setLastOpenedId(userDrawerId);
    setTab("overview");
    setStatusOverride(null);
  }
  if (user && roleSeededForId !== user.id) {
    setRoleSeededForId(user.id);
    setSelectedRoleId(user.roleId);
  }

  const organization = user
    ? organizations?.find((org) => org.id === user.organizationId)
    : undefined;
  const currentRole = user ? roles?.find((role) => role.id === user.roleId) : undefined;
  const selectedRole = roles?.find((role) => role.id === selectedRoleId);
  const userTeams = user ? (teams ?? []).filter((team) => user.teamIds.includes(team.id)) : [];
  const effectiveStatus: UserStatus = statusOverride ?? user?.status ?? "active";

  function handleSaveRole() {
    if (!user || !selectedRoleId || selectedRoleId === user.roleId) return;
    toast.success(`Role updated to ${selectedRole?.name ?? selectedRoleId}`, {
      description: `${user.name}'s role change isn't persisted to a backend yet.`,
    });
  }

  function handleToggleStatus() {
    if (!user) return;
    const next: UserStatus = effectiveStatus === "suspended" ? "active" : "suspended";
    setStatusOverride(next);
    toast.success(next === "suspended" ? `${user.name} suspended` : `${user.name} reactivated`);
  }

  return (
    <Drawer
      open={userDrawerId !== null}
      onClose={closeUserDrawer}
      side="right"
      title={user?.name ?? (isUserLoading ? "Loading user…" : "User details")}
      className={cn("max-w-2xl", className)}
      footer={
        <>
          <Button variant="ghost" onClick={closeUserDrawer}>
            Close
          </Button>
          {user && (
            <Button
              variant={effectiveStatus === "suspended" ? "secondary" : "outline"}
              onClick={handleToggleStatus}
            >
              {effectiveStatus === "suspended" ? (
                <>
                  <UserCheck className="size-4" strokeWidth={1.75} />
                  Reactivate user
                </>
              ) : (
                <>
                  <Ban className="size-4" strokeWidth={1.75} />
                  Suspend user
                </>
              )}
            </Button>
          )}
        </>
      }
    >
      {!user ? (
        <UserDetailSkeleton />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg" src={user.avatarSrc} alt={user.name} fallback={user.name} />
            <div className="flex flex-col gap-1">
              <span className="text-foreground text-base font-semibold">{user.name}</span>
              <span className="text-muted-foreground text-sm">{user.email}</span>
            </div>
            <UserStatusBadge status={effectiveStatus} className="ml-auto" />
          </div>

          <Tabs value={tab} onValueChange={(value) => setTab(value as DrawerTabValue)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="roles">Roles & Teams</TabsTrigger>
              <TabsTrigger value="login-history">Login History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Organization">{organization?.name ?? "—"}</Field>
                <Field label="Role">{currentRole ? <RoleBadge role={currentRole} /> : "—"}</Field>
                <Field label="Created">{formatAbsoluteDate(user.createdAt)}</Field>
                <Field label="Last active">
                  {user.lastActiveAt ? formatRelativeDate(user.lastActiveAt) : "Never"}
                </Field>
                <Field label="Two-factor auth">
                  {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                </Field>
                <Field label="User ID">{user.id}</Field>
              </div>
            </TabsContent>

            <TabsContent value="roles">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h3 className={FIELD_LABEL_CLASS}>Current role</h3>
                  {currentRole && <RoleBadge role={currentRole} />}
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className={FIELD_LABEL_CLASS}>Reassign role</h3>
                  <Select
                    options={(roles ?? []).map((role) => ({ value: role.id, label: role.name }))}
                    value={selectedRoleId ?? undefined}
                    onValueChange={setSelectedRoleId}
                    className="sm:max-w-xs"
                  />
                  <div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!selectedRoleId || selectedRoleId === user.roleId}
                      onClick={handleSaveRole}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className={FIELD_LABEL_CLASS}>Teams</h3>
                  {userTeams.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Not assigned to any team.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {userTeams.map((team) => (
                        <Badge key={team.id} variant="outline">
                          {team.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="login-history">
              {isLoginHistoryLoading ? (
                <LoginHistorySkeleton />
              ) : !loginHistory || loginHistory.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No login history recorded for this user.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {loginHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="border-border-subtle flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 rounded-full",
                            entry.outcome === "success"
                              ? "bg-success-600 dark:bg-success-500"
                              : "bg-danger-600 dark:bg-danger-500",
                          )}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground text-sm font-medium">
                            {entry.device}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {entry.location} · {entry.ipAddress}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-muted-foreground text-xs">
                          {formatAbsoluteDate(entry.timestamp)}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            entry.outcome === "success"
                              ? "text-success-600 dark:text-success-500"
                              : "text-danger-600 dark:text-danger-500",
                          )}
                        >
                          {entry.outcome === "success" ? "Success" : "Failed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <span className="text-foreground text-sm">{children}</span>
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginHistorySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-1.5 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
