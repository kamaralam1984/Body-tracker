"use client";

/**
 * Top-level library navigation for the report center — reads/writes
 * `activeTab` on `useReportCenterStore` directly (no props threading),
 * matching the "New report" dialog's convention of owning its own store
 * wiring instead of taking callbacks.
 */

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useReportCenterStore } from "../store/report-center-store";
import type { ReportTabValue } from "../types";

const TABS: { value: ReportTabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "recent", label: "Recent" },
  { value: "favorites", label: "Favorites" },
  { value: "shared", label: "Shared" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
  { value: "templates", label: "Templates" },
];

interface ReportLibraryTabsProps {
  className?: string;
}

export function ReportLibraryTabs({ className }: ReportLibraryTabsProps) {
  const activeTab = useReportCenterStore((state) => state.activeTab);
  const setActiveTab = useReportCenterStore((state) => state.setActiveTab);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as ReportTabValue)}
      className={cn(className)}
    >
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
