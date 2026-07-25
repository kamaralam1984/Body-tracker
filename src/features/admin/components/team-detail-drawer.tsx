"use client";

/**
 * Wide detail drawer for a single team. No props — reads `teamDrawerId` /
 * `closeTeamDrawer` from `useAdminStore` directly (open === `teamDrawerId
 * !== null`). There's no singular `useTeamQuery(id)` hook, so the full list
 * is fetched via `useTeamsQuery()` and matched locally, same technique the
 * store/hooks layer already uses for "created" records.
 */

import { UsersRound } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAdminStore } from "../store/admin-store";
import { useTeamsQuery, useUsersQuery } from "../hooks/use-admin-queries";
import { formatAbsoluteDate } from "../lib/admin-format";

export function TeamDetailDrawer({ className }: { className?: string }) {
  const teamDrawerId = useAdminStore((s) => s.teamDrawerId);
  const closeTeamDrawer = useAdminStore((s) => s.closeTeamDrawer);
  const { data: teams, isLoading: teamsLoading } = useTeamsQuery();
  const { data: users, isLoading: usersLoading } = useUsersQuery();

  const open = teamDrawerId !== null;
  const team = teamDrawerId ? teams?.find((t) => t.id === teamDrawerId) : undefined;
  const manager = team?.managerId ? users?.find((u) => u.id === team.managerId) : undefined;
  const members = team ? (users ?? []).filter((u) => team.memberIds.includes(u.id)) : [];
  const stillResolving = open && !team && teamsLoading;

  return (
    <Drawer
      open={open}
      onClose={closeTeamDrawer}
      title={team ? team.name : stillResolving ? "Loading team…" : "Team not found"}
      description={team?.department}
      className={cn("max-w-2xl", className)}
      footer={
        <>
          <Button variant="secondary" onClick={closeTeamDrawer}>
            Close
          </Button>
          <Button
            onClick={() => toast.info("Team membership changes aren't wired to a backend yet")}
          >
            Add member
          </Button>
        </>
      }
    >
      {stillResolving ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : !team ? (
        <p className="text-muted-foreground text-sm">This team could not be found.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="border-border-subtle grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Projects
              </span>
              <span className="text-foreground font-medium">{team.projectCount}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Created
              </span>
              <span className="text-foreground font-medium">
                {formatAbsoluteDate(team.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Manager
            </span>
            {manager ? (
              <div className="flex items-center gap-3">
                <Avatar src={manager.avatarSrc} fallback={manager.name} size="md" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-foreground truncate text-sm font-medium">
                    {manager.name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">{manager.email}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No manager assigned</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Members ({team.memberIds.length})
            </span>
            {usersLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length > 0 ? (
              <div className="flex flex-col gap-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar src={member.avatarSrc} fallback={member.name} size="md" />
                    <div className="flex min-w-0 flex-col">
                      <span className="text-foreground truncate text-sm font-medium">
                        {member.name}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">{member.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <UsersRound className="text-muted-foreground/50 size-6" strokeWidth={1.5} />
                <p className="text-muted-foreground text-sm">No members in this team yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
