import { format, formatDistanceToNow } from "date-fns";

export function formatRelativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatAbsoluteTime(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy · h:mm a");
}

export function formatTimeOnly(iso: string): string {
  return format(new Date(iso), "h:mm a");
}

export function formatDurationLabel(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
