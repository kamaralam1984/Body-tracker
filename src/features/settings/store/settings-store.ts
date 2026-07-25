"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_APPEARANCE_PREFS,
  DEFAULT_CAMERA_TRACKING_PREFS,
  DEFAULT_LANGUAGE_REGION_PREFS,
  DEFAULT_NOTIFICATION_PREFS,
} from "../types";
import type {
  AppearancePrefs,
  CameraTrackingPrefs,
  LanguageRegionPrefs,
  NotificationPrefs,
  PersonalApiKey,
  Webhook,
} from "../types";

interface SettingsState {
  // ---- Persisted preferences (survive reload via localStorage) ----
  appearance: AppearancePrefs;
  setAppearance: (patch: Partial<AppearancePrefs>) => void;

  cameraTracking: CameraTrackingPrefs;
  setCameraTracking: (patch: Partial<CameraTrackingPrefs>) => void;
  resetCameraTracking: () => void;

  languageRegion: LanguageRegionPrefs;
  setLanguageRegion: (patch: Partial<LanguageRegionPrefs>) => void;

  notifications: NotificationPrefs;
  setNotifications: (patch: Partial<NotificationPrefs>) => void;
  toggleEmailNotification: (id: string) => void;
  togglePushNotification: (id: string) => void;

  // ---- Session-only UI state (NOT persisted) ----
  createApiKeyOpen: boolean;
  setCreateApiKeyOpen: (open: boolean) => void;
  createdApiKeys: PersonalApiKey[];
  addCreatedApiKey: (key: PersonalApiKey) => void;
  revokedApiKeyIds: Set<string>;
  revokeApiKey: (id: string) => void;

  createWebhookOpen: boolean;
  setCreateWebhookOpen: (open: boolean) => void;
  createdWebhooks: Webhook[];
  addCreatedWebhook: (webhook: Webhook) => void;
  webhookDetailId: string | null;
  openWebhookDetail: (id: string) => void;
  closeWebhookDetail: () => void;

  deviceTrustOverrides: Record<string, boolean>;
  setDeviceTrust: (id: string, trusted: boolean) => void;
  removedDeviceIds: Set<string>;
  removeDevice: (id: string) => void;

  integrationConnectedOverrides: Record<string, boolean>;
  setIntegrationConnected: (id: string, connected: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      appearance: DEFAULT_APPEARANCE_PREFS,
      setAppearance: (patch) => set({ appearance: { ...get().appearance, ...patch } }),

      cameraTracking: DEFAULT_CAMERA_TRACKING_PREFS,
      setCameraTracking: (patch) => set({ cameraTracking: { ...get().cameraTracking, ...patch } }),
      resetCameraTracking: () => set({ cameraTracking: DEFAULT_CAMERA_TRACKING_PREFS }),

      languageRegion: DEFAULT_LANGUAGE_REGION_PREFS,
      setLanguageRegion: (patch) => set({ languageRegion: { ...get().languageRegion, ...patch } }),

      notifications: DEFAULT_NOTIFICATION_PREFS,
      setNotifications: (patch) => set({ notifications: { ...get().notifications, ...patch } }),
      toggleEmailNotification: (id) => {
        const current = get().notifications;
        set({
          notifications: { ...current, email: { ...current.email, [id]: !current.email[id] } },
        });
      },
      togglePushNotification: (id) => {
        const current = get().notifications;
        set({ notifications: { ...current, push: { ...current.push, [id]: !current.push[id] } } });
      },

      createApiKeyOpen: false,
      setCreateApiKeyOpen: (open) => set({ createApiKeyOpen: open }),
      createdApiKeys: [],
      addCreatedApiKey: (key) => set({ createdApiKeys: [key, ...get().createdApiKeys] }),
      revokedApiKeyIds: new Set(),
      revokeApiKey: (id) => set({ revokedApiKeyIds: new Set(get().revokedApiKeyIds).add(id) }),

      createWebhookOpen: false,
      setCreateWebhookOpen: (open) => set({ createWebhookOpen: open }),
      createdWebhooks: [],
      addCreatedWebhook: (webhook) => set({ createdWebhooks: [webhook, ...get().createdWebhooks] }),
      webhookDetailId: null,
      openWebhookDetail: (id) => set({ webhookDetailId: id }),
      closeWebhookDetail: () => set({ webhookDetailId: null }),

      deviceTrustOverrides: {},
      setDeviceTrust: (id, trusted) =>
        set({ deviceTrustOverrides: { ...get().deviceTrustOverrides, [id]: trusted } }),
      removedDeviceIds: new Set(),
      removeDevice: (id) => set({ removedDeviceIds: new Set(get().removedDeviceIds).add(id) }),

      integrationConnectedOverrides: {},
      setIntegrationConnected: (id, connected) =>
        set({
          integrationConnectedOverrides: {
            ...get().integrationConnectedOverrides,
            [id]: connected,
          },
        }),
    }),
    {
      name: "body-tracker-settings",
      partialize: (state) => ({
        appearance: state.appearance,
        cameraTracking: state.cameraTracking,
        languageRegion: state.languageRegion,
        notifications: state.notifications,
      }),
    },
  ),
);
