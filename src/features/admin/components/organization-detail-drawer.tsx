"use client";

/**
 * Rich detail view for a single organization — mounted once by the page with
 * no props. Visibility and which organization to show are both driven by the
 * store's `orgDrawerId` (open === `orgDrawerId !== null`), so any call site
 * that wants to open it just does `openOrgDrawer(id)`. Mirrors
 * `session-management/components/session-details-drawer.tsx`'s pattern.
 *
 * <OrganizationDetailDrawer />
 */

import { useState } from "react";
import { Globe } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useOrganizationQuery, useTeamsQuery, useUsersQuery } from "../hooks/use-admin-queries";
import { useAdminStore } from "../store/admin-store";
import { formatAbsoluteDate, formatStorage } from "../lib/admin-format";
import { OrgPlanBadge, OrgStatusBadge } from "./admin-badges";
import { OrganizationLogoTile } from "./organization-card";

type DrawerTabValue = "overview" | "members" | "teams" | "branding";

const FIELD_LABEL_CLASS = "text-muted-foreground text-xs font-medium";

function formatRoleLabel(roleId: string): string {
  return roleId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function usageVariant(used: number, limit: number): "accent" | "warning" {
  if (limit <= 0) return "accent";
  return used / limit >= 0.85 ? "warning" : "accent";
}

export function OrganizationDetailDrawer({ className }: { className?: string }) {
  const orgDrawerId = useAdminStore((state) => state.orgDrawerId);
  const closeOrgDrawer = useAdminStore((state) => state.closeOrgDrawer);

  const { data: organization, isLoading: isOrgLoading } = useOrganizationQuery(orgDrawerId);
  const { data: users, isLoading: isUsersLoading } = useUsersQuery();
  const { data: teams, isLoading: isTeamsLoading } = useTeamsQuery();

  const [tab, setTab] = useState<DrawerTabValue>("overview");
  const [lastOpenedId, setLastOpenedId] = useState(orgDrawerId);

  // Reset the active tab whenever a different organization is opened.
  if (orgDrawerId !== lastOpenedId) {
    setLastOpenedId(orgDrawerId);
    setTab("overview");
  }

  const members = organization
    ? (users ?? []).filter((u) => u.organizationId === organization.id)
    : [];
  const orgTeams = organization
    ? (teams ?? []).filter((t) => t.organizationId === organization.id)
    : [];

  return (
    <Drawer
      open={orgDrawerId !== null}
      onClose={closeOrgDrawer}
      side="right"
      title={
        organization?.name ?? (isOrgLoading ? "Loading organization…" : "Organization details")
      }
      description={organization?.domain}
      className={cn("max-w-3xl", className)}
      footer={
        <>
          <Button variant="ghost" onClick={closeOrgDrawer}>
            Close
          </Button>
          {organization && (
            <Button
              variant="secondary"
              onClick={() => toast.info("Editing isn't wired to a backend yet")}
            >
              Edit organization
            </Button>
          )}
        </>
      }
    >
      {!organization ? (
        <OrganizationDetailsSkeleton />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <OrganizationLogoTile initial={organization.logoInitial} className="size-14 text-xl" />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <OrgStatusBadge status={organization.status} />
                <OrgPlanBadge plan={organization.plan} />
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(value) => setTab(value as DrawerTabValue)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="branding">Domains & Branding</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Name">{organization.name}</Field>
                  <Field label="Domain">{organization.domain}</Field>
                  <Field label="Billing email">{organization.billingEmail}</Field>
                  <Field label="Custom domain">
                    {organization.customDomain ?? "Not configured"}
                  </Field>
                  <Field label="Created">{formatAbsoluteDate(organization.createdAt)}</Field>
                  <Field label="Organization ID">{organization.id}</Field>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">Seats</span>
                      <span className="text-muted-foreground">
                        {organization.seatsUsed}/{organization.seatsLimit}
                      </span>
                    </div>
                    <Progress
                      value={organization.seatsUsed}
                      max={organization.seatsLimit}
                      size="lg"
                      variant={usageVariant(organization.seatsUsed, organization.seatsLimit)}
                      showValue
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">Storage</span>
                      <span className="text-muted-foreground">
                        {formatStorage(organization.storageUsedGb)}/
                        {formatStorage(organization.storageLimitGb)}
                      </span>
                    </div>
                    <Progress
                      value={organization.storageUsedGb}
                      max={organization.storageLimitGb}
                      size="lg"
                      variant={usageVariant(
                        organization.storageUsedGb,
                        organization.storageLimitGb,
                      )}
                      showValue
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="members">
              {isUsersLoading ? (
                <MembersSkeleton />
              ) : members.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">No members yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2.5">
                      <Avatar
                        size="sm"
                        src={member.avatarSrc}
                        alt={member.name}
                        fallback={member.name}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-foreground truncate text-sm font-medium">
                          {member.name}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {member.email}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatRoleLabel(member.roleId)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="teams">
              {isTeamsLoading ? (
                <TeamsSkeleton />
              ) : orgTeams.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">No teams yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {orgTeams.map((team) => (
                    <div
                      key={team.id}
                      className="border-border-subtle flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground text-sm font-medium">{team.name}</span>
                        <span className="text-muted-foreground text-xs">{team.department}</span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-4 text-xs">
                        <span>{team.memberIds.length} members</span>
                        <span>{team.projectCount} projects</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="branding">
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Domain">{organization.domain}</Field>
                  <Field label="Custom domain">
                    {organization.customDomain ?? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.info("Custom domains aren't connected yet")}
                      >
                        <Globe />
                        Add custom domain
                      </Button>
                    )}
                  </Field>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className={FIELD_LABEL_CLASS}>Branding preview</h3>
                  <div className="border-border flex items-center gap-3 rounded-lg border p-4">
                    <OrganizationLogoTile
                      initial={organization.logoInitial}
                      className="size-14 text-xl"
                    />
                    <div className="flex flex-col">
                      <span className="text-foreground text-sm font-semibold">
                        {organization.name}
                      </span>
                      <span className="text-muted-foreground text-xs">{organization.domain}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <span className="text-foreground text-sm">{children}</span>
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-2.5">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function OrganizationDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 shrink-0 rounded-lg" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
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
