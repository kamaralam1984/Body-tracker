"use client";

/**
 * Controlled search/filter bar for the report library, mirroring
 * `@/features/session-management/components/session-filter-bar.tsx`'s
 * pattern — except this one owns no local/prop state of its own: it reads
 * and writes `useReportCenterStore`'s `filters` directly, since the report
 * library page has no need to thread filter state through props.
 */

import { SearchInput } from "@/components/ui/input-extras";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useReportCenterStore } from "../store/report-center-store";
import { REPORT_KINDS, REPORT_TEMPLATES } from "../lib/mock-report-center-service";
import { reportKindLabel, reportTemplateLabel } from "../lib/report-format";
import type { ReportFilters } from "../types";

const kindOptions = [
  { value: "all", label: "All types" },
  ...REPORT_KINDS.map((kind) => ({ value: kind, label: reportKindLabel(kind) })),
];

const templateOptions = [
  { value: "all", label: "All templates" },
  ...REPORT_TEMPLATES.map((template) => ({
    value: template,
    label: reportTemplateLabel(template),
  })),
];

const datePresets: { value: ReportFilters["datePreset"]; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

interface ReportFilterBarProps {
  className?: string;
}

export function ReportFilterBar({ className }: ReportFilterBarProps) {
  const filters = useReportCenterStore((state) => state.filters);
  const setFilters = useReportCenterStore((state) => state.setFilters);

  function patch(next: Partial<ReportFilters>) {
    setFilters({ ...filters, ...next });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by title, type, author, or ID…"
          value={filters.search}
          onChange={(event) => patch({ search: event.target.value })}
          onClear={() => patch({ search: "" })}
          className="w-full sm:max-w-sm"
        />

        <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
          <Select
            options={kindOptions}
            value={filters.kind}
            onValueChange={(value) => patch({ kind: value as ReportFilters["kind"] })}
            placeholder="Report type"
            className="w-full sm:w-44"
          />
          <Select
            options={templateOptions}
            value={filters.template}
            onValueChange={(value) => patch({ template: value as ReportFilters["template"] })}
            placeholder="Template"
            className="w-full sm:w-40"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          When
        </span>
        {datePresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => patch({ datePreset: preset.value })}
          >
            <Badge
              variant={filters.datePreset === preset.value ? "accent" : "outline"}
              className="hover:bg-muted cursor-pointer transition-colors"
            >
              {preset.label}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
