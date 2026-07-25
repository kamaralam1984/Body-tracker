import {
  Bell,
  Building2,
  Camera,
  CreditCard,
  Globe,
  KeyRound,
  Laptop2,
  Lock,
  Palette,
  Plug,
  ShieldCheck,
  User,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SettingsNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Single source of truth for the settings sidebar AND the settings search index — every tab lives here so the two can never drift apart. */
export const SETTINGS_NAV: SettingsNavItem[] = [
  { label: "Profile", href: "/settings", icon: User },
  { label: "Appearance", href: "/settings/appearance", icon: Palette },
  { label: "Organization", href: "/settings/organization", icon: Building2 },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
  { label: "Security", href: "/settings/security", icon: ShieldCheck },
  { label: "Devices", href: "/settings/devices", icon: Laptop2 },
  { label: "API", href: "/settings/api", icon: KeyRound },
  { label: "Webhooks", href: "/settings/webhooks", icon: Webhook },
  { label: "Integrations", href: "/settings/integrations", icon: Plug },
  { label: "Language & Region", href: "/settings/language", icon: Globe },
  { label: "Camera & Tracking", href: "/settings/camera-tracking", icon: Camera },
  { label: "Data & Privacy", href: "/settings/privacy", icon: Lock },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
];
