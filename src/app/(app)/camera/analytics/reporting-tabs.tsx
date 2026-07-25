"use client";

import { useCallback, useState } from "react";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Button } from "@/components/ui/button";
import {
  ActivityHeatmapSection,
  DetectionAnalyticsSection,
  ExecutiveOverview,
  ExportPanel,
  MovementAnalyticsSection,
  PeriodAnalyticsSection,
  ReportFilterPanel,
  ReportList,
  SessionHistoryTable,
  SessionQualityScatter,
  useSessionHistoryQuery,
  type ExportPanelRows,
  type SummaryPeriod,
} from "@/features/reporting";

function TrendsTab() {
  const [period, setPeriod] = useState<SummaryPeriod>("weekly");

  return (
    <div className="flex flex-col gap-4">
      <ButtonGroup className="self-start">
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <Button
            key={p}
            type="button"
            variant={period === p ? "primary" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : "Monthly"}
          </Button>
        ))}
      </ButtonGroup>
      <PeriodAnalyticsSection period={period} />
    </div>
  );
}

function MovementTab() {
  return (
    <div className="flex flex-col gap-6">
      <MovementAnalyticsSection />
      <ActivityHeatmapSection />
    </div>
  );
}

function SessionsTab() {
  const sessionHistory = useSessionHistoryQuery();

  const getSessionRows = useCallback((): ExportPanelRows => {
    const rows = sessionHistory.data ?? [];
    return {
      headers: [
        "Session ID",
        "Date",
        "Start time",
        "Duration (min)",
        "Quality",
        "Activity",
        "Status",
      ],
      rows: rows.map((r) => [
        r.id,
        r.date,
        r.startTime,
        r.durationMinutes,
        r.quality,
        r.activity,
        r.status,
      ]),
      objectRows: rows.map((r) => ({
        "Session ID": r.id,
        Date: r.date,
        "Start time": r.startTime,
        "Duration (min)": r.durationMinutes,
        Quality: r.quality,
        Activity: r.activity,
        Status: r.status,
      })),
    };
  }, [sessionHistory.data]);

  return (
    <div className="flex flex-col gap-6">
      <ReportFilterPanel />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <SessionHistoryTable />
        </div>
        <ExportPanel getRows={getSessionRows} filenameBase="session-history" />
      </div>
      <SessionQualityScatter />
    </div>
  );
}

export const REPORTING_TABS = [
  { value: "executive", label: "Executive" },
  { value: "trends", label: "Trends" },
  { value: "movement", label: "Movement" },
  { value: "detection", label: "Detection" },
  { value: "sessions", label: "Sessions" },
  { value: "reports", label: "Reports" },
] as const;

export type ReportingTabValue = (typeof REPORTING_TABS)[number]["value"];

export function ReportingTabContent({ tab }: { tab: ReportingTabValue }) {
  switch (tab) {
    case "executive":
      return <ExecutiveOverview />;
    case "trends":
      return <TrendsTab />;
    case "movement":
      return <MovementTab />;
    case "detection":
      return <DetectionAnalyticsSection />;
    case "sessions":
      return <SessionsTab />;
    case "reports":
      return <ReportList />;
    default:
      return null;
  }
}
