"use client";

/**
 * Settings-style list of roles (GitHub team-roles page style, not a raw
 * table). Each row expands inline — Framer Motion height animation — to
 * reveal a compact read-only summary of that role's granted permissions,
 * grouped by resource, skipping resources with nothing granted.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Crown, Shield, ShieldCheck, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PERMISSION_RESOURCES } from "../types";
import type { Role } from "../types";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const ROLE_ICON: Record<string, LucideIcon> = {
  owner: Crown,
  "super-admin": ShieldCheck,
};

function RoleRow({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const Icon = ROLE_ICON[role.id] ?? Shield;
  const grantedSummary = PERMISSION_RESOURCES.map((resource) => ({
    resource,
    actions: role.permissions[resource],
  })).filter((entry) => entry.actions.length > 0);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="hover:bg-muted/40 flex w-full items-center gap-4 p-4 text-left transition-colors duration-150"
      >
        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-foreground truncate text-sm font-medium">{role.name}</p>
            {role.isCustom && (
              <Badge variant="outline" className="shrink-0">
                Custom
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground truncate text-sm">{role.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {role.memberCount} {role.memberCount === 1 ? "member" : "members"}
          </span>
          <span className="text-muted-foreground hidden items-center gap-1 text-sm sm:inline-flex">
            View permissions
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="inline-flex"
            >
              <ChevronDown className="size-4" />
            </motion.span>
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="inline-flex sm:hidden"
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-border-subtle border-t px-4 py-4 pl-[4.25rem]">
              {grantedSummary.length === 0 ? (
                <p className="text-muted-foreground text-sm">No permissions granted.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {grantedSummary.map(({ resource, actions }) => (
                    <li key={resource} className="text-sm">
                      <span className="text-foreground font-medium">{capitalize(resource)}:</span>{" "}
                      <span className="text-muted-foreground">
                        {actions.map((action) => capitalize(action)).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function RoleList({ roles, className }: { roles: Role[]; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {roles.map((role) => (
        <RoleRow key={role.id} role={role} />
      ))}
    </div>
  );
}

export function RoleListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-64" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </Card>
      ))}
    </div>
  );
}
