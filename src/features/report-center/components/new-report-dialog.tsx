"use client";

/**
 * "New report" creation flow — a `Modal` housing a local `NewReportDraft`
 * that gets turned into a real `ReportRecord` via `createReportRecord`
 * (the pure factory in `../lib/mock-report-center-service`) on submit, then
 * handed to the store with `addCreatedReport`. Mount once (e.g. in the
 * report-center page shell); visibility is entirely store-driven via
 * `newReportOpen`/`closeNewReport`.
 *
 * Generation is simulated with a short `Spinner`-backed delay — instant
 * completion would feel cheap for a feature that bills itself as an
 * enterprise report generator — after which the user is dropped straight
 * into the viewer for the report they just made, not left staring at a
 * closed dialog.
 */

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useReportCenterStore } from "../store/report-center-store";
import { createReportRecord, REPORT_KINDS } from "../lib/mock-report-center-service";
import { reportKindLabel } from "../lib/report-format";
import { ReportOrientationToggle, ReportTemplateSelector } from "./report-template-selector";
import type { NewReportDraft, ReportDatePreset } from "../types";

const kindOptions = REPORT_KINDS.map((kind) => ({ value: kind, label: reportKindLabel(kind) }));

const DATE_PRESETS: { value: ReportDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const DATE_PRESET_LABEL: Record<ReportDatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};

const DEFAULT_DRAFT: NewReportDraft = {
  title: "",
  kind: "executive",
  template: "executive",
  orientation: "portrait",
  datePreset: "7d",
};

interface NewReportDialogProps {
  className?: string;
}

export function NewReportDialog({ className }: NewReportDialogProps) {
  const open = useReportCenterStore((state) => state.newReportOpen);
  const closeNewReport = useReportCenterStore((state) => state.closeNewReport);
  const addCreatedReport = useReportCenterStore((state) => state.addCreatedReport);
  const openViewer = useReportCenterStore((state) => state.openViewer);

  const [draft, setDraft] = useState<NewReportDraft>(DEFAULT_DRAFT);
  const [pending, setPending] = useState(false);

  function patch(next: Partial<NewReportDraft>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function handleClose() {
    if (pending) return;
    closeNewReport();
    setDraft(DEFAULT_DRAFT);
  }

  function handleSubmit() {
    setPending(true);
    window.setTimeout(() => {
      const record = createReportRecord({
        title: draft.title.trim() || reportKindLabel(draft.kind),
        kind: draft.kind,
        template: draft.template,
        orientation: draft.orientation,
        dateRangeLabel: DATE_PRESET_LABEL[draft.datePreset],
      });
      addCreatedReport(record);
      setPending(false);
      closeNewReport();
      setDraft(DEFAULT_DRAFT);
      openViewer(record.id);
    }, 600);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New report"
      description="Generate a new document from your tracking data."
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            loading={pending}
            disabled={pending}
          >
            {pending ? (
              <>
                <Spinner size="sm" />
                Generating…
              </>
            ) : (
              "Generate report"
            )}
          </Button>
        </>
      }
    >
      <div className={cn("flex flex-col gap-6", className)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex w-full flex-col gap-1.5">
            <label className="text-foreground text-sm font-medium" htmlFor="new-report-title">
              Title
            </label>
            <Input
              id="new-report-title"
              placeholder="e.g. Weekly Performance Report"
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
              disabled={pending}
            />
          </div>

          <div className="flex w-full flex-col gap-1.5 sm:max-w-56">
            <label className="text-foreground text-sm font-medium">Report type</label>
            <Select
              options={kindOptions}
              value={draft.kind}
              onValueChange={(value) => patch({ kind: value as NewReportDraft["kind"] })}
              placeholder="Report type"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-foreground text-sm font-medium">Template</label>
            <ReportOrientationToggle
              value={draft.orientation}
              onChange={(orientation) => patch({ orientation })}
            />
          </div>
          <ReportTemplateSelector
            value={draft.template}
            onChange={(template) => patch({ template })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-medium">Date range</label>
          <div className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                disabled={pending}
                onClick={() => patch({ datePreset: preset.value })}
              >
                <Badge
                  variant={draft.datePreset === preset.value ? "accent" : "outline"}
                  className="hover:bg-muted cursor-pointer transition-colors"
                >
                  {preset.label}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
