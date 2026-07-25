"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Plus, Table2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { StatTile } from "@/components/ui/stat-tile";
import {
  NewReportDialog,
  NoArchivedEmptyState,
  NoFavoritesEmptyState,
  NoReportsEmptyState,
  NoResultsEmptyState,
  NoScheduledEmptyState,
  REPORT_TEMPLATE_META,
  ReportFilterBar,
  ReportGrid,
  ReportGridSkeleton,
  ReportLibraryTabs,
  ReportOrientationToggle,
  ReportTable,
  ReportTemplateSelector,
  ReportViewer,
  computeReportStats,
  filterReports,
  filterReportsByTab,
  useReportCenterStore,
  useReportsQuery,
} from "@/features/report-center";
import type { ReportTemplate } from "@/features/report-center";

export default function ReportsPage() {
  const { data: reports, isLoading } = useReportsQuery();
  const activeTab = useReportCenterStore((state) => state.activeTab);
  const viewMode = useReportCenterStore((state) => state.viewMode);
  const setViewMode = useReportCenterStore((state) => state.setViewMode);
  const filters = useReportCenterStore((state) => state.filters);
  const openNewReport = useReportCenterStore((state) => state.openNewReport);

  const [previewTemplate, setPreviewTemplate] = useState<ReportTemplate>("executive");
  const [previewOrientation, setPreviewOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );

  const allReports = useMemo(() => reports ?? [], [reports]);
  const stats = useMemo(() => computeReportStats(allReports), [allReports]);

  const tabbedReports = useMemo(
    () => filterReportsByTab(allReports, activeTab),
    [allReports, activeTab],
  );
  const visibleReports = useMemo(
    () => filterReports(tabbedReports, filters),
    [tabbedReports, filters],
  );

  const hasAnyReports = allReports.length > 0;
  const hasVisibleReports = visibleReports.length > 0;
  const isFiltered =
    filters.search !== "" ||
    filters.kind !== "all" ||
    filters.template !== "all" ||
    filters.datePreset !== "all";

  function renderEmptyState() {
    if (isFiltered) return <NoResultsEmptyState />;
    if (activeTab === "favorites") return <NoFavoritesEmptyState />;
    if (activeTab === "scheduled") return <NoScheduledEmptyState />;
    if (activeTab === "archived") return <NoArchivedEmptyState />;
    return <NoResultsEmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Generate, browse, and export executive reports for your organization."
        actions={
          <Button variant="primary" size="md" onClick={openNewReport}>
            <Plus />
            New report
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Total reports" value={String(stats.total)} />
        <StatTile label="Recent" value={String(stats.recent)} />
        <StatTile label="Favorites" value={String(stats.favorites)} />
        <StatTile label="Shared" value={String(stats.shared)} />
        <StatTile label="Scheduled" value={String(stats.scheduled)} />
        <StatTile label="Archived" value={String(stats.archived)} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ReportLibraryTabs />

        <ButtonGroup>
          <Button
            variant={viewMode === "grid" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid />
          </Button>
          <Button
            variant={viewMode === "table" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
          >
            <Table2 />
          </Button>
        </ButtonGroup>
      </div>

      {activeTab === "templates" ? (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground max-w-2xl text-sm">
            Every report is generated from one of these templates. Preview a layout below, or start
            a new report to apply it.
          </p>
          <ReportOrientationToggle value={previewOrientation} onChange={setPreviewOrientation} />
          <ReportTemplateSelector value={previewTemplate} onChange={setPreviewTemplate} />
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {REPORT_TEMPLATE_META[previewTemplate].label} ·{" "}
              {REPORT_TEMPLATE_META[previewTemplate].sectionCount} sections ·{" "}
              {previewOrientation === "portrait" ? "Portrait" : "Landscape"}
            </p>
            <Button variant="primary" onClick={openNewReport}>
              <Plus />
              Use this template
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ReportFilterBar />

          {isLoading ? (
            <ReportGridSkeleton />
          ) : !hasAnyReports ? (
            <NoReportsEmptyState
              action={
                <Button variant="primary" onClick={openNewReport}>
                  Generate your first report
                </Button>
              }
            />
          ) : !hasVisibleReports ? (
            renderEmptyState()
          ) : viewMode === "grid" ? (
            <ReportGrid reports={visibleReports} />
          ) : (
            <ReportTable reports={visibleReports} />
          )}
        </>
      )}

      <NewReportDialog />
      <ReportViewer />
    </div>
  );
}
