import { SETTINGS_NAV } from "./settings-nav";
import type { SettingsSearchEntry } from "../types";

/** Page-level entries, guaranteed to match the sidebar 1:1 since both read from `SETTINGS_NAV`. */
const PAGE_ENTRIES: SettingsSearchEntry[] = SETTINGS_NAV.map((item) => ({
  id: `page-${item.href}`,
  title: item.label,
  section: item.label,
  description: `Go to ${item.label} settings`,
  url: item.href,
  keywords: [item.label],
}));

/** Curated deep-links to specific fields/actions within a page — a real settings search should find "change password", not just "Security". */
const DEEP_ENTRIES: SettingsSearchEntry[] = [
  {
    id: "deep-avatar",
    title: "Change profile photo",
    section: "Profile",
    description: "Upload or remove your avatar",
    url: "/settings",
    keywords: ["avatar", "photo", "picture"],
  },
  {
    id: "deep-password",
    title: "Change password",
    section: "Security",
    description: "Update your account password",
    url: "/settings/security",
    keywords: ["password", "change password"],
  },
  {
    id: "deep-2fa",
    title: "Two-factor authentication",
    section: "Security",
    description: "Require an authenticator app at sign-in",
    url: "/settings/security",
    keywords: ["2fa", "mfa", "authenticator", "two-factor"],
  },
  {
    id: "deep-passkeys",
    title: "Passkeys",
    section: "Security",
    description: "Sign in without a password",
    url: "/settings/security",
    keywords: ["passkey", "webauthn", "touch id", "face id"],
  },
  {
    id: "deep-backup-codes",
    title: "Backup codes",
    section: "Security",
    description: "One-time recovery codes for your account",
    url: "/settings/security",
    keywords: ["backup codes", "recovery"],
  },
  {
    id: "deep-login-history",
    title: "Login history",
    section: "Security",
    description: "Recent sign-ins to your account",
    url: "/settings/security",
    keywords: ["login history", "sign in history"],
  },
  {
    id: "deep-devices",
    title: "Connected devices",
    section: "Devices",
    description: "Manage devices signed in to your account",
    url: "/settings/devices",
    keywords: ["devices", "sessions", "trusted device"],
  },
  {
    id: "deep-theme",
    title: "Theme",
    section: "Appearance",
    description: "Switch between light, dark, and system theme",
    url: "/settings/appearance",
    keywords: ["theme", "dark mode", "light mode"],
  },
  {
    id: "deep-accent",
    title: "Accent color",
    section: "Appearance",
    description: "Choose your workspace accent color",
    url: "/settings/appearance",
    keywords: ["accent color", "color"],
  },
  {
    id: "deep-density",
    title: "Density",
    section: "Appearance",
    description: "Compact or comfortable spacing",
    url: "/settings/appearance",
    keywords: ["density", "compact", "comfortable"],
  },
  {
    id: "deep-reduced-motion",
    title: "Reduced motion",
    section: "Appearance",
    description: "Minimize animation across the app",
    url: "/settings/appearance",
    keywords: ["reduced motion", "animation", "accessibility"],
  },
  {
    id: "deep-api-keys",
    title: "Personal API keys",
    section: "API",
    description: "Create and manage personal access tokens",
    url: "/settings/api",
    keywords: ["api key", "token", "personal access token"],
  },
  {
    id: "deep-webhooks",
    title: "Webhooks",
    section: "Webhooks",
    description: "Send real-time events to your own endpoints",
    url: "/settings/webhooks",
    keywords: ["webhook", "endpoint", "delivery"],
  },
  {
    id: "deep-language",
    title: "Language",
    section: "Language & Region",
    description: "Change your display language",
    url: "/settings/language",
    keywords: ["language", "locale", "translation"],
  },
  {
    id: "deep-timezone",
    title: "Timezone",
    section: "Language & Region",
    description: "Set your timezone and date format",
    url: "/settings/language",
    keywords: ["timezone", "date format", "time format"],
  },
  {
    id: "deep-camera",
    title: "Preferred camera",
    section: "Camera & Tracking",
    description: "Choose your default camera device",
    url: "/settings/camera-tracking",
    keywords: ["camera", "resolution", "fps"],
  },
  {
    id: "deep-tracking-sensitivity",
    title: "Tracking sensitivity",
    section: "Camera & Tracking",
    description: "Tune detection sensitivity and smoothing",
    url: "/settings/camera-tracking",
    keywords: ["tracking", "sensitivity", "smoothing", "performance mode"],
  },
  {
    id: "deep-export-data",
    title: "Export your data",
    section: "Data & Privacy",
    description: "Download a copy of your personal data",
    url: "/settings/privacy",
    keywords: ["export data", "download data", "gdpr"],
  },
  {
    id: "deep-delete-account",
    title: "Delete account",
    section: "Data & Privacy",
    description: "Permanently delete your account",
    url: "/settings/privacy",
    keywords: ["delete account", "close account"],
  },
  {
    id: "deep-consent",
    title: "Consent management",
    section: "Data & Privacy",
    description: "Manage what data you've consented to share",
    url: "/settings/privacy",
    keywords: ["consent", "privacy controls"],
  },
  {
    id: "deep-integrations",
    title: "Connected apps",
    section: "Integrations",
    description: "Manage connected third-party apps",
    url: "/settings/integrations",
    keywords: ["integrations", "connected apps", "slack", "google", "github"],
  },
  {
    id: "deep-notifications",
    title: "Notification preferences",
    section: "Notifications",
    description: "Email, push, and digest settings",
    url: "/settings/notifications",
    keywords: ["notifications", "email", "push", "digest", "quiet hours"],
  },
  {
    id: "deep-billing",
    title: "Billing & subscription",
    section: "Billing",
    description: "Manage your plan and payment method",
    url: "/settings/billing",
    keywords: ["billing", "subscription", "invoice", "payment method"],
  },
];

const SEARCH_INDEX: SettingsSearchEntry[] = [...PAGE_ENTRIES, ...DEEP_ENTRIES];

export function buildSettingsSearchIndex(): SettingsSearchEntry[] {
  return SEARCH_INDEX;
}

function score(entry: SettingsSearchEntry, query: string): number {
  const q = query.toLowerCase();
  const title = entry.title.toLowerCase();
  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  if (entry.description.toLowerCase().includes(q)) return 30;
  if (entry.keywords.some((k) => k.toLowerCase().includes(q))) return 25;
  if (entry.section.toLowerCase().includes(q)) return 15;
  return 0;
}

export function searchSettings(
  query: string,
  index: SettingsSearchEntry[] = SEARCH_INDEX,
): SettingsSearchEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return index
    .map((entry) => ({ entry, s: score(entry, trimmed) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ entry }) => entry);
}
