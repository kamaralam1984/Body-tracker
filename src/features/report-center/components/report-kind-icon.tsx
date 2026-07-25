"use client";

/**
 * Maps every `ReportKind` to a lucide-react icon for use in card tiles,
 * table title cells, and filter menus.
 *
 * <ReportKindIcon kind={report.kind} className="size-5" />
 */

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Calendar,
  ListChecks,
  Gauge,
  Radar,
  TrendingUp,
  Footprints,
  GitCompare,
  FileCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportKind } from "../types";

export const REPORT_KIND_ICON: Record<ReportKind, LucideIcon> = {
  executive: BarChart3,
  daily: CalendarDays,
  weekly: CalendarRange,
  monthly: CalendarClock,
  quarterly: CalendarClock,
  annual: Calendar,
  session: ListChecks,
  tracking: Gauge,
  activity: Radar,
  performance: TrendingUp,
  movement: Footprints,
  comparison: GitCompare,
  custom: FileCog,
};

export function ReportKindIcon({ kind, className }: { kind: ReportKind; className?: string }) {
  const Icon = REPORT_KIND_ICON[kind];
  return <Icon className={cn("size-4", className)} strokeWidth={1.75} />;
}
