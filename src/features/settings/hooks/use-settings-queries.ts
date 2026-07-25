"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchBackupCodes,
  fetchConsentSettings,
  fetchDevices,
  fetchIntegrations,
  fetchLoginHistory,
  fetchPasskeys,
  fetchPersonalApiKeys,
  fetchWebhookDeliveries,
  fetchWebhooks,
} from "../lib/mock-settings-service";
import { useSettingsStore } from "../store/settings-store";

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

export function usePersonalApiKeysQuery() {
  const query = useQuery({ queryKey: ["settings", "api-keys"], queryFn: fetchPersonalApiKeys });
  const created = useSettingsStore((s) => s.createdApiKeys);
  const revoked = useSettingsStore((s) => s.revokedApiKeyIds);
  const data = useMemo(() => {
    if (!query.data) return query.data;
    const all = [...created, ...query.data];
    return all.map((k) => (revoked.has(k.id) ? { ...k, status: "revoked" as const } : k));
  }, [query.data, created, revoked]);
  return { ...query, data };
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
