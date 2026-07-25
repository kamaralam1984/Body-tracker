"use client";

/**
 * A single report tile for the grid view — a premium document card
 * (Dropbox Paper / Notion document tile), not a raw table row. Mirrors
 * `SessionCard`'s hover-lift, star-toggle, and status-badge techniques.
 *
 * <ReportGrid> renders one of these per `ReportRecord`.
 */

import { motion } from "framer-motion";
import { Share2, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useReportCenterStore } from "../store/report-center-store";
import { formatFileSize, formatRelativeDate } from "../lib/report-format";
import type { ReportRecord } from "../types";
import { ReportKindIcon } from "./report-kind-icon";
import { ReportStatusBadge, ReportTemplateBadge } from "./report-status-badge";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ReportCard({ report, className }: { report: ReportRecord; className?: string }) {
  const isFavorite = useReportCenterStore((state) => state.isFavorite(report));
  const toggleFavorite = useReportCenterStore((state) => state.toggleFavorite);
  const openViewer = useReportCenterStore((state) => state.openViewer);

  const isMuted = report.status === "failed" || report.status === "generating";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={cn("group", className)}
    >
      <Card
        interactive
        onClick={() => openViewer(report.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openViewer(report.id);
          }
        }}
        className={cn(
          "flex flex-col gap-3 p-4 transition-shadow duration-200 hover:shadow-md",
          isMuted && "opacity-70",
        )}
      >
        {/* Header: icon tile + status badge / star */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg",
              isMuted && "grayscale",
            )}
          >
            <ReportKindIcon kind={report.kind} className="text-muted-foreground size-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <ReportStatusBadge status={report.status} />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleFavorite(report.id);
              }}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorite}
              className="hover:bg-muted flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-150"
            >
              <Star
                className={cn(
                  "size-3.5 transition-colors duration-150",
                  isFavorite ? "fill-warning-500 text-warning-500" : "text-muted-foreground",
                )}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>

        {/* Title + date range */}
        <div className="flex flex-col gap-0.5">
          <p className="text-foreground truncate text-sm font-semibold" title={report.title}>
            {report.title}
          </p>
          <p className="text-muted-foreground truncate text-xs">{report.dateRangeLabel}</p>
        </div>

        {/* Template + orientation + shared/archived indicators */}
        <div className="flex flex-wrap items-center gap-2">
          <ReportTemplateBadge template={report.template} />
          <span className="text-muted-foreground text-xs capitalize">{report.orientation}</span>
          {report.shared && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Share2 className="size-3" strokeWidth={2} />
            </span>
          )}
          {report.archived && (
            <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">
              Archived
            </span>
          )}
        </div>

        {/* Footer: author, relative date, file size */}
        <div className="border-border-subtle mt-1 flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar
              src={report.generatedBy.avatarSrc}
              fallback={report.generatedBy.name}
              size="sm"
            />
            <span className="text-foreground truncate text-xs font-medium">
              {report.generatedBy.name}
            </span>
          </div>
          <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
            <span>{formatRelativeDate(report.createdAt)}</span>
            <span aria-hidden>·</span>
            <span>{formatFileSize(report.fileSizeKb)}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
