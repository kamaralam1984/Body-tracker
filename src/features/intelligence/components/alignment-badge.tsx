"use client";

import { Badge } from "@/components/ui/badge";
import type { AlignmentQuality } from "../types";

const ALIGNMENT_LABEL: Record<AlignmentQuality, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  "needs-improvement": "Needs improvement",
};

const ALIGNMENT_VARIANT: Record<AlignmentQuality, "success" | "info" | "warning" | "danger"> = {
  excellent: "success",
  good: "info",
  fair: "warning",
  "needs-improvement": "danger",
};

export function AlignmentBadge({
  quality,
  className,
}: {
  quality: AlignmentQuality;
  className?: string;
}) {
  return (
    <Badge variant={ALIGNMENT_VARIANT[quality]} className={className}>
      {ALIGNMENT_LABEL[quality]}
    </Badge>
  );
}
