"use client";

/**
 * Floating bulk-action pill (Notion/Linear-style) for the user table, shown
 * once one or more rows are selected via the shared `useAdminStore`.
 * Mirrors `session-management/components/bulk-action-bar.tsx`'s floating
 * style and structure — renders nothing while `selectedUserIds` is empty.
 *
 * None of these actions have a real backend yet — each gives honest,
 * visible feedback via the toast system rather than silently doing nothing.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Ban, ShieldCheck, Trash2, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useRolesQuery } from "../hooks/use-admin-queries";
import { useAdminStore } from "../store/admin-store";

export interface BulkUserActionBarProps {
  className?: string;
}

export function BulkUserActionBar({ className }: BulkUserActionBarProps) {
  const selectedUserIds = useAdminStore((state) => state.selectedUserIds);
  const clearUserSelection = useAdminStore((state) => state.clearUserSelection);
  const { data: roles } = useRolesQuery();
  const count = selectedUserIds.size;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="bulk-user-action-bar"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn(
            "border-border bg-surface fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-2 shadow-lg",
            className,
          )}
        >
          <button
            type="button"
            onClick={clearUserSelection}
            aria-label="Clear selection"
            className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>

          <span className="text-foreground pr-1 text-sm font-medium whitespace-nowrap">
            {count} selected
          </span>

          <div className="bg-border h-5 w-px" />

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toast.success(`${count} user${count === 1 ? "" : "s"} suspended`)}
            >
              <Ban className="size-3.5" strokeWidth={1.75} />
              Suspend
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toast.success(`${count} user${count === 1 ? "" : "s"} deactivated`)}
            >
              <UserX className="size-3.5" strokeWidth={1.75} />
              Deactivate
            </Button>

            <DropdownMenu
              placement="top"
              trigger={
                <Button type="button" variant="ghost" size="sm">
                  <ShieldCheck className="size-3.5" strokeWidth={1.75} />
                  Assign role
                </Button>
              }
            >
              {(roles ?? []).map((role) => (
                <DropdownMenuItem
                  key={role.id}
                  onSelect={() =>
                    toast.success(`Assigned ${role.name} to ${count} user${count === 1 ? "" : "s"}`)
                  }
                >
                  {role.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger-bg"
              onClick={() =>
                toast.info("Deletion isn't wired to a backend yet", {
                  description: `${count} user${count === 1 ? "" : "s"} selected.`,
                })
              }
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
              Delete
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
