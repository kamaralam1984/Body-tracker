"use client";

/**
 * Two read-models over the same `ActivityHistoryEntry[]` — a premium list
 * view (`ActivityHistoryList`) and a dense `Table` view (`ActivityHistoryTable`),
 * switched by the store's `historyView`. Both apply the shared
 * `filterActivityHistory` engine (from `../lib/activity-query`) against the
 * store's current `filters` before paginating locally — filtering logic
 * itself is never reimplemented here.
 *
 * <ActivityHistoryList entries={historyQuery.data ?? []} />
 * <ActivityHistoryTable entries={historyQuery.data ?? []} />
 */

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ActivityConfidenceBadge } from "./activity-status-badge";
import { ActivityIcon } from "./activity-icon";
import { useActivityStore } from "../store/activity-store";
import { filterActivityHistory } from "../lib/activity-query";
import { activityLabel, formatAbsoluteTime, formatDurationLabel } from "../lib/activity-format";
import type { ActivityHistoryEntry } from "../types";

const PAGE_SIZE = 10;

function usePagedHistory(entries: ActivityHistoryEntry[]) {
  const filters = useActivityStore((state) => state.filters);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => filterActivityHistory(entries, filters), [entries, filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEntries = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return { filtered, pageEntries, page: safePage, totalPages, setPage };
}

function FavoriteToggle({ id, className }: { id: string; className?: string }) {
  const isFavorite = useActivityStore((state) => state.favoriteIds.has(id));
  const toggleFavorite = useActivityStore((state) => state.toggleFavorite);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(id)}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "text-muted-foreground hover:text-warning-600 dark:hover:text-warning-500 flex shrink-0 items-center justify-center transition-colors duration-150 focus-visible:outline-none",
        isFavorite && "text-warning-500",
        className,
      )}
    >
      <Star className={cn("size-4", isFavorite && "fill-current")} strokeWidth={1.75} />
    </button>
  );
}

export function ActivityHistoryList({
  entries,
  className,
}: {
  entries: ActivityHistoryEntry[];
  className?: string;
}) {
  const { filtered, pageEntries, page, totalPages, setPage } = usePagedHistory(entries);

  if (filtered.length === 0) {
    return (
      <p className={cn("text-muted-foreground py-6 text-center text-sm", className)}>
        No activity history matches the current filters.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="border-border divide-border flex flex-col divide-y rounded-xl border">
        {pageEntries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
              <ActivityIcon kind={entry.kind} className="size-4" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-foreground truncate text-sm font-medium">
                  {activityLabel(entry.kind)}
                </span>
                <span className="text-muted-foreground truncate text-xs">{entry.sessionName}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {formatAbsoluteTime(entry.startedAt)}
              </span>
            </div>

            <span className="text-foreground shrink-0 text-sm tabular-nums">
              {formatDurationLabel(entry.durationSeconds)}
            </span>

            <ActivityConfidenceBadge confidence={entry.confidence} className="shrink-0" />

            <FavoriteToggle id={entry.id} />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="self-center"
        />
      )}
    </div>
  );
}

export function ActivityHistoryTable({
  entries,
  className,
}: {
  entries: ActivityHistoryEntry[];
  className?: string;
}) {
  const { filtered, pageEntries, page, totalPages, setPage } = usePagedHistory(entries);

  if (filtered.length === 0) {
    return (
      <p className={cn("text-muted-foreground py-6 text-center text-sm", className)}>
        No activity history matches the current filters.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            <TableHead>Session</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Favorite</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageEntries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <ActivityIcon kind={entry.kind} className="size-4" />
                  <span className="font-medium">{activityLabel(entry.kind)}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{entry.sessionName}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatAbsoluteTime(entry.startedAt)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDurationLabel(entry.durationSeconds)}
              </TableCell>
              <TableCell>
                <ActivityConfidenceBadge confidence={entry.confidence} />
              </TableCell>
              <TableCell className="text-right">
                <FavoriteToggle id={entry.id} className="ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="self-center"
        />
      )}
    </div>
  );
}

export function ActivityHistorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="border-border divide-border flex flex-col divide-y rounded-xl border">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
