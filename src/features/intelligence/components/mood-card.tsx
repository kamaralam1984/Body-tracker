"use client";

/**
 * The "current mood" card — deliberately icon-forward and numberless (no
 * confidence score, no probability breakdown), matching the brief's
 * "elegant mood cards, never raw probabilities" requirement. Icons are
 * calm, everyday shapes (never robot/brain iconography).
 */

import { motion } from "framer-motion";
import {
  BatteryLow,
  Compass,
  Eye,
  Meh,
  Smile,
  Target,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MoodState } from "../types";

export const MOOD_ICON: Record<MoodState, LucideIcon> = {
  calm: Waves,
  happy: Smile,
  focused: Target,
  neutral: Meh,
  surprised: Eye,
  thinking: Compass,
  engaged: Zap,
  "low-energy": BatteryLow,
};

export const MOOD_ACCENT: Record<MoodState, string> = {
  calm: "bg-info-bg text-info-600 dark:text-info-500",
  happy: "bg-success-bg text-success-600 dark:text-success-500",
  focused: "bg-accent-100 text-accent-600 dark:bg-accent-900 dark:text-accent-400",
  neutral: "bg-muted text-muted-foreground",
  surprised: "bg-warning-bg text-warning-600 dark:text-warning-500",
  thinking: "bg-muted text-muted-foreground",
  engaged: "bg-success-bg text-success-600 dark:text-success-500",
  "low-energy": "bg-danger-bg text-danger-600 dark:text-danger-500",
};

export interface MoodCardProps {
  mood: MoodState;
  label: string;
  description: string;
  className?: string;
}

export function MoodCard({ mood, label, description, className }: MoodCardProps) {
  const Icon = MOOD_ICON[mood];
  return (
    <Card className={cn("flex items-center gap-4 p-5", className)}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          MOOD_ACCENT[mood],
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </motion.div>
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground text-xs font-medium">Current mood</p>
        <p className="text-foreground text-base font-semibold">{label}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </Card>
  );
}
