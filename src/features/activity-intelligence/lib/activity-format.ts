import { format, formatDistanceToNow } from "date-fns";
import { KIND_LABEL } from "./mock-activity-service";
import type { ActivityKind } from "../types";

export function activityLabel(kind: ActivityKind): string {
  return KIND_LABEL[kind];
}

export function formatClockDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}

export function formatDurationLabel(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatRelativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatAbsoluteTime(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy · h:mm a");
}

export function formatTimeOnly(iso: string): string {
  return format(new Date(iso), "h:mm a");
}
