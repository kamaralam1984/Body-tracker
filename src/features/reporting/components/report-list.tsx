"use client";

/**
 * Static list of available reports (one per `ReportType`) — a local mock
 * array, not a query, since this is illustrative "here's what a report
 * catalog looks like" scope for this phase.
 *
 * "View" is wired to the REAL `exportToPdf` from `export-engine.ts` with a
 * small placeholder row set describing the report, rather than being a
 * purely inert button. Given `session-panel.tsx` already establishes a
 * "disabled + Coming soon" convention for genuinely unimplemented actions,
 * leaving "View" inert here would just be a second flavor of the same
 * non-answer — and a report list whose only action does nothing reads as
 * more broken than a report list that generates a real (if minimal) PDF.
 * Producing an actual file feels more honest for UI-foundation scope.
 */

import { useState } from "react";
import { format } from "date-fns";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Gauge,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { exportToPdf } from "../lib/export-engine";
import type { ReportDefinition, ReportType } from "../types";

const REPORT_ICON: Record<ReportType, LucideIcon> = {
  executive: BarChart3,
  daily: CalendarDays,
  weekly: CalendarRange,
  monthly: CalendarClock,
  session: ListChecks,
  performance: Gauge,
  tracking: Gauge,
  movement: ListChecks,
  custom: BarChart3,
};

const MOCK_REPORTS: ReportDefinition[] = [
  {
    id: "report-executive",
    type: "executive",
    title: "Executive Summary Report",
    description: "High-level overview of performance and key trends across all tracked sessions.",
    generatedAt: "2026-07-22",
  },
  {
    id: "report-daily",
    type: "daily",
    title: "Daily Activity Report",
    description: "A day-by-day breakdown of session activity and tracking quality.",
    generatedAt: "2026-07-23",
    period: "daily",
  },
  {
    id: "report-weekly",
    type: "weekly",
    title: "Weekly Performance Report",
    description: "Aggregated trends and week-over-week comparisons for the past 7 days.",
    generatedAt: "2026-07-20",
    period: "weekly",
  },
  {
    id: "report-monthly",
    type: "monthly",
    title: "Monthly Summary Report",
    description: "Rolled-up totals and quality trends for the past 30 days.",
    generatedAt: "2026-07-01",
    period: "monthly",
  },
  {
    id: "report-session",
    type: "session",
    title: "Session History Report",
    description: "A detailed log of every completed and interrupted tracking session.",
    generatedAt: "2026-07-23",
  },
  {
    id: "report-performance",
    type: "performance",
    title: "Performance Analysis Report",
    description: "Detection rates and stability metrics across recent sessions.",
    generatedAt: "2026-07-19",
  },
];

function formatGeneratedAt(value: string): string {
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export interface ReportListProps {
  className?: string;
}

export function ReportList({ className }: ReportListProps) {
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function handleView(report: ReportDefinition) {
    setViewingId(report.id);
    try {
      await exportToPdf(
        `${report.type}-report`,
        report.title,
        ["Field", "Value"],
        [
          ["Report type", report.type],
          ["Description", report.description],
          ["Generated", formatGeneratedAt(report.generatedAt)],
          ...(report.period ? [["Period", report.period]] : []),
        ],
      );
      toast.success(`${report.title} opened`);
    } finally {
      setViewingId(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {MOCK_REPORTS.map((report) => {
        const Icon = REPORT_ICON[report.type];
        const isViewing = viewingId === report.id;
        return (
          <Card key={report.id} className="flex items-center gap-4 p-5">
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
              <Icon className="text-muted-foreground size-5" strokeWidth={1.75} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-foreground truncate text-sm font-semibold">{report.title}</p>
              <p className="text-muted-foreground truncate text-sm">{report.description}</p>
              <p className="text-muted-foreground text-xs">
                Generated {formatGeneratedAt(report.generatedAt)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleView(report)}
              disabled={isViewing}
              className="shrink-0"
            >
              {isViewing && <Spinner size="sm" />}
              View
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
