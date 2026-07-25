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

export function formatStorage(gb: number): string {
  return gb >= 1000 ? `${(gb / 1000).toFixed(1)} TB` : `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
