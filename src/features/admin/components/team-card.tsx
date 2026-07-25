"use client";

/**
 * A single team tile for the team-management card grid — mirrors
 * `session-management/components/session-card.tsx`'s premium identity-tile
 * pattern (department icon tile, name/subtitle, avatar stack, hover lift)
 * rather than a raw table row. Clicking opens the team detail drawer via
 * `useAdminStore`.
 */

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Code2,
  Database,
  Headset,
  Megaphone,
  Package,
  Palette,
  Settings2,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { AvatarGroup } from "@/components/ui/avatar-extras";
import { cn } from "@/lib/utils";
import { useAdminStore } from "../store/admin-store";
import { useUsersQuery } from "../hooks/use-admin-queries";
import { formatRelativeDate } from "../lib/admin-format";
import type { Team } from "../types";

/** Department → icon lookup; unmapped departments fall back to a generic briefcase. */
const DEPARTMENT_ICON: Record<string, LucideIcon> = {
  Engineering: Code2,
  Design: Palette,
  Marketing: Megaphone,
  Support: Headset,
  Sales: TrendingUp,
  Operations: Settings2,
  "Data Science": Database,
  Product: Package,
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function TeamCard({ team, className }: { team: Team; className?: string }) {
  const openTeamDrawer = useAdminStore((s) => s.openTeamDrawer);
  const { data: users } = useUsersQuery();

  const DepartmentIcon = DEPARTMENT_ICON[team.department] ?? Briefcase;
  const members = (users ?? []).filter((u) => team.memberIds.includes(u.id));
  const manager = team.managerId ? (users ?? []).find((u) => u.id === team.managerId) : undefined;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={cn("group", className)}
    >
      <Card
        interactive
        onClick={() => openTeamDrawer(team.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openTeamDrawer(team.id);
          }
        }}
        className="flex flex-col gap-4 p-4 transition-shadow duration-200 hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <div className="bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200 flex size-11 shrink-0 items-center justify-center rounded-lg">
            <DepartmentIcon className="size-5" strokeWidth={1.75} />
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="text-foreground truncate text-sm font-semibold" title={team.name}>
              {team.name}
            </p>
            <span className="text-muted-foreground text-xs">{team.department}</span>
          </div>
        </div>

        {members.length > 0 ? (
          <AvatarGroup max={4} size="sm">
            {members.map((member) => (
              <Avatar key={member.id} src={member.avatarSrc} fallback={member.name} size="sm" />
            ))}
          </AvatarGroup>
        ) : (
          <p className="text-muted-foreground text-xs">No members yet</p>
        )}

        <p className="text-muted-foreground truncate text-xs">
          Manager: {manager ? manager.name : "No manager assigned"}
        </p>

        <div className="border-border-subtle flex items-center justify-between border-t pt-3 text-xs">
          <span className="text-foreground font-medium">
            {team.projectCount} {team.projectCount === 1 ? "project" : "projects"}
          </span>
          <span className="text-muted-foreground">{formatRelativeDate(team.createdAt)}</span>
        </div>
      </Card>
    </motion.div>
  );
}
