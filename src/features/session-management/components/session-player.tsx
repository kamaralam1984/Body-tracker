"use client";

/**
 * The main session replay surface — an honest, premium placeholder preview
 * (this app never records real footage, only live tracking, so there is no
 * video underneath this; see `use-playback-engine.ts`) paired with
 * `ReplayControls` below it. The `usePlaybackEngine` instance is created
 * HERE and passed down as a prop, so the preview and the toolbar/scrubber
 * always share one clock rather than drifting apart as two independent
 * engines.
 *
 * <SessionPlayer session={session} timelineEvents={events} />
 */

import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Armchair,
  CircleDashed,
  Footprints,
  PersonStanding,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlaybackEngine } from "../hooks/use-playback-engine";
import { formatClockTime } from "../lib/session-format";
import type { ActivityType, SessionRecord, SessionTimelineEvent } from "../types";
import { ReplayControls } from "./replay-controls";

const ACTIVITY_ICON: Record<ActivityType, LucideIcon> = {
  standing: PersonStanding,
  walking: Footprints,
  running: Wind,
  sitting: Armchair,
  idle: CircleDashed,
};

const EASE = [0.16, 1, 0.3, 1] as const;

interface SessionPlayerProps {
  session: SessionRecord;
  timelineEvents: SessionTimelineEvent[];
  className?: string;
}

export function SessionPlayer({ session, timelineEvents, className }: SessionPlayerProps) {
  const engine = usePlaybackEngine({ durationSeconds: session.durationSeconds });
  const containerRef = useRef<HTMLDivElement>(null);
  const ActivityIcon = ACTIVITY_ICON[session.activity];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        ref={containerRef}
        className="border-border relative aspect-video w-full overflow-hidden rounded-2xl border bg-neutral-950 shadow-lg"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="relative flex size-20 items-center justify-center rounded-full bg-white/5">
            {engine.isPlaying && (
              <motion.span
                aria-hidden
                className="bg-accent/25 absolute inset-0 rounded-full"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <motion.div
              animate={{ scale: engine.isPlaying ? 1 : 0.94, opacity: engine.isPlaying ? 1 : 0.85 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <ActivityIcon className="size-8 text-neutral-300" strokeWidth={1.5} />
            </motion.div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-neutral-50">{session.name}</p>
            <p className="text-xs text-neutral-400">
              {engine.isPlaying ? "Replaying tracking data" : "Paused"} ·{" "}
              {formatClockTime(engine.currentTime)} / {formatClockTime(session.durationSeconds)}
            </p>
          </div>
        </div>

        {/* Honest disclaimer — this is a simulated time position, not a video frame. */}
        <div className="absolute top-4 left-4">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-neutral-400 backdrop-blur-sm">
            Simulated playback · no recorded footage
          </span>
        </div>
      </div>

      <ReplayControls
        engine={engine}
        durationSeconds={session.durationSeconds}
        timelineEvents={timelineEvents}
        containerRef={containerRef}
      />
    </div>
  );
}
