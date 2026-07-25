"use client";

/**
 * Floating bulk-action pill (Notion/Linear-style), shown once one or more
 * rows are selected in `SessionTable`/`SessionGrid` via the shared
 * `useSessionManagementStore`. Renders nothing while `selectedIds` is empty.
 *
 * None of these actions have a real backend yet — each gives honest,
 * visible feedback via the toast system rather than silently doing nothing.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Download,
  FileOutput,
  MoreHorizontal,
  Share2,
  Tag,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { useSessionManagementStore } from "../store/session-management-store";
import { cn } from "@/lib/utils";

export interface BulkActionBarProps {
  className?: string;
}

interface BulkAction {
  key: string;
  label: string;
  icon: LucideIcon;
  destructive?: boolean;
  run: (count: number) => void;
}

function notify(action: string, count: number) {
  toast.info(`${action} isn't wired to a backend yet`, {
    description: `${count} session${count === 1 ? "" : "s"} selected.`,
  });
}

export function BulkActionBar({ className }: BulkActionBarProps) {
  const selectedIds = useSessionManagementStore((state) => state.selectedIds);
  const clearSelection = useSessionManagementStore((state) => state.clearSelection);
  const count = selectedIds.size;

  const primaryActions: BulkAction[] = [
    { key: "archive", label: "Archive", icon: Archive, run: (n) => notify("Archiving", n) },
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      destructive: true,
      run: (n) =>
        toast.warning("Deleting isn't wired to a backend yet", {
          description: `${n} session${n === 1 ? "" : "s"} selected.`,
        }),
    },
    {
      key: "download",
      label: "Download",
      icon: Download,
      run: (n) => toast.success(`Preparing ${n} session${n === 1 ? "" : "s"} for download`),
    },
    { key: "export", label: "Export", icon: FileOutput, run: (n) => notify("Exporting", n) },
  ];

  const moreActions: BulkAction[] = [
    { key: "share", label: "Share", icon: Share2, run: (n) => notify("Sharing", n) },
    { key: "tag", label: "Tag", icon: Tag, run: (n) => notify("Tagging", n) },
    { key: "move", label: "Move", icon: FileOutput, run: (n) => notify("Moving", n) },
    { key: "restore", label: "Restore", icon: ArchiveRestore, run: (n) => notify("Restoring", n) },
  ];

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="bulk-action-bar"
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
            onClick={clearSelection}
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
            {primaryActions.map((action) => (
              <Button
                key={action.key}
                type="button"
                variant={action.destructive ? "ghost" : "ghost"}
                size="sm"
                className={cn(action.destructive && "text-danger hover:bg-danger-bg")}
                onClick={() => action.run(count)}
              >
                <action.icon className="size-3.5" strokeWidth={1.75} />
                {action.label}
              </Button>
            ))}

            <DropdownMenu
              placement="top-end"
              trigger={
                <Button type="button" variant="ghost" size="sm">
                  <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
                  More
                </Button>
              }
            >
              {moreActions.map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  icon={action.icon}
                  onSelect={() => action.run(count)}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
