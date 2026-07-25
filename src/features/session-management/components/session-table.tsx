"use client";

/**
 * Virtualized session library table (Dropbox/Stripe Dashboard density).
 *
 * Real row virtualization via `@tanstack/react-virtual`'s `useVirtualizer`:
 * only the rows in (or near) the viewport are ever mounted, each absolutely
 * positioned inside a `height: totalSize` body and translated into place
 * with `transform: translateY(...)` — the standard pattern for virtualizing
 * an HTML table (`<table>`/`<thead>`/`<tbody>` switched to `display: grid`,
 * `<tr>` switched to `display: flex` + `position: absolute`, matching
 * TanStack's own reference implementation). Column widths are declared once
 * in `COLUMNS` and shared between the sticky header and every body row so
 * they stay pixel-aligned.
 *
 * Sorting is NOT done here: the parent owns `sortField` (surfaced via
 * `SessionFilterBar`'s sort `Select`) and passes already-sorted `sessions`
 * in — this component only renders whatever order it receives.
 */

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoreHorizontal, Star } from "lucide-react";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { SessionStatusBadge, SessionQualityBadge } from "./session-status-badge";
import { useSessionManagementStore } from "../store/session-management-store";
import { formatClockTime, formatRelativeDate } from "../lib/session-format";
import { cn } from "@/lib/utils";
import type { SessionRecord, SessionSortField } from "../types";

const ROW_HEIGHT = 64;

const COLUMNS = [
  { key: "select", label: "", width: 44, grow: false },
  { key: "name", label: "Name", width: 260, grow: true },
  { key: "user", label: "User", width: 190, grow: false },
  { key: "status", label: "Status", width: 130, grow: false },
  { key: "quality", label: "Quality", width: 140, grow: false },
  { key: "duration", label: "Duration", width: 100, grow: false },
  { key: "activity", label: "Activity", width: 110, grow: false },
  { key: "created", label: "Created", width: 150, grow: false },
  { key: "actions", label: "", width: 48, grow: false },
] as const;

function colStyle(width: number, grow: boolean): React.CSSProperties {
  return { flex: grow ? "1 1 auto" : `0 0 ${width}px`, minWidth: width };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface SessionTableProps {
  sessions: SessionRecord[];
  sortField: SessionSortField;
  className?: string;
}

export function SessionTable({ sessions, className }: SessionTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedIds = useSessionManagementStore((state) => state.selectedIds);
  const toggleSelected = useSessionManagementStore((state) => state.toggleSelected);
  const starredIds = useSessionManagementStore((state) => state.starredIds);
  const toggleStarred = useSessionManagementStore((state) => state.toggleStarred);
  const openDetails = useSessionManagementStore((state) => state.openDetails);

  const rowVirtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const isStarred = useMemo(
    () => (session: SessionRecord) => starredIds.has(session.id) || session.starred,
    [starredIds],
  );

  function handleArchive(session: SessionRecord) {
    toast.info("Archiving isn't wired to a backend yet", {
      description: `"${session.name}" was not archived.`,
    });
  }

  function handleDelete(session: SessionRecord) {
    toast.info("Deleting isn't wired to a backend yet", {
      description: `"${session.name}" was not deleted.`,
    });
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        ref={scrollRef}
        className="border-border max-h-[600px] w-full overflow-auto rounded-xl border"
      >
        <table className="w-full caption-bottom text-sm" style={{ display: "grid" }}>
          <TableHeader className="bg-muted/50 sticky top-0 z-10" style={{ display: "grid" }}>
            <TableRow className="hover:bg-transparent" style={{ display: "flex", width: "100%" }}>
              {COLUMNS.map((column) => (
                <TableHead
                  key={column.key}
                  className="flex items-center"
                  style={colStyle(column.width, column.grow)}
                >
                  {column.key === "select" || column.key === "actions" ? (
                    <span className="sr-only">
                      {column.key === "select" ? "Select" : "Actions"}
                    </span>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody
            style={{ display: "grid", position: "relative", height: totalSize, width: "100%" }}
          >
            {virtualRows.map((virtualRow) => {
              const session = sessions[virtualRow.index];
              if (!session) return null;
              const selected = selectedIds.has(session.id);
              const starred = isStarred(session);

              return (
                <TableRow
                  key={session.id}
                  data-state={selected ? "selected" : undefined}
                  onClick={() => openDetails(session.id)}
                  style={{
                    display: "flex",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="cursor-pointer"
                >
                  <TableCell
                    className="flex items-center"
                    style={colStyle(COLUMNS[0].width, COLUMNS[0].grow)}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Checkbox
                      checked={selected}
                      onChange={() => toggleSelected(session.id)}
                      aria-label={`Select ${session.name}`}
                    />
                  </TableCell>
                  <TableCell
                    className="flex items-center overflow-hidden"
                    style={colStyle(COLUMNS[1].width, COLUMNS[1].grow)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleStarred(session.id);
                        }}
                        aria-label={starred ? "Unstar session" : "Star session"}
                        aria-pressed={starred}
                        className="text-muted-foreground hover:text-warning-500 shrink-0 transition-colors duration-150 focus-visible:outline-none"
                      >
                        <Star
                          className={cn("size-4", starred && "fill-warning-500 text-warning-500")}
                          strokeWidth={1.75}
                        />
                      </button>
                      <span className="text-foreground truncate font-medium">{session.name}</span>
                    </div>
                  </TableCell>
                  <TableCell
                    className="flex items-center overflow-hidden"
                    style={colStyle(COLUMNS[2].width, COLUMNS[2].grow)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar
                        src={session.user.avatarSrc}
                        alt={session.user.name}
                        fallback={session.user.name}
                        size="sm"
                      />
                      <span className="text-foreground truncate">{session.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell
                    className="flex items-center"
                    style={colStyle(COLUMNS[3].width, COLUMNS[3].grow)}
                  >
                    <SessionStatusBadge status={session.status} />
                  </TableCell>
                  <TableCell
                    className="flex items-center"
                    style={colStyle(COLUMNS[4].width, COLUMNS[4].grow)}
                  >
                    <SessionQualityBadge quality={session.quality} />
                  </TableCell>
                  <TableCell
                    className="flex items-center tabular-nums"
                    style={colStyle(COLUMNS[5].width, COLUMNS[5].grow)}
                  >
                    {formatClockTime(session.durationSeconds)}
                  </TableCell>
                  <TableCell
                    className="flex items-center"
                    style={colStyle(COLUMNS[6].width, COLUMNS[6].grow)}
                  >
                    {capitalize(session.activity)}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground flex items-center"
                    style={colStyle(COLUMNS[7].width, COLUMNS[7].grow)}
                  >
                    {formatRelativeDate(session.createdAt)}
                  </TableCell>
                  <TableCell
                    className="flex items-center justify-end"
                    style={colStyle(COLUMNS[8].width, COLUMNS[8].grow)}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu
                      placement="bottom-end"
                      trigger={
                        <button
                          type="button"
                          aria-label="Session actions"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-none"
                        >
                          <MoreHorizontal className="size-4" strokeWidth={1.75} />
                        </button>
                      }
                    >
                      <DropdownMenuItem onSelect={() => openDetails(session.id)}>
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggleStarred(session.id)}>
                        {starred ? "Unstar" : "Star"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleArchive(session)}>
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => handleDelete(session)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>
      {sessions.length === 0 && (
        <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
          No sessions match the current filters.
        </div>
      )}
    </div>
  );
}
