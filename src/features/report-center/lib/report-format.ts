import { format, formatDistanceToNow } from "date-fns";
import { REPORT_KIND_LABEL, REPORT_TEMPLATE_META } from "./mock-report-center-service";
import type { ReportKind, ReportTemplate } from "../types";

export function reportKindLabel(kind: ReportKind): string {
  return REPORT_KIND_LABEL[kind];
}

export function reportTemplateLabel(template: ReportTemplate): string {
  return REPORT_TEMPLATE_META[template].label;
}

export function formatFileSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export function formatRelativeDate(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatAbsoluteDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy · h:mm a");
}

export function formatShortDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy");
}
