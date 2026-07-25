/**
 * Pure filter/sort helpers for the session library. Kept framework-free so
 * they're trivially testable and so both the table and grid views (and any
 * future export/CSV path) can share the exact same semantics.
 *
 * The page is expected to call `filterSessions` then `sortSessions` on the
 * raw `useSessionsQuery()` result before handing rows to `SessionTable` /
 * `SessionGrid` — neither of those components filters or sorts internally.
 */

import { isAfter, isSameDay, isYesterday, subDays } from "date-fns";
import type { SessionFilters, SessionRecord, SessionSortField } from "../types";

/** Case-insensitive substring match against name, user, session id, and tags. */
function matchesSearch(session: SessionRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    session.name.toLowerCase().includes(q) ||
    session.user.name.toLowerCase().includes(q) ||
    session.id.toLowerCase().includes(q) ||
    session.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

function matchesDatePreset(session: SessionRecord, preset: SessionFilters["datePreset"]): boolean {
  if (preset === "all") return true;
  const created = new Date(session.createdAt);
  const now = new Date();
  switch (preset) {
    case "today":
      return isSameDay(created, now);
    case "yesterday":
      return isYesterday(created);
    case "7d":
      return isAfter(created, subDays(now, 7));
    case "30d":
      return isAfter(created, subDays(now, 30));
    default:
      return true;
  }
}

/** Applies search, status, quality, activity, and date-preset filters. */
export function filterSessions(
  sessions: SessionRecord[],
  filters: SessionFilters,
): SessionRecord[] {
  return sessions.filter((session) => {
    if (!matchesSearch(session, filters.search)) return false;
    if (filters.status !== "all" && session.status !== filters.status) return false;
    if (filters.quality !== "all" && session.quality !== filters.quality) return false;
    if (filters.activity !== "all" && session.activity !== filters.activity) return false;
    if (!matchesDatePreset(session, filters.datePreset)) return false;
    return true;
  });
}

/** Sorts a (typically already-filtered) list without mutating the input. */
export function sortSessions(sessions: SessionRecord[], field: SessionSortField): SessionRecord[] {
  const copy = [...sessions];
  switch (field) {
    case "newest":
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "oldest":
      return copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case "duration":
      return copy.sort((a, b) => b.durationSeconds - a.durationSeconds);
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "status":
      return copy.sort((a, b) => a.status.localeCompare(b.status));
    case "quality":
      return copy.sort((a, b) => a.quality.localeCompare(b.quality));
    case "user":
      return copy.sort((a, b) => a.user.name.localeCompare(b.user.name));
    default:
      return copy;
  }
}
