import { isAfter, isSameDay, isYesterday, subDays } from "date-fns";
import type {
  ActivityEvent,
  AdminFilters,
  AdminUser,
  ApiKey,
  Invoice,
  Organization,
  Team,
} from "../types";

/** The Filter Engine — one generic implementation shared by every admin entity table, parameterized by small accessor callbacks instead of being reimplemented per entity. */
export function filterByAdminFilters<T>(
  items: T[],
  filters: AdminFilters,
  accessors: {
    getOrgId?: (item: T) => string;
    getStatus?: (item: T) => string;
    getDate?: (item: T) => string;
    getSearchHaystack: (item: T) => string;
  },
): T[] {
  const query = filters.search.trim().toLowerCase();
  const now = new Date();

  return items.filter((item) => {
    if (
      filters.organizationId !== "all" &&
      accessors.getOrgId &&
      accessors.getOrgId(item) !== filters.organizationId
    ) {
      return false;
    }
    if (
      filters.status !== "all" &&
      accessors.getStatus &&
      accessors.getStatus(item) !== filters.status
    ) {
      return false;
    }
    if (filters.datePreset !== "all" && accessors.getDate) {
      const date = new Date(accessors.getDate(item));
      if (filters.datePreset === "today" && !isSameDay(date, now)) return false;
      if (filters.datePreset === "yesterday" && !isYesterday(date)) return false;
      if (filters.datePreset === "7d" && !isAfter(date, subDays(now, 7))) return false;
      if (filters.datePreset === "30d" && !isAfter(date, subDays(now, 30))) return false;
      if (filters.datePreset === "90d" && !isAfter(date, subDays(now, 90))) return false;
    }
    if (query && !accessors.getSearchHaystack(item).toLowerCase().includes(query)) return false;
    return true;
  });
}

export function filterUsers(users: AdminUser[], filters: AdminFilters): AdminUser[] {
  return filterByAdminFilters(users, filters, {
    getOrgId: (u) => u.organizationId,
    getStatus: (u) => u.status,
    getDate: (u) => u.createdAt,
    getSearchHaystack: (u) => `${u.name} ${u.email} ${u.id}`,
  });
}

export function filterOrganizations(orgs: Organization[], filters: AdminFilters): Organization[] {
  return filterByAdminFilters(orgs, filters, {
    getStatus: (o) => o.status,
    getDate: (o) => o.createdAt,
    getSearchHaystack: (o) => `${o.name} ${o.domain} ${o.slug} ${o.id}`,
  });
}

export function filterTeams(teams: Team[], filters: AdminFilters): Team[] {
  return filterByAdminFilters(teams, filters, {
    getOrgId: (t) => t.organizationId,
    getDate: (t) => t.createdAt,
    getSearchHaystack: (t) => `${t.name} ${t.department} ${t.id}`,
  });
}

export function filterApiKeys(keys: ApiKey[], filters: AdminFilters): ApiKey[] {
  return filterByAdminFilters(keys, filters, {
    getOrgId: (k) => k.organizationId,
    getStatus: (k) => k.status,
    getDate: (k) => k.createdAt,
    getSearchHaystack: (k) => `${k.name} ${k.id} ${k.prefix}${k.lastFour}`,
  });
}

/** `filters.status` doubles as the activity/audit category filter here (`"activity" | "audit" | "all"`) — `ActivityEvent` has no other natural "status" concept. */
export function filterActivityEvents(
  events: ActivityEvent[],
  filters: AdminFilters,
): ActivityEvent[] {
  return filterByAdminFilters(events, filters, {
    getOrgId: (e) => e.organizationId,
    getStatus: (e) => e.category,
    getDate: (e) => e.timestamp,
    getSearchHaystack: (e) => `${e.actor.name} ${e.description} ${e.target} ${e.ipAddress}`,
  });
}

export function filterInvoices(invoices: Invoice[], filters: AdminFilters): Invoice[] {
  return filterByAdminFilters(invoices, filters, {
    getOrgId: (i) => i.organizationId,
    getStatus: (i) => i.status,
    getDate: (i) => i.issuedAt,
    getSearchHaystack: (i) => `${i.number} ${i.periodLabel} ${i.id}`,
  });
}
