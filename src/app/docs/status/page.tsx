import { CheckCircle2, CircleAlert, Clock, TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { StatTile } from "@/components/ui/stat-tile";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { formatReleaseDate } from "@/features/docs/lib/docs-format";
import { RECENT_INCIDENTS, STATUS_COMPONENTS } from "@/features/docs/lib/status-content";
import type { StatusLevel } from "@/features/docs/types";

type BannerVariant = "success" | "warning" | "danger";

const DOT_COLOR_CLASS: Record<StatusLevel, string> = {
  operational: "bg-success-600 dark:bg-success-500",
  degraded: "bg-warning-600 dark:bg-warning-500",
  outage: "bg-danger-600 dark:bg-danger-500",
  maintenance: "bg-info-600 dark:bg-info-500",
};

const STATUS_LABEL: Record<StatusLevel, string> = {
  operational: "Operational",
  degraded: "Degraded performance",
  outage: "Outage",
  maintenance: "Maintenance",
};

export default function StatusPage() {
  const total = STATUS_COMPONENTS.length;
  const operationalCount = STATUS_COMPONENTS.filter((c) => c.status === "operational").length;
  const affected = STATUS_COMPONENTS.filter((c) => c.status !== "operational");
  const hasOutage = STATUS_COMPONENTS.some((c) => c.status === "outage");
  const hasDegraded = STATUS_COMPONENTS.some(
    (c) => c.status === "degraded" || c.status === "maintenance",
  );

  const overall: { variant: BannerVariant; title: string; description: string } = hasOutage
    ? {
        variant: "danger",
        title: "Major outage",
        description:
          "One or more components are down. See the affected components below for details.",
      }
    : hasDegraded
      ? {
          variant: "warning",
          title: "Some systems are experiencing issues",
          description: `${affected.length} of ${total} component${total === 1 ? "" : "s"} ${affected.length === 1 ? "is" : "are"} degraded. Everything else is operating normally.`,
        }
      : {
          variant: "success",
          title: "All systems operational",
          description: `All ${total} monitored components are running normally.`,
        };

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">System status</h1>
        <p className="text-muted-foreground text-lg">
          Current operational status of{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
            @bodytracker/sdk
          </code>
          &apos;s backing services and this documentation site.
        </p>
      </div>

      <Alert
        variant={overall.variant}
        title={overall.title}
        className="p-6 text-base [&_svg]:size-7"
      >
        <p>{overall.description}</p>
      </Alert>

      <p className="text-muted-foreground -mt-4 text-xs">
        This page shows illustrative, static status content — it reflects the last content sync, not
        a live feed.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Components operational"
          value={`${operationalCount} / ${total}`}
          icon={CheckCircle2}
        />
        <StatTile
          label="Active incidents"
          value={String(affected.length)}
          icon={affected.length > 0 ? TriangleAlert : CircleAlert}
        />
        <StatTile
          label="Resolved incidents (last 90 days)"
          value={String(RECENT_INCIDENTS.length)}
          icon={Clock}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-foreground text-xl font-semibold">Components</h2>
        <div className="border-border overflow-hidden rounded-lg border">
          {STATUS_COMPONENTS.map((component, i) => (
            <div
              key={component.name}
              className={
                i !== STATUS_COMPONENTS.length - 1
                  ? "border-border flex items-start justify-between gap-4 border-b px-4 py-3.5"
                  : "flex items-start justify-between gap-4 px-4 py-3.5"
              }
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT_COLOR_CLASS[component.status]}`}
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-foreground text-sm font-medium">{component.name}</p>
                  <p className="text-muted-foreground text-sm">{component.description}</p>
                </div>
              </div>
              <span className="text-foreground shrink-0 text-sm font-medium">
                {STATUS_LABEL[component.status]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-foreground text-xl font-semibold">Recent history</h2>
        <Timeline>
          {RECENT_INCIDENTS.map((incident) => (
            <TimelineItem
              key={incident.title + incident.date}
              variant="neutral"
              title={incident.title}
              description={incident.description}
              timestamp={formatReleaseDate(incident.date)}
            />
          ))}
        </Timeline>
      </section>
    </div>
  );
}
