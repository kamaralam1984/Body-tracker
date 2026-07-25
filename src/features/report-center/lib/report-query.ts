import { isAfter, isSameDay, isYesterday, subDays } from "date-fns";
import { reportSearchHaystack } from "./mock-report-center-service";
import type { ReportFilters, ReportRecord, ReportTabValue } from "../types";

/** The Filter Engine — pure and shared by every library view (grid/table/tabs). */
export function filterReports(reports: ReportRecord[], filters: ReportFilters): ReportRecord[] {
  const query = filters.search.trim().toLowerCase();
  const now = new Date();

  return reports.filter((report) => {
    if (filters.kind !== "all" && report.kind !== filters.kind) return false;
    if (filters.template !== "all" && report.template !== filters.template) return false;

    if (filters.datePreset !== "all") {
      const created = new Date(report.createdAt);
      if (filters.datePreset === "today" && !isSameDay(created, now)) return false;
      if (filters.datePreset === "yesterday" && !isYesterday(created)) return false;
      if (filters.datePreset === "7d" && !isAfter(created, subDays(now, 7))) return false;
      if (filters.datePreset === "30d" && !isAfter(created, subDays(now, 30))) return false;
      if (filters.datePreset === "90d" && !isAfter(created, subDays(now, 90))) return false;
    }

    if (query && !reportSearchHaystack(report).includes(query)) return false;

    return true;
  });
}

/** The Search Engine — instant search across title, kind, author, and ID, independent of the other filters. */
export function searchReports(reports: ReportRecord[], query: string): ReportRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return reports;
  return reports.filter((report) => reportSearchHaystack(report).includes(q));
}

export function filterReportsByTab(reports: ReportRecord[], tab: ReportTabValue): ReportRecord[] {
  const now = Date.now();
  switch (tab) {
    case "recent":
      return reports.filter(
        (r) => !r.scheduled && now - new Date(r.createdAt).getTime() < 7 * 86_400_000,
      );
    case "favorites":
      return reports.filter((r) => r.favorite);
    case "shared":
      return reports.filter((r) => r.shared);
    case "scheduled":
      return reports.filter((r) => r.scheduled);
    case "archived":
      return reports.filter((r) => r.archived);
    case "all":
    case "templates":
      return reports;
    default:
      return reports;
  }
}
