"use client";

/**
 * Small, elegant "warming up" indicator for the `initializing` tracking
 * status specifically — distinct from the full-frame
 * `CameraLoadingScreen` (Phase 3), which stands in for the entire preview
 * before it mounts. This is sized to sit inline near the status badge,
 * layered on top of an already-visible camera preview.
 *
 * <TrackingLoadingIndicator />
 */

import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function TrackingLoadingIndicator({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn("text-muted-foreground flex items-center gap-2 text-sm", className)}
    >
      <Spinner size="sm" />
      <span>Preparing tracking…</span>
    </motion.div>
  );
}
