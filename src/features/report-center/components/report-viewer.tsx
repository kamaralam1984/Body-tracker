"use client";

/**
 * The composed "executive report" document — a printable business document
 * with a cover page and template-driven sections, rendered inside a wide
 * `Drawer`. Mounted once by the page with no props: visibility and which
 * report to show are both driven by the store's `viewerReportId` (open ===
 * `viewerReportId !== null`), so any call site that wants to open it just
 * does `openViewer(id)`.
 *
 * <ReportViewer />
 */

import { addMinutes } from "date-fns";
import { CheckCircle2, ClipboardList, FileText, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { cn } from "@/lib/utils";
import {
  ActivityHeatmapSection,
  DetectionAnalyticsSection,
  ExecutiveOverview,
  MovementAnalyticsSection,
  PeriodAnalyticsSection,
  SessionHistoryTable,
  SessionQualityScatter,
} from "@/features/reporting";
import { useReportQuery } from "../hooks/use-report-queries";
import { useReportCenterStore } from "../store/report-center-store";
import { formatAbsoluteDate } from "../lib/report-format";
import { ReportStatusBadge, ReportTemplateBadge } from "./report-status-badge";
import { ReportDownloadCenter } from "./report-download-center";
import type { ReportRecord, ReportTemplate } from "../types";

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-foreground text-base font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function TemplateSections({ template }: { template: ReportTemplate }) {
  switch (template) {
    case "executive":
      return (
        <ReportSection title="Executive Summary">
          <ExecutiveOverview />
        </ReportSection>
      );
    case "compact":
      return (
        <>
          <ReportSection title="Executive Summary">
            <ExecutiveOverview />
          </ReportSection>
          <ReportSection title="Session History">
            <SessionHistoryTable />
          </ReportSection>
        </>
      );
    case "professional":
      return (
        <>
          <ReportSection title="Executive Summary">
            <ExecutiveOverview />
          </ReportSection>
          <ReportSection title="Trends">
            <PeriodAnalyticsSection period="weekly" />
          </ReportSection>
          <ReportSection title="Movement Analysis">
            <MovementAnalyticsSection />
          </ReportSection>
          <ReportSection title="Detection Quality">
            <DetectionAnalyticsSection />
          </ReportSection>
          <ReportSection title="Session History">
            <SessionHistoryTable />
          </ReportSection>
        </>
      );
    case "detailed":
      return (
        <>
          <ReportSection title="Executive Summary">
            <ExecutiveOverview />
          </ReportSection>
          <ReportSection title="Trends">
            <PeriodAnalyticsSection period="weekly" />
          </ReportSection>
          <ReportSection title="Movement Analysis">
            <MovementAnalyticsSection />
            <ActivityHeatmapSection />
          </ReportSection>
          <ReportSection title="Detection Quality">
            <DetectionAnalyticsSection />
          </ReportSection>
          <ReportSection title="Session History">
            <SessionHistoryTable />
          </ReportSection>
          <ReportSection title="Session Quality">
            <SessionQualityScatter />
          </ReportSection>
        </>
      );
    default:
      return null;
  }
}

function ReportTimelineSection({ report }: { report: ReportRecord }) {
  const finalized = new Date(report.createdAt);
  const insightsGenerated = addMinutes(finalized, -2);
  const chartsRendered = addMinutes(finalized, -5);
  const dataCompiled = addMinutes(finalized, -9);

  return (
    <ReportSection title="Report Timeline">
      <Timeline>
        <TimelineItem
          variant="info"
          icon={<ClipboardList />}
          title="Data compiled"
          description="Session and tracking data aggregated for the selected period."
          timestamp={formatAbsoluteDate(dataCompiled.toISOString())}
        />
        <TimelineItem
          variant="accent"
          icon={<FileText />}
          title="Charts rendered"
          description="Trend, movement, and detection visualizations generated."
          timestamp={formatAbsoluteDate(chartsRendered.toISOString())}
        />
        <TimelineItem
          variant="warning"
          icon={<Sparkles />}
          title="Insights generated"
          description="Comparisons and narrative insights computed from the underlying metrics."
          timestamp={formatAbsoluteDate(insightsGenerated.toISOString())}
        />
        <TimelineItem
          variant="success"
          icon={<CheckCircle2 />}
          title="Report finalized"
          description="Document assembled and marked ready for review."
          timestamp={formatAbsoluteDate(finalized.toISOString())}
        />
      </Timeline>
    </ReportSection>
  );
}

function ReportCover({ report }: { report: ReportRecord }) {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-center gap-2">
        <ReportTemplateBadge template={report.template} />
        <ReportStatusBadge status={report.status} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-3xl font-bold tracking-tight text-balance">
          {report.title}
        </h1>
        <p className="text-muted-foreground text-base">{report.dateRangeLabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <Avatar
          src={report.generatedBy.avatarSrc}
          alt={report.generatedBy.name}
          fallback={report.generatedBy.name}
          size="sm"
        />
        <div className="flex flex-col">
          <span className="text-foreground text-sm font-medium">
            Generated by {report.generatedBy.name}
          </span>
          <span className="text-muted-foreground text-xs">
            {formatAbsoluteDate(report.createdAt)}
          </span>
        </div>
      </div>
      <div className="from-accent via-accent/40 h-px w-full bg-gradient-to-r to-transparent" />
    </div>
  );
}

function ViewerSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 pb-8">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-px w-full" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ReportViewer({ className }: { className?: string }) {
  const viewerReportId = useReportCenterStore((state) => state.viewerReportId);
  const closeViewer = useReportCenterStore((state) => state.closeViewer);
  const { data: report, isLoading } = useReportQuery(viewerReportId);

  const open = viewerReportId !== null;

  return (
    <Drawer
      open={open}
      onClose={closeViewer}
      side="right"
      className={cn("max-w-4xl print:max-w-none print:border-none print:shadow-none", className)}
      footer={
        <div className="flex w-full items-center justify-end gap-3 print:hidden">
          <Button type="button" variant="outline" onClick={closeViewer}>
            Close
          </Button>
          {report && <ReportDownloadCenter report={report} />}
        </div>
      }
    >
      <div className="flex flex-col gap-10 print:gap-6">
        {isLoading || !report ? (
          <ViewerSkeleton />
        ) : (
          <>
            <ReportCover report={report} />
            <TemplateSections template={report.template} />
            <ReportTimelineSection report={report} />
          </>
        )}
      </div>
    </Drawer>
  );
}
