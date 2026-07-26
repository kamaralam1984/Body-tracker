"use client";

/**
 * Real API usage analytics for the caller's organization — fetches
 * `/api/v1/analytics/api-usage` (backed by the real `ApiRequestLog` table)
 * via the app's real authenticated fetch client. Unlike the rest of this
 * settings section (mock-service-backed, see `use-settings-queries.ts`),
 * every number here comes from an actual request that actually happened.
 */

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { apiFetchJson } from "@/features/auth/lib/api-client";

interface ApiUsageData {
  rangeDays: number;
  sampled: boolean;
  totalRequests: number;
  successRate: number | null;
  errorRate: number | null;
  avgLatencyMs: number | null;
  requestsByStatusClass: Record<string, number>;
  topEndpoints: Array<{ method: string; path: string; count: number }>;
  byMethod: Array<{ method: string; count: number }>;
  deviceBreakdown: Array<{ label: string; count: number }>;
  requestsPerMinuteRecent: Array<{ minute: string; count: number }>;
}

export function ApiUsageDashboard() {
  const [data, setData] = useState<ApiUsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetchJson<ApiUsageData>("/api/v1/analytics/api-usage?days=7")
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading real usage data…</p>;
  }

  if (error || !data) {
    return <p className="text-danger-600 dark:text-danger-500 text-sm">{error ?? "No data"}</p>;
  }

  const trend = data.requestsPerMinuteRecent.map((m) => m.count);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground text-base font-semibold">API usage — last 7 days</h3>
          <p className="text-muted-foreground text-sm">
            Real numbers from every request your organization has actually made.
          </p>
        </div>
        {data.sampled && <Badge variant="warning">Breakdown sampled — high volume detected</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total requests"
          value={data.totalRequests.toLocaleString()}
          icon={Activity}
          trend={trend}
        />
        <StatTile
          label="Success rate"
          value={data.successRate !== null ? `${data.successRate}%` : "—"}
          icon={Gauge}
        />
        <StatTile
          label="Error rate"
          value={data.errorRate !== null ? `${data.errorRate}%` : "—"}
          icon={AlertTriangle}
        />
        <StatTile
          label="Avg latency"
          value={data.avgLatencyMs !== null ? `${data.avgLatencyMs}ms` : "—"}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topEndpoints.length === 0 ? (
              <p className="text-muted-foreground text-sm">No requests in this range yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.topEndpoints.map((e) => (
                  <div
                    key={`${e.method} ${e.path}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-foreground truncate font-mono text-xs">
                      <span className="text-accent-600 dark:text-accent-400 font-semibold">
                        {e.method}
                      </span>{" "}
                      {e.path}
                    </span>
                    <span className="text-muted-foreground shrink-0">{e.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caller type</CardTitle>
          </CardHeader>
          <CardContent>
            {data.deviceBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm">No requests in this range yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.deviceBreakdown.map((d) => (
                  <div key={d.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{d.label}</span>
                    <span className="text-muted-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
