"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchActivityEvents,
  fetchApiKeys,
  fetchFeatureFlags,
  fetchInvoices,
  fetchLoginHistory,
  fetchOrganizationById,
  fetchOrganizations,
  fetchPlans,
  fetchRoles,
  fetchTeams,
  fetchUserById,
  fetchUsers,
} from "../lib/mock-admin-service";
import { useAdminStore } from "../store/admin-store";

export function useOrganizationsQuery() {
  const query = useQuery({ queryKey: ["admin", "organizations"], queryFn: fetchOrganizations });
  const created = useAdminStore((s) => s.createdOrganizations);
  const data = useMemo(
    () => (query.data ? [...created, ...query.data] : query.data),
    [query.data, created],
  );
  return { ...query, data };
}

export function useOrganizationQuery(id: string | null) {
  const created = useAdminStore((s) => s.createdOrganizations);
  const match = id ? created.find((o) => o.id === id) : undefined;
  const query = useQuery({
    queryKey: ["admin", "organization", id],
    queryFn: () => fetchOrganizationById(id as string),
    enabled: Boolean(id) && !match,
  });
  if (match) return { ...query, data: match, isLoading: false, isError: false };
  return query;
}

export function useUsersQuery() {
  const query = useQuery({ queryKey: ["admin", "users"], queryFn: fetchUsers });
  const created = useAdminStore((s) => s.createdUsers);
  const data = useMemo(
    () => (query.data ? [...created, ...query.data] : query.data),
    [query.data, created],
  );
  return { ...query, data };
}

export function useUserQuery(id: string | null) {
  const created = useAdminStore((s) => s.createdUsers);
  const match = id ? created.find((u) => u.id === id) : undefined;
  const query = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => fetchUserById(id as string),
    enabled: Boolean(id) && !match,
  });
  if (match) return { ...query, data: match, isLoading: false, isError: false };
  return query;
}

export function useLoginHistoryQuery(userId: string | null) {
  return useQuery({
    queryKey: ["admin", "login-history", userId],
    queryFn: () => fetchLoginHistory(userId as string),
    enabled: Boolean(userId),
  });
}

export function useTeamsQuery() {
  const query = useQuery({ queryKey: ["admin", "teams"], queryFn: fetchTeams });
  const created = useAdminStore((s) => s.createdTeams);
  const data = useMemo(
    () => (query.data ? [...created, ...query.data] : query.data),
    [query.data, created],
  );
  return { ...query, data };
}

export function useRolesQuery() {
  const query = useQuery({ queryKey: ["admin", "roles"], queryFn: fetchRoles });
  const created = useAdminStore((s) => s.createdRoles);
  const data = useMemo(
    () => (query.data ? [...created, ...query.data] : query.data),
    [query.data, created],
  );
  return { ...query, data };
}

export function useFeatureFlagsQuery() {
  return useQuery({ queryKey: ["admin", "feature-flags"], queryFn: fetchFeatureFlags });
}

export function useActivityEventsQuery() {
  return useQuery({ queryKey: ["admin", "activity-events"], queryFn: fetchActivityEvents });
}

export function useApiKeysQuery() {
  const query = useQuery({ queryKey: ["admin", "api-keys"], queryFn: fetchApiKeys });
  const created = useAdminStore((s) => s.createdApiKeys);
  const data = useMemo(
    () => (query.data ? [...created, ...query.data] : query.data),
    [query.data, created],
  );
  return { ...query, data };
}

export function usePlansQuery() {
  return useQuery({ queryKey: ["admin", "plans"], queryFn: fetchPlans });
}

export function useInvoicesQuery() {
  return useQuery({ queryKey: ["admin", "invoices"], queryFn: fetchInvoices });
}
