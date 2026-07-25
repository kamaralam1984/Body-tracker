"use client";

import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ActivityTimelineFeed,
  ActivityTimelineSkeleton,
  AdminLogFilterBar,
  AuditLogTable,
  NoActivityEmptyState,
  NoAuditResultsEmptyState,
  filterActivityEvents,
  useActivityEventsQuery,
  useAdminStore,
} from "@/features/admin";

export default function AdminLogsPage() {
  const { data: events, isLoading } = useActivityEventsQuery();
  const activityFilters = useAdminStore((state) => state.activityFilters);
  const setActivityFilters = useAdminStore((state) => state.setActivityFilters);
  const activeOrganizationId = useAdminStore((state) => state.activeOrganizationId);

  const tab = activityFilters.status === "audit" ? "audit" : "activity";

  const scoped = useMemo(() => {
    const all = events ?? [];
    return activeOrganizationId === "all"
      ? all
      : all.filter((e) => e.organizationId === activeOrganizationId);
  }, [events, activeOrganizationId]);

  const visible = useMemo(
    () => filterActivityEvents(scoped, activityFilters),
    [scoped, activityFilters],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Activity & audit logs</h2>
          <p className="text-muted-foreground text-sm">
            Every action across the platform, and the security-sensitive subset that matters most.
          </p>
        </div>
        <Tabs
          value={tab}
          onValueChange={(value) => setActivityFilters({ ...activityFilters, status: value })}
        >
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <AdminLogFilterBar events={visible} />

      {isLoading ? (
        <ActivityTimelineSkeleton />
      ) : visible.length === 0 ? (
        scoped.length === 0 ? (
          <NoActivityEmptyState />
        ) : (
          <NoAuditResultsEmptyState />
        )
      ) : tab === "activity" ? (
        <ActivityTimelineFeed events={visible} />
      ) : (
        <AuditLogTable events={visible} />
      )}
    </div>
  );
}
