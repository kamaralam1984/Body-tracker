/**
 * Public contract for the settings feature — the personalization/config
 * layer for a single signed-in user (as opposed to `@/features/admin`,
 * which manages the whole platform). Two kinds of state live here:
 *
 * 1. PERSISTED PREFERENCES (appearance, camera/tracking, language/region,
 *    notifications) — real client-side state via the Zustand `persist`
 *    middleware (localStorage-backed), genuinely affecting what the user
 *    sees/how forms default next time, not just decorative toggles.
 * 2. MOCK SERVER-SHAPED DATA (devices, personal API keys, webhooks,
 *    integrations, login history, passkeys) — no backend exists, so this
 *    follows the same seeded-mock-service + React Query convention used by
 *    every other feature in this app.
 */

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export type DeviceType = "desktop" | "mobile" | "tablet";

export interface ConnectedDevice {
  id: string;
  name: string;
  type: DeviceType;
  browser: string;
  os: string;
  location: string;
  ipAddress: string;
  lastActiveAt: string;
  isCurrent: boolean;
  trusted: boolean;
}

// ---------------------------------------------------------------------------
// Personal API keys — real, backed by `/api/v1/api-keys` (Prisma `ApiKey`,
// see prisma/schema.prisma). Distinct from `@/features/admin`'s cross-org
// mock API key view (that one has no real backend equivalent — there's no
// superadmin/cross-org concept in the real API, see INCOMPLETE.md). Same
// masking convention as before: never show the full secret except the
// one-time post-creation reveal (`apiKey` field on the create response).
// ---------------------------------------------------------------------------

export type PersonalApiKeyStatus = "active" | "revoked";

export const REVOKE_REASONS = [
  "Compromised",
  "Unused",
  "Employee Left",
  "Testing Complete",
  "Manual",
] as const;
export type RevokeReason = (typeof REVOKE_REASONS)[number];

export interface PersonalApiKey {
  id: string;
  orgId: string;
  userId: string | null;
  serviceAccountId: string | null;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: PersonalApiKeyStatus;
  rateLimitPerMinute: number;
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedReason: string | null;
  environment: string;
  keyType: string;
  allowedIps: string[];
  allowedOrigins: string[];
  gracePeriodEndsAt: string | null;
  supersedesId: string | null;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export type WebhookStatus = "active" | "disabled" | "failing";

export interface Webhook {
  id: string;
  url: string;
  description: string;
  events: string[];
  secretLastFour: string;
  status: WebhookStatus;
  createdAt: string;
}

export type WebhookDeliveryStatus = "success" | "failed" | "pending";

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: WebhookDeliveryStatus;
  statusCode: number | null;
  timestamp: string;
  durationMs: number;
}

export const WEBHOOK_EVENT_TYPES = [
  "session.started",
  "session.ended",
  "activity.changed",
  "tracking.lost",
  "report.generated",
  "user.invited",
] as const;

// ---------------------------------------------------------------------------
// Integrations catalog
// ---------------------------------------------------------------------------

export type IntegrationCategory =
  "productivity" | "communication" | "development" | "payments" | "automation";

export interface IntegrationDoc {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  connected: boolean;
}

// ---------------------------------------------------------------------------
// Security: login history, passkeys, backup codes
// ---------------------------------------------------------------------------

export interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  ipAddress: string;
  device: string;
  location: string;
  outcome: "success" | "failed";
}

export interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface BackupCodeSet {
  generatedAt: string;
  totalCodes: number;
  remainingCodes: number;
}

// ---------------------------------------------------------------------------
// Appearance preferences (persisted)
// ---------------------------------------------------------------------------

export type AccentColor = "indigo" | "blue" | "emerald" | "amber" | "rose" | "neutral";
export type Density = "compact" | "comfortable";
export type SidebarStyle = "expanded" | "icon-only";
export type FontSize = "sm" | "md" | "lg";

export interface AppearancePrefs {
  accentColor: AccentColor;
  density: Density;
  sidebarStyle: SidebarStyle;
  fontSize: FontSize;
  reducedMotion: boolean;
}

export const DEFAULT_APPEARANCE_PREFS: AppearancePrefs = {
  accentColor: "indigo",
  density: "comfortable",
  sidebarStyle: "expanded",
  fontSize: "md",
  reducedMotion: false,
};

// ---------------------------------------------------------------------------
// Camera & tracking preferences (persisted)
// ---------------------------------------------------------------------------

export type CameraResolution = "480p" | "720p" | "1080p";
export type CameraFps = 24 | 30 | 60;
export type PerformanceMode = "performance" | "balanced" | "accuracy";

export interface CameraTrackingPrefs {
  preferredCameraId: string | null;
  resolution: CameraResolution;
  fps: CameraFps;
  mirrorMode: boolean;
  autoStart: boolean;
  trackingSensitivity: number;
  smoothing: number;
  performanceMode: PerformanceMode;
  detectionDistance: number;
}

export const DEFAULT_CAMERA_TRACKING_PREFS: CameraTrackingPrefs = {
  preferredCameraId: null,
  resolution: "1080p",
  fps: 30,
  mirrorMode: true,
  autoStart: false,
  trackingSensitivity: 60,
  smoothing: 50,
  performanceMode: "balanced",
  detectionDistance: 70,
};

// ---------------------------------------------------------------------------
// Language & region preferences (persisted)
// ---------------------------------------------------------------------------

export type LanguageCode = "en" | "hi" | "ar" | "fr" | "de" | "es" | "ja" | "zh";
export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type TimeFormat = "12h" | "24h";
export type WeekStart = "sunday" | "monday";

export interface LanguageRegionPrefs {
  language: LanguageCode;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStart: WeekStart;
  autoDetectTimezone: boolean;
}

export const DEFAULT_LANGUAGE_REGION_PREFS: LanguageRegionPrefs = {
  language: "en",
  timezone: "America/Los_Angeles",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  weekStart: "sunday",
  autoDetectTimezone: true,
};

// ---------------------------------------------------------------------------
// Notification preferences (persisted)
// ---------------------------------------------------------------------------

export type DigestFrequency = "daily" | "weekly" | "never";

export interface NotificationPrefs {
  email: Record<string, boolean>;
  push: Record<string, boolean>;
  digestFrequency: DigestFrequency;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: {
    "weekly-summary": true,
    "new-session": true,
    "flagged-session": true,
    "product-updates": false,
  },
  push: {
    "push-mentions": true,
    "push-reminders": false,
  },
  digestFrequency: "weekly",
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

// ---------------------------------------------------------------------------
// Data & privacy
// ---------------------------------------------------------------------------

export interface ConsentSetting {
  id: string;
  label: string;
  description: string;
  granted: boolean;
  required: boolean;
}

export type DataExportStatus = "pending" | "ready" | "expired";

export interface DataExportRequest {
  id: string;
  requestedAt: string;
  status: DataExportStatus;
}

// ---------------------------------------------------------------------------
// Settings search
// ---------------------------------------------------------------------------

export interface SettingsSearchEntry {
  id: string;
  title: string;
  section: string;
  description: string;
  url: string;
  keywords: string[];
}
