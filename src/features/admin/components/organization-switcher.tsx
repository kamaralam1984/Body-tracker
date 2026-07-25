"use client";

/**
 * Header org-context switcher for the admin console. Mirrors the visual
 * technique of `ProfileMenu` — a compact trigger opening a `DropdownMenu` —
 * but lists organizations instead of profile actions. Mount once near the
 * top of the admin section (e.g. a shared admin page header); it is fully
 * self-contained, reading/writing `activeOrganizationId` directly from
 * `useAdminStore`.
 */

import { ChevronsUpDown, Layers } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useOrganizationsQuery } from "../hooks/use-admin-queries";
import { useAdminStore } from "../store/admin-store";
import { OrgPlanBadge } from "./admin-badges";

function LogoTile({ initial, className }: { initial: string; className?: string }) {
  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground ring-border-subtle flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ring-1 ring-inset",
        className,
      )}
    >
      {initial}
    </span>
  );
}

export function OrganizationSwitcher({ className }: { className?: string }) {
  const activeOrganizationId = useAdminStore((s) => s.activeOrganizationId);
  const setActiveOrganizationId = useAdminStore((s) => s.setActiveOrganizationId);
  const { data: organizations } = useOrganizationsQuery();

  const activeOrg =
    activeOrganizationId !== "all"
      ? organizations?.find((org) => org.id === activeOrganizationId)
      : undefined;

  return (
    <DropdownMenu
      placement="bottom-start"
      className="w-72"
      trigger={
        <button
          type="button"
          aria-label="Switch organization"
          className={cn(
            "border-border bg-surface hover:bg-muted text-foreground flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors duration-150",
            className,
          )}
        >
          {activeOrg ? (
            <LogoTile initial={activeOrg.logoInitial} />
          ) : (
            <span className="bg-muted text-muted-foreground ring-border-subtle flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset">
              <Layers className="size-3.5" strokeWidth={1.75} />
            </span>
          )}
          <span className="max-w-[10rem] truncate">
            {activeOrg ? activeOrg.name : "All organizations"}
          </span>
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" strokeWidth={1.75} />
        </button>
      }
    >
      <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
      <DropdownMenuItem
        icon={Layers}
        onSelect={() => setActiveOrganizationId("all")}
        className={cn(activeOrganizationId === "all" && "bg-muted")}
      >
        All organizations
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {organizations?.map((org) => (
        <DropdownMenuItem
          key={org.id}
          onSelect={() => setActiveOrganizationId(org.id)}
          className={cn("justify-between", activeOrganizationId === org.id && "bg-muted")}
        >
          <span className="flex min-w-0 items-center gap-2">
            <LogoTile initial={org.logoInitial} />
            <span className="truncate">{org.name}</span>
          </span>
          <OrgPlanBadge plan={org.plan} className="shrink-0" />
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  );
}
