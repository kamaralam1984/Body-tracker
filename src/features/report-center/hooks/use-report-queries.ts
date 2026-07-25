"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchReportById, fetchReports } from "../lib/mock-report-center-service";
import { useReportCenterStore } from "../store/report-center-store";

export function useReportsQuery() {
  const query = useQuery({ queryKey: ["report-center", "reports"], queryFn: fetchReports });
  const createdReports = useReportCenterStore((state) => state.createdReports);

  const data = useMemo(() => {
    if (!query.data) return query.data;
    return [...createdReports, ...query.data];
  }, [query.data, createdReports]);

  return { ...query, data };
}

export function useReportQuery(id: string | null) {
  const createdReports = useReportCenterStore((state) => state.createdReports);
  const created = id ? createdReports.find((r) => r.id === id) : undefined;

  const query = useQuery({
    queryKey: ["report-center", "report", id],
    queryFn: () => fetchReportById(id as string),
    enabled: Boolean(id) && !created,
  });

  if (created) return { ...query, data: created, isLoading: false, isError: false };
  return query;
}
