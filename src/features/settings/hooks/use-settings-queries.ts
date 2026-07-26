"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchBackupCodes,
  fetchConsentSettings,
  fetchDevices,
  fetchIntegrations,
  fetchLoginHistory,
  fetchPasskeys,
  fetchWebhookDeliveries,
  fetchWebhooks,
} from "../lib/mock-settings-service";
import { useSettingsStore } from "../store/settings-store";
import { apiFetchJson } from "@/features/auth/lib/api-client";
import type { PersonalApiKey, RevokeReason } from "../types";

export function useDevicesQuery() {
  const query = useQuery({ queryKey: ["settings", "devices"], queryFn: fetchDevices });
  const removed = useSettingsStore((s) => s.removedDeviceIds);
  const trustOverrides = useSettingsStore((s) => s.deviceTrustOverrides);
  const data = useMemo(() => {
    if (!query.data) return query.data;
    return query.data
      .filter((d) => !removed.has(d.id))
      .map((d) => (d.id in trustOverrides ? { ...d, trusted: trustOverrides[d.id] } : d));
  }, [query.data, removed, trustOverrides]);
  return { ...query, data };
}

const API_KEYS_QUERY_KEY = ["settings", "api-keys"];

interface ApiKeyListResponse {
  items: PersonalApiKey[];
  nextCursor: string | null;
  total: number;
}

/** Real personal API keys (`/api/v1/api-keys`) — this is the caller's own org, since there's no cross-org superadmin concept in the real backend. */
export function usePersonalApiKeysQuery() {
  const query = useQuery({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: () => apiFetchJson<ApiKeyListResponse>("/api/v1/api-keys?limit=100"),
  });
  return { ...query, data: query.data?.items };
}

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
  expiresAt?: string;
  allowedIps?: string[];
  allowedOrigins?: string[];
  environment?: "live" | "test";
  keyType?: "secret" | "publishable";
}

export type CreateApiKeyResult = PersonalApiKey & { apiKey: string };

export function useCreatePersonalApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApiKeyInput) =>
      apiFetchJson<CreateApiKeyResult>("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY }),
  });
}

export function useRevokePersonalApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: RevokeReason }) =>
      apiFetchJson<{ success: true }>(`/api/v1/api-keys/${id}`, {
        method: "DELETE",
        body: reason ? JSON.stringify({ reason }) : undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY }),
  });
}

export type RotateApiKeyResult = PersonalApiKey & {
  apiKey: string;
  oldKeyId: string;
  gracePeriodEndsAt: string;
};

export function useRotatePersonalApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetchJson<RotateApiKeyResult>(`/api/v1/api-keys/${id}/rotate`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY }),
  });
}

export function usePatchPersonalApiKeyScopesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scopes }: { id: string; scopes: string[] }) =>
      apiFetchJson<PersonalApiKey>(`/api/v1/api-keys/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ scopes }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY }),
  });
}

export interface SecurityCenterKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
}

export interface SecurityCenterOverview {
  inactiveDays: number;
  nearExpirationDays: number;
  inactiveKeys: (SecurityCenterKeySummary & { lastUsedAt: string | null; createdAt: string })[];
  expiredKeys: (SecurityCenterKeySummary & { expiresAt: string })[];
  nearExpirationKeys: (SecurityCenterKeySummary & { expiresAt: string })[];
  compromisedKeys: SecurityCenterKeySummary[];
  failedAuthSpikes: {
    apiKeyId: string | null;
    count: number;
    distinctIps: number;
    lastAttemptAt: string;
  }[];
}

/** Real Security Center data (`/api/v1/security-center/overview`) — every section here is a genuine query, not a mocked dashboard. */
export function useSecurityCenterQuery() {
  return useQuery({
    queryKey: ["settings", "security-center"],
    queryFn: () => apiFetchJson<SecurityCenterOverview>("/api/v1/security-center/overview"),
  });
}

export function useWebhooksQuery() {
  const query = useQuery({ queryKey: ["settings", "webhooks"], queryFn: fetchWebhooks });
  const created = useSettingsStore((s) => s.createdWebhooks);
  const data = useMemo(
    () => (query.data ? [...created, ...query.data] : query.data),
    [query.data, created],
  );
  return { ...query, data };
}

export function useWebhookDeliveriesQuery(webhookId: string | null) {
  return useQuery({
    queryKey: ["settings", "webhook-deliveries", webhookId],
    queryFn: () => fetchWebhookDeliveries(webhookId as string),
    enabled: Boolean(webhookId),
  });
}

export function useIntegrationsQuery() {
  const query = useQuery({ queryKey: ["settings", "integrations"], queryFn: fetchIntegrations });
  const overrides = useSettingsStore((s) => s.integrationConnectedOverrides);
  const data = useMemo(() => {
    if (!query.data) return query.data;
    return query.data.map((i) => (i.id in overrides ? { ...i, connected: overrides[i.id] } : i));
  }, [query.data, overrides]);
  return { ...query, data };
}

export function useLoginHistoryQuery() {
  return useQuery({ queryKey: ["settings", "login-history"], queryFn: fetchLoginHistory });
}

export function usePasskeysQuery() {
  return useQuery({ queryKey: ["settings", "passkeys"], queryFn: fetchPasskeys });
}

export function useBackupCodesQuery() {
  return useQuery({ queryKey: ["settings", "backup-codes"], queryFn: fetchBackupCodes });
}

export function useConsentSettingsQuery() {
  return useQuery({ queryKey: ["settings", "consent"], queryFn: fetchConsentSettings });
}
