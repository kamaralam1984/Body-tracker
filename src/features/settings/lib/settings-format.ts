import { format, formatDistanceToNow } from "date-fns";

export function formatRelativeDate(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatAbsoluteDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy · h:mm a");
}

export function formatShortDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy");
}

const LANGUAGE_LABEL: Record<string, string> = {
  en: "English",
  hi: "हिन्दी (Hindi)",
  ar: "العربية (Arabic)",
  fr: "Français (French)",
  de: "Deutsch (German)",
  es: "Español (Spanish)",
  ja: "日本語 (Japanese)",
  zh: "中文 (Chinese)",
};

export function languageLabel(code: string): string {
  return LANGUAGE_LABEL[code] ?? code;
}

export const RTL_LANGUAGES = new Set(["ar"]);
