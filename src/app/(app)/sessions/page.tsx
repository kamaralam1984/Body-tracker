"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutGrid, Table2, Video } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-extras";
import { StatTile } from "@/components/ui/stat-tile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BulkActionBar,
  NoArchivedSessionsEmptyState,
  NoLiveSessionsEmptyState,
  NoSearchResultsEmptyState,
  NoSessionsEmptyState,
  SessionDetailsDrawer,
  SessionFilterBar,
  SessionGrid,
  SessionGridSkeleton,
  SessionTable,
  useSessionsQuery,
  useSessionManagementStore,
  DEFAULT_SESSION_FILTERS,
  filterSessions,
  sortSessions,
  computeSessionStats,
  formatDurationLabel,
  type SessionFilters,
  type SessionSortField,
  type SessionTabValue,
} from "@/features/session-management";

const TABS: { value: SessionTabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "recorded", label: "Recorded" },
  { value: "archived", label: "Archived" },
  { value: "starred", label: "Starred" },
  { value: "recent", label: "Recent" },
];

function matchesTab(tab: SessionTabValue, categories: string[], status: string) {
  if (tab === "all") return true;
  if (tab === "live") return status === "live";
  return categories.includes(tab);
}

export default function SessionsPage() {
  const { data: sessions, isLoading } = useSessionsQuery();
  const viewMode = useSessionManagementStore((state) => state.viewMode);
  const setViewMode = useSessionManagementStore((state) => state.setViewMode);
  const activeTab = useSessionManagementStore((state) => state.activeTab);
  const setActiveTab = useSessionManagementStore((state) => state.setActiveTab);
  const selectAll = useSessionManagementStore((state) => state.selectAll);
  const starredIds = useSessionManagementStore((state) => state.starredIds);

  const [filters, setFilters] = useState<SessionFilters>(DEFAULT_SESSION_FILTERS);
  const [sortField, setSortField] = useState<SessionSortField>("newest");

  const allSessions = useMemo(() => sessions ?? [], [sessions]);

  const tabbedSessions = useMemo(
    () => allSessions.filter((s) => matchesTab(activeTab, s.categories, s.status)),
    [allSessions, activeTab],
  );

  const visibleSessions = useMemo(() => {
    const filtered = filterSessions(tabbedSessions, filters);
    return sortSessions(filtered, sortField);
  }, [tabbedSessions, filters, sortField]);

  const stats = useMemo(() => computeSessionStats(allSessions), [allSessions]);
  const liveStarredCount = useMemo(
    () => allSessions.filter((s) => s.starred || starredIds.has(s.id)).length,
    [allSessions, starredIds],
  );

  const hasAnySessions = allSessions.length > 0;
  const hasVisibleSessions = visibleSessions.length > 0;
  const isFiltered =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.quality !== "all" ||
    filters.activity !== "all" ||
    filters.datePreset !== "all";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sessions"
        description="Browse, replay, and manage every tracked session across your workspace."
        actions={
          <Button variant="primary" size="md" asChild>
            <Link href="/camera">
              <Video />
              Start live session
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Total sessions" value={String(stats.total)} />
        <StatTile label="Live now" value={String(stats.live)} />
        <StatTile label="Recorded" value={String(stats.recorded)} />
        <StatTile label="Archived" value={String(stats.archived)} />
        <StatTile
          label="Total duration"
          value={formatDurationLabel(stats.totalDurationMinutes * 60)}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SessionTabValue)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label === "Starred" ? `Starred (${liveStarredCount})` : t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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

      <SessionFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        sortField={sortField}
        onSortFieldChange={setSortField}
      />

      {viewMode === "table" && hasVisibleSessions && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectAll(visibleSessions.map((s) => s.id))}
          >
            Select all {visibleSessions.length}
          </Button>
        </div>
      )}

      {isLoading ? (
        <SessionGridSkeleton />
      ) : !hasAnySessions ? (
        <NoSessionsEmptyState
          action={
            <Button variant="primary" asChild>
              <Link href="/camera">Start live session</Link>
            </Button>
          }
        />
      ) : !hasVisibleSessions ? (
        isFiltered ? (
          <NoSearchResultsEmptyState
            action={
              <Button onClick={() => setFilters(DEFAULT_SESSION_FILTERS)}>Clear filters</Button>
            }
          />
        ) : activeTab === "live" ? (
          <NoLiveSessionsEmptyState />
        ) : activeTab === "archived" ? (
          <NoArchivedSessionsEmptyState />
        ) : (
          <NoSearchResultsEmptyState />
        )
      ) : viewMode === "grid" ? (
        <SessionGrid sessions={visibleSessions} />
      ) : (
        <SessionTable sessions={visibleSessions} sortField={sortField} />
      )}

      <BulkActionBar />
      <SessionDetailsDrawer />
    </div>
  );
}
