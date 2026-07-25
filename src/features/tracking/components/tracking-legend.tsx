"use client";

/**
 * Compact mode-toggle panel for the tracking feature — lets the user turn
 * Face / Hands / Pose detection on or off individually. Despite the name
 * (kept for parity with the brief), this is not a literal color-coded key —
 * the UI never exposes debug/technical vocabulary, so a small icon-toggle
 * row is the premium equivalent: immediately understandable via icon +
 * tooltip, no labels required.
 *
 * Sits near the camera controls (e.g. beside `CameraToolbar` or inside a
 * side panel) — not a full settings page.
 *
 * <TrackingLegend />
 */

import { Hand, PersonStanding, ScanFace } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTrackingContext } from "../context/tracking-provider";
import type { TrackingMode } from "../types";

interface ModeMeta {
  mode: TrackingMode;
  label: string;
  icon: LucideIcon;
}

const MODES: ModeMeta[] = [
  { mode: "face", label: "Face", icon: ScanFace },
  { mode: "hand", label: "Hands", icon: Hand },
  { mode: "pose", label: "Pose", icon: PersonStanding },
];

export function TrackingLegend({ className }: { className?: string }) {
  const { config, toggleMode } = useTrackingContext();

  return (
    <Card
      className={cn("flex items-center gap-1 p-1.5", className)}
      role="group"
      aria-label="Tracking modes"
    >
      {MODES.map(({ mode, label, icon: Icon }) => {
        const enabled = config.modes.has(mode);
        return (
          <Tooltip key={mode} content={`${label} tracking${enabled ? " on" : " off"}`}>
            <div
              className={cn(
                "ease-standard flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors duration-200",
                enabled ? "bg-accent-100 dark:bg-accent-900" : "hover:bg-muted",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  enabled ? "text-accent-700 dark:text-accent-200" : "text-muted-foreground",
                )}
                strokeWidth={1.75}
                aria-hidden
              />
              <Switch
                checked={enabled}
                onCheckedChange={() => toggleMode(mode)}
                aria-label={`Toggle ${label.toLowerCase()} tracking`}
              />
            </div>
          </Tooltip>
        );
      })}
    </Card>
  );
}
