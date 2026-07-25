"use client";

/**
 * "Current session" summary card — live status, start time, running
 * duration, camera source, and two placeholder actions. Export/replay have
 * no implementation yet (this phase is UI-foundation only), so the buttons
 * are rendered disabled with a "Coming soon" caption rather than looking
 * like a broken/dead-end interaction.
 */

import { motion } from "framer-motion";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDuration, useSessionDuration } from "../hooks/use-session-duration";
import { useSessionStore } from "../store/session-store";
import type { SessionStatus } from "../types";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const SESSION_STATUS_META: Record<SessionStatus, { label: string; variant: BadgeVariant }> = {
  idle: { label: "Idle", variant: "neutral" },
  running: { label: "Running", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  completed: { label: "Completed", variant: "info" },
};

interface SessionPanelProps {
  cameraLabel: string;
  className?: string;
}

export function SessionPanel({ cameraLabel, className }: SessionPanelProps) {
  const session = useSessionStore((s) => s.session);
  const durationMs = useSessionDuration();

  const statusMeta = SESSION_STATUS_META[session.status];
  const startedAtLabel = session.startedAt ? new Date(session.startedAt).toLocaleTimeString() : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className={cn("flex flex-col gap-5 p-6", className)}>
        <div className="flex items-start justify-between gap-4">
          <p className="text-foreground text-base font-semibold tracking-tight">Current session</p>
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-muted-foreground text-xs font-medium">Started at</p>
            <p className="text-foreground text-sm font-semibold">{startedAtLabel}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-muted-foreground text-xs font-medium">Duration</p>
            <p className="text-foreground text-sm font-semibold">{formatDuration(durationMs)}</p>
          </div>
          <div className="col-span-2 flex flex-col gap-0.5">
            <p className="text-muted-foreground text-xs font-medium">Camera</p>
            <p className="text-foreground text-sm font-semibold">{cameraLabel}</p>
          </div>
        </div>

        <div className="border-border-subtle flex flex-col gap-2 border-t pt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled title="Coming soon">
              Export session
            </Button>
            <Button variant="outline" size="sm" disabled title="Coming soon">
              Replay session
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">Coming soon</p>
        </div>
      </Card>
    </motion.div>
  );
}
