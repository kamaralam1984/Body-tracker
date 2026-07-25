/**
 * Maps every `ActivityKind` to a lucide-react icon and a small convenience
 * component to render it. Every icon below is verified to exist in the
 * installed `lucide-react` version.
 *
 * <ActivityIcon kind={activity.kind} className="size-5" />
 */

import {
  Armchair,
  ArrowUpFromLine,
  CircleDashed,
  Footprints,
  Hand,
  HelpCircle,
  Move,
  PersonStanding,
  ScanFace,
  Smile,
  Waves,
  Zap,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityKind } from "../types";

export const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  walking: Footprints,
  standing: PersonStanding,
  sitting: Armchair,
  running: Zap,
  jumping: ArrowUpFromLine,
  "raise-hand": Hand,
  wave: Waves,
  smile: Smile,
  blink: Eye,
  "head-movement": ScanFace,
  "hand-movement": Hand,
  "body-movement": Move,
  idle: CircleDashed,
  unknown: HelpCircle,
};

export function ActivityIcon({ kind, className }: { kind: ActivityKind; className?: string }) {
  const Icon = ACTIVITY_ICON[kind];
  return <Icon className={cn("size-5", className)} strokeWidth={1.75} />;
}
