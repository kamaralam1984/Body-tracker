/**
 * Placeholder settings-center data — no backend exists yet. Deterministic
 * (seeded) generation, same artificial-latency Promise convention used by
 * every other mock service in this app.
 */

import type {
  BackupCodeSet,
  ConnectedDevice,
  ConsentSetting,
  IntegrationDoc,
  LoginHistoryEntry,
  Passkey,
  PersonalApiKey,
  Webhook,
  WebhookDelivery,
} from "../types";
import { WEBHOOK_EVENT_TYPES } from "../types";

function delay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seededRandom(seed) * items.length) % items.length];
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

const DEVICES: ConnectedDevice[] = [
  {
    id: "dev-1",
    name: "MacBook Pro",
    type: "desktop",
    browser: "Chrome 128",
    os: "macOS Sonoma",
    location: "San Francisco, US",
    ipAddress: "76.14.22.108",
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
    trusted: true,
  },
  {
    id: "dev-2",
    name: "iPhone 16 Pro",
    type: "mobile",
    browser: "Safari",
    os: "iOS 18",
    location: "San Francisco, US",
    ipAddress: "76.14.22.109",
    lastActiveAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    isCurrent: false,
    trusted: true,
  },
  {
    id: "dev-3",
    name: "Chrome on Windows",
    type: "desktop",
    browser: "Chrome 127",
    os: "Windows 11",
    location: "Denver, US",
    ipAddress: "142.55.10.42",
    lastActiveAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    isCurrent: false,
    trusted: false,
  },
  {
    id: "dev-4",
    name: "iPad Air",
    type: "tablet",
    browser: "Safari",
    os: "iPadOS 18",
    location: "Austin, US",
    ipAddress: "98.201.4.19",
    lastActiveAt: new Date(Date.now() - 11 * 86_400_000).toISOString(),
    isCurrent: false,
    trusted: false,
  },
];

export function fetchDevices(): Promise<ConnectedDevice[]> {
  return delay(DEVICES, 450);
}

// ---------------------------------------------------------------------------
// Personal API keys
// ---------------------------------------------------------------------------

const SCOPE_POOL = [
  "read:sessions",
  "write:sessions",
  "read:reports",
  "read:activity",
  "read:profile",
];

function buildPersonalApiKeys(): PersonalApiKey[] {
  return Array.from({ length: 5 }, (_, i) => {
    const seed = i * 17 + 3;
    const scopeCount = 1 + Math.floor(seededRandom(seed) * 3);
    return {
      id: `PAT-${400 + i}`,
      name: pick(
        [
          "Local development",
          "CI pipeline",
          "Zapier integration",
          "Mobile app",
          "Analytics export",
        ],
        seed + 1,
      ),
      prefix: "bt_pat_",
      lastFour: String(1000 + Math.floor(seededRandom(seed + 2) * 8999)),
      scopes: Array.from(
        new Set(Array.from({ length: scopeCount }, (_, s) => pick(SCOPE_POOL, seed + 3 + s))),
      ),
      status: seededRandom(seed + 4) > 0.85 ? "revoked" : "active",
      createdAt: new Date(
        Date.now() - Math.floor(seededRandom(seed + 5) * 200) * 86_400_000,
      ).toISOString(),
      lastUsedAt:
        seededRandom(seed + 6) > 0.2
          ? new Date(
              Date.now() - Math.floor(seededRandom(seed + 7) * 10) * 86_400_000,
            ).toISOString()
          : null,
    };
  });
}

const PERSONAL_API_KEYS = buildPersonalApiKeys();

export function fetchPersonalApiKeys(): Promise<PersonalApiKey[]> {
  return delay(PERSONAL_API_KEYS, 450);
}

let apiKeyCounter = PERSONAL_API_KEYS.length;
export function createPersonalApiKey(input: { name: string; scopes: string[] }): PersonalApiKey {
  apiKeyCounter += 1;
  return {
    id: `PAT-${400 + apiKeyCounter}`,
    name: input.name,
    prefix: "bt_pat_",
    lastFour: String(1000 + Math.floor(Math.random() * 8999)),
    scopes: input.scopes,
    status: "active",
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

const WEBHOOKS: Webhook[] = [
  {
    id: "WH-1",
    url: "https://hooks.example.com/bodytracker/sessions",
    description: "Forward session lifecycle events to our internal dashboard.",
    events: ["session.started", "session.ended"],
    secretLastFour: "8f2a",
    status: "active",
    createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
  },
  {
    id: "WH-2",
    url: "https://api.acme.io/webhooks/tracking",
    description: "Alert on tracking loss for QA monitoring.",
    events: ["tracking.lost", "activity.changed"],
    secretLastFour: "c91d",
    status: "failing",
    createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  },
  {
    id: "WH-3",
    url: "https://zapier.com/hooks/catch/12345/abcde",
    description: "Trigger a Zap when a report finishes generating.",
    events: ["report.generated"],
    secretLastFour: "4b17",
    status: "active",
    createdAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
  },
  {
    id: "WH-4",
    url: "https://staging.internal.dev/webhooks/bt",
    description: "Staging environment mirror — disabled while unused.",
    events: ["session.started", "user.invited"],
    secretLastFour: "e603",
    status: "disabled",
    createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
  },
];

export function fetchWebhooks(): Promise<Webhook[]> {
  return delay(WEBHOOKS, 450);
}

function buildDeliveries(): WebhookDelivery[] {
  const deliveries: WebhookDelivery[] = [];
  let counter = 0;
  WEBHOOKS.forEach((webhook, wi) => {
    const count = 6 + (wi % 4) * 2;
    for (let i = 0; i < count; i++) {
      const seed = wi * 53 + i * 7 + 11;
      counter += 1;
      const status =
        webhook.status === "failing" && seededRandom(seed) > 0.5
          ? "failed"
          : seededRandom(seed + 1) > 0.9
            ? "failed"
            : "success";
      deliveries.push({
        id: `DLV-${counter}`,
        webhookId: webhook.id,
        event: pick(webhook.events, seed + 2),
        status,
        statusCode:
          status === "success"
            ? 200
            : status === "failed"
              ? pick([400, 404, 500, 502, 504], seed + 3)
              : null,
        timestamp: new Date(
          Date.now() - Math.floor(seededRandom(seed + 4) * 20_000) * 60_000,
        ).toISOString(),
        durationMs: 40 + Math.floor(seededRandom(seed + 5) * 900),
      });
    }
  });
  return deliveries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

const WEBHOOK_DELIVERIES = buildDeliveries();

export function fetchWebhookDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
  return delay(
    WEBHOOK_DELIVERIES.filter((d) => d.webhookId === webhookId),
    400,
  );
}

let webhookCounter = WEBHOOKS.length;
export function createWebhook(input: {
  url: string;
  description: string;
  events: string[];
}): Webhook {
  webhookCounter += 1;
  return {
    id: `WH-${webhookCounter + 1}`,
    url: input.url,
    description: input.description,
    events: input.events,
    secretLastFour: Math.random().toString(16).slice(2, 6),
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

export { WEBHOOK_EVENT_TYPES };

// ---------------------------------------------------------------------------
// Integrations catalog
// ---------------------------------------------------------------------------

const INTEGRATIONS: IntegrationDoc[] = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Sync scheduled sessions to your team's calendar.",
    category: "productivity",
    connected: true,
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    description: "Sync with Outlook Calendar and Teams.",
    category: "productivity",
    connected: false,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send session alerts and weekly summaries to a channel.",
    category: "communication",
    connected: true,
  },
  {
    id: "discord",
    name: "Discord",
    description: "Post activity updates to a Discord server.",
    category: "communication",
    connected: false,
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Auto-create Zoom links for scheduled remote sessions.",
    category: "communication",
    connected: false,
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows with 5,000+ connected apps.",
    category: "automation",
    connected: false,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Link issues and pull requests to tracked sessions.",
    category: "development",
    connected: false,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Sync billing events with your own Stripe account.",
    category: "payments",
    connected: false,
  },
  {
    id: "rest-api",
    name: "REST API",
    description: "Build a custom integration against the full API.",
    category: "development",
    connected: true,
  },
  {
    id: "custom",
    name: "Custom integration",
    description: "Connect an internal tool using a personal API key and webhook.",
    category: "development",
    connected: false,
  },
];

export function fetchIntegrations(): Promise<IntegrationDoc[]> {
  return delay(INTEGRATIONS, 450);
}

// ---------------------------------------------------------------------------
// Login history, passkeys, backup codes
// ---------------------------------------------------------------------------

function buildLoginHistory(): LoginHistoryEntry[] {
  const devices = [
    "MacBook Pro · Chrome",
    "iPhone 16 Pro · Safari",
    "Windows Desktop · Edge",
    "iPad Air · Safari",
  ];
  const locations = ["San Francisco, US", "Denver, US", "Austin, US", "New York, US"];
  return Array.from({ length: 8 }, (_, i) => {
    const seed = i * 29 + 5;
    return {
      id: `login-${i}`,
      timestamp: new Date(
        Date.now() - Math.floor(seededRandom(seed) * 30) * 86_400_000 - i * 3_600_000,
      ).toISOString(),
      ipAddress: `${10 + (i % 200)}.${(i * 5) % 255}.${(i * 9) % 255}.${(i * 13) % 255}`,
      device: pick(devices, seed + 1),
      location: pick(locations, seed + 2),
      outcome: seededRandom(seed + 3) > 0.9 ? "failed" : "success",
    };
  });
}

export function fetchLoginHistory(): Promise<LoginHistoryEntry[]> {
  return delay(buildLoginHistory(), 450);
}

const PASSKEYS: Passkey[] = [
  {
    id: "pk-1",
    name: "MacBook Pro (Touch ID)",
    createdAt: new Date(Date.now() - 120 * 86_400_000).toISOString(),
    lastUsedAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: "pk-2",
    name: "iPhone 16 Pro (Face ID)",
    createdAt: new Date(Date.now() - 45 * 86_400_000).toISOString(),
    lastUsedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  },
];

export function fetchPasskeys(): Promise<Passkey[]> {
  return delay(PASSKEYS, 400);
}

export function fetchBackupCodes(): Promise<BackupCodeSet> {
  return delay(
    {
      generatedAt: new Date(Date.now() - 90 * 86_400_000).toISOString(),
      totalCodes: 10,
      remainingCodes: 7,
    },
    350,
  );
}

// ---------------------------------------------------------------------------
// Data & privacy
// ---------------------------------------------------------------------------

const CONSENT_SETTINGS: ConsentSetting[] = [
  {
    id: "essential",
    label: "Essential platform data",
    description: "Required to operate your account and provide the service.",
    granted: true,
    required: true,
  },
  {
    id: "analytics",
    label: "Product analytics",
    description: "Help us understand how features are used to improve the product.",
    granted: true,
    required: false,
  },
  {
    id: "marketing",
    label: "Marketing communications",
    description: "Occasional emails about new features and offers.",
    granted: false,
    required: false,
  },
  {
    id: "third-party",
    label: "Third-party data sharing",
    description: "Share anonymized usage data with select partners.",
    granted: false,
    required: false,
  },
];

export function fetchConsentSettings(): Promise<ConsentSetting[]> {
  return delay(CONSENT_SETTINGS, 350);
}

export const TIMEZONES = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;
