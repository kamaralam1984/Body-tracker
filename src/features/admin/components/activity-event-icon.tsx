/**
 * Shared icon + Timeline-variant mapping for every `ActivityEventType`, so
 * the Activity feed and the Audit table render a consistent visual language
 * for "what kind of thing happened" across both tabs.
 */

import {
  Building2,
  Download,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Settings2,
  Share2,
  ShieldAlert,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { ActivityEventType } from "../types";

export const ACTIVITY_EVENT_ICON: Record<ActivityEventType, LucideIcon> = {
  login: LogIn,
  logout: LogOut,
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  exported: Download,
  downloaded: Download,
  shared: Share2,
  "permission-changed": ShieldAlert,
  "settings-changed": Settings2,
  "organization-changed": Building2,
};

export type TimelineVariant = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export const ACTIVITY_EVENT_VARIANT: Record<ActivityEventType, TimelineVariant> = {
  login: "accent",
  logout: "neutral",
  created: "success",
  updated: "info",
  deleted: "danger",
  exported: "info",
  downloaded: "info",
  shared: "info",
  "permission-changed": "warning",
  "settings-changed": "info",
  "organization-changed": "neutral",
};
