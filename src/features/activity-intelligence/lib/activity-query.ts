import { isAfter, isSameDay, isYesterday, subDays } from "date-fns";
import { activityLabel } from "./activity-format";
import type { ActivityFilters, ActivityHistoryEntry } from "../types";

/** The Filter Engine — pure, testable, and shared by the history list, search bar, and filter bar. */
export function filterActivityHistory(
  entries: ActivityHistoryEntry[],
  filters: ActivityFilters,
): ActivityHistoryEntry[] {
  const query = filters.search.trim().toLowerCase();
  const now = new Date();

  return entries.filter((entry) => {
    if (filters.kind !== "all" && entry.kind !== filters.kind) return false;

    if (filters.datePreset !== "all") {
      const started = new Date(entry.startedAt);
      if (filters.datePreset === "today" && !isSameDay(started, now)) return false;
      if (filters.datePreset === "yesterday" && !isYesterday(started)) return false;
      if (filters.datePreset === "7d" && !isAfter(started, subDays(now, 7))) return false;
      if (filters.datePreset === "30d" && !isAfter(started, subDays(now, 30))) return false;
    }

    if (query) {
      const haystack =
        `${activityLabel(entry.kind)} ${entry.sessionName} ${entry.sessionId} ${entry.confidence}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

/** The Search Engine — instant search across activity, session, and confidence text, independent of the other filters. */
export function searchActivityHistory(
  entries: ActivityHistoryEntry[],
  query: string,
): ActivityHistoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((entry) =>
    `${activityLabel(entry.kind)} ${entry.sessionName} ${entry.sessionId} ${entry.confidence}`
      .toLowerCase()
      .includes(q),
  );
}
