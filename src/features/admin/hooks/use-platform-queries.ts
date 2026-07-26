"use client";

/**
 * Real cross-org platform-admin data (`/api/v1/platform/*`) — deliberately
 * kept separate from `use-admin-queries.ts`, which is 100% mock data for
 * every other admin page (Organizations/Users/Teams/Roles/Billing/Logs).
 * Only `admin/api-keys` uses these — see INCOMPLETE.md for why the rest
 * of `/admin` stays mock (a real cross-org superadmin backend only exists
 * for API keys + the org list needed to filter by them, not full CRUD
 * parity across every admin surface).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetchJson } from "@/features/auth/lib/api-client";

export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  userCount: number;
  apiKeyCount: number;
}

interface PlatformOrganizationListResponse {
  items: PlatformOrganization[];
  nextCursor: string | null;
  total: number;
}

export function usePlatformOrganizationsQuery() {
  const query = useQuery({
    queryKey: ["platform", "organizations"],
    queryFn: () =>
      apiFetchJson<PlatformOrganizationListResponse>("/api/v1/platform/organizations?limit=100"),
  });
  return { ...query, data: query.data?.items };
}

export interface PlatformApiKey {
  id: string;
  orgId: string;
  organizationName: string;
  organizationSlug: string;
  userId: string | null;
  serviceAccountId: string | null;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: "active" | "revoked";
  rateLimitPerMinute: number;
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedReason: string | null;
  environment: string;
  keyType: string;
}

interface PlatformApiKeyListResponse {
  items: PlatformApiKey[];
  nextCursor: string | null;
  total: number;
}

const PLATFORM_API_KEYS_QUERY_KEY = ["platform", "api-keys"];

/** `orgId` narrows to one organization server-side — omit (or pass `undefined`) for the full cross-org list. */
export function usePlatformApiKeysQuery(orgId: string | undefined) {
  const query = useQuery({
    queryKey: [...PLATFORM_API_KEYS_QUERY_KEY, orgId ?? "all"],
    queryFn: () =>
      apiFetchJson<PlatformApiKeyListResponse>(
        `/api/v1/platform/api-keys?limit=100${orgId ? `&orgId=${encodeURIComponent(orgId)}` : ""}`,
      ),
  });
  return { ...query, data: query.data?.items };
}

export function useRevokePlatformApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiFetchJson<{ success: true }>(`/api/v1/platform/api-keys/${id}`, {
        method: "DELETE",
        body: reason ? JSON.stringify({ reason }) : undefined,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: PLATFORM_API_KEYS_QUERY_KEY, exact: false }),
  });
}
