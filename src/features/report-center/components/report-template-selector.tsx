"use client";

/**
 * Template gallery for the "New report" flow — a visual picker over the 4
 * `ReportTemplate`s (`REPORT_TEMPLATES`/`REPORT_TEMPLATE_META`), each shown
 * as a card with a lightweight "page preview" (skeleton bars suggesting a
 * document layout) alongside its label/description/section count.
 *
 * `ReportOrientationToggle` is a small sibling control (portrait/landscape)
 * meant to sit next to the gallery in the same dialog.
 */

import { motion } from "framer-motion";
import { Check, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { REPORT_TEMPLATES, REPORT_TEMPLATE_META } from "../lib/mock-report-center-service";
import type { ReportOrientation, ReportTemplate } from "../types";
import { ButtonGroup } from "@/components/ui/button-extras";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Bar widths (as %) per template, purely decorative — suggests each template's density. */
const PREVIEW_BARS: Record<ReportTemplate, number[]> = {
  executive: [70, 45],
  professional: [80, 55, 65, 40, 60],
  compact: [90],
  detailed: [75, 50, 60, 45, 55, 35, 65],
};

interface ReportTemplateSelectorProps {
  value: ReportTemplate;
  onChange: (template: ReportTemplate) => void;
  className?: string;
}

export function ReportTemplateSelector({
  value,
  onChange,
  className,
}: ReportTemplateSelectorProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {REPORT_TEMPLATES.map((template) => {
        const meta = REPORT_TEMPLATE_META[template];
        const selected = value === template;
        return (
          <motion.button
            key={template}
            type="button"
            onClick={() => onChange(template)}
            aria-pressed={selected}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "border-border bg-surface relative flex flex-col gap-2.5 rounded-lg border p-3 text-left shadow-xs transition-colors duration-150",
              "hover:border-accent/50 focus-visible:ring-ring/40 focus-visible:ring-2 focus-visible:outline-none",
              selected && "border-accent ring-accent/20 ring-2",
            )}
          >
            {selected && (
              <span className="bg-accent text-accent-foreground absolute top-2 right-2 flex size-5 items-center justify-center rounded-full">
                <Check className="size-3" strokeWidth={2.5} />
              </span>
            )}

            <div className="border-border-subtle bg-muted/40 mx-auto flex aspect-[3/4] w-full max-w-[88px] flex-col gap-1.5 rounded-sm border p-2.5">
              {PREVIEW_BARS[template].map((width, i) => (
                <span
                  key={i}
                  className="bg-border h-1.5 rounded-full"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-sm font-semibold">{meta.label}</span>
              <span className="text-muted-foreground text-xs leading-snug">{meta.description}</span>
              <span className="text-muted-foreground mt-1 text-[11px] font-medium tracking-wide uppercase">
                {meta.sectionCount} {meta.sectionCount === 1 ? "section" : "sections"}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

interface ReportOrientationToggleProps {
  value: ReportOrientation;
  onChange: (orientation: ReportOrientation) => void;
  className?: string;
}

export function ReportOrientationToggle({
  value,
  onChange,
  className,
}: ReportOrientationToggleProps) {
  return (
    <ButtonGroup className={className}>
      <Button
        type="button"
        size="sm"
        variant={value === "portrait" ? "primary" : "secondary"}
        aria-pressed={value === "portrait"}
        onClick={() => onChange("portrait")}
      >
        <RectangleVertical className="size-3.5" />
        Portrait
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "landscape" ? "primary" : "secondary"}
        aria-pressed={value === "landscape"}
        onClick={() => onChange("landscape")}
      >
        <RectangleHorizontal className="size-3.5" />
        Landscape
      </Button>
    </ButtonGroup>
  );
}
