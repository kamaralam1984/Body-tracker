"use client";

/**
 * Composed Card variants for common enterprise layouts.
 *
 * <MetricCard label="Active members" value="342" icon={Users} />
 * <TrendCard label="Churn rate" value="2.1%" direction="down" changeLabel="-0.4pt" />
 * <AnalyticsCard title="Sessions" description="Last 30 days"><ChartArea data={...} /></AnalyticsCard>
 * <ProfileCard name="Jordan Rivera" role="Coach" stats={[{ label: "Sessions", value: "428" }]} />
 * <FeatureCard icon={BookOpen} title="Docs" description="Guides for every feature." />
 * <SelectableCard title="Team plan" selected={plan === "team"} onSelect={() => setPlan("team")} />
 * <LoadingCard /> — skeleton placeholder while data loads
 */

import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { Card } from "./card";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  className?: string;
}

/** Simple label + value + icon stat. For a version with a delta and sparkline, use `StatTile`. */
export function MetricCard({ label, value, icon: Icon, className }: MetricCardProps) {
  return (
    <Card className={cn("flex items-center gap-4 p-5", className)}>
      {Icon && (
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
          <Icon className="text-muted-foreground size-5" strokeWidth={1.75} />
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p className="text-foreground text-xl font-semibold tracking-tight">{value}</p>
      </div>
    </Card>
  );
}

interface TrendCardProps {
  label: string;
  value: string;
  direction: "up" | "down" | "flat";
  changeLabel: string;
  className?: string;
}

/** Single trend value with strong directional emphasis (for when the delta IS the story). */
export function TrendCard({ label, value, direction, changeLabel, className }: TrendCardProps) {
  const tone =
    direction === "up"
      ? "text-success-600 dark:text-success-500"
      : direction === "down"
        ? "text-danger-600 dark:text-danger-500"
        : "text-muted-foreground";

  return (
    <Card className={cn("flex flex-col gap-2 p-5", className)}>
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-foreground text-2xl font-semibold tracking-tight">{value}</p>
        <div className={cn("flex items-center gap-1 text-xs font-medium", tone)}>
          {direction === "up" && <ArrowUpRight className="size-3.5" strokeWidth={2.25} />}
          {direction === "down" && <ArrowDownRight className="size-3.5" strokeWidth={2.25} />}
          {changeLabel}
        </div>
      </div>
    </Card>
  );
}

interface AnalyticsCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Card wrapper around a chart — title/description/action header + full-bleed content slot. */
export function AnalyticsCard({
  title,
  description,
  action,
  children,
  className,
}: AnalyticsCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4 p-6 pb-0">
        <div className="flex flex-col gap-1">
          <p className="text-foreground text-base font-semibold tracking-tight">{title}</p>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

interface ProfileCardProps {
  name: string;
  role?: string;
  avatarSrc?: string;
  stats?: { label: string; value: string }[];
  action?: React.ReactNode;
  className?: string;
}

/** Person summary card — avatar, name, role, optional stats row and action slot. */
export function ProfileCard({ name, role, avatarSrc, stats, action, className }: ProfileCardProps) {
  return (
    <Card className={cn("flex flex-col gap-5 p-6", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar src={avatarSrc} fallback={name} size="lg" />
          <div className="flex flex-col">
            <p className="text-foreground text-sm font-semibold">{name}</p>
            {role && <p className="text-muted-foreground text-xs">{role}</p>}
          </div>
        </div>
        {action}
      </div>
      {stats && stats.length > 0 && (
        <div className="border-border-subtle grid grid-cols-3 gap-3 border-t pt-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5">
              <p className="text-foreground text-sm font-semibold">{stat.value}</p>
              <p className="text-muted-foreground text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

interface MediaCardProps {
  imageSrc: string;
  imageAlt: string;
  badge?: string;
  title: string;
  description?: string;
  className?: string;
}

/** Content card with a media header — thumbnail/image, title, description, optional badge. */
export function MediaCard({
  imageSrc,
  imageAlt,
  badge,
  title,
  description,
  className,
}: MediaCardProps) {
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <div className="bg-muted relative aspect-video w-full">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover"
        />
        {badge && (
          <Badge
            variant="neutral"
            className="bg-surface-elevated/90 absolute top-3 left-3 backdrop-blur-sm"
          >
            {badge}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-1 p-5">
        <p className="text-foreground text-sm font-semibold">{title}</p>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
    </Card>
  );
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

/** Icon + title + description card, typically used in feature/resource grids. */
export function FeatureCard({ icon: Icon, title, description, className }: FeatureCardProps) {
  return (
    <Card interactive className={cn("flex flex-col gap-3 p-5", className)}>
      <div className="bg-muted flex size-9 items-center justify-center rounded-md">
        <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-foreground text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </Card>
  );
}

interface SelectableCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}

/** Togglable selection card — click/Enter/Space to select, ring highlight + checkmark when active. */
export function SelectableCard({
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
  className,
}: SelectableCardProps) {
  return (
    <Card
      interactive
      selected={selected}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "focus-visible:ring-ring/40 flex items-start gap-3 p-4 focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {Icon && (
        <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
          <Icon className="text-muted-foreground size-4" strokeWidth={1.75} />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-foreground text-sm font-medium">{title}</p>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
      <div
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
          selected ? "border-accent bg-accent" : "border-border",
        )}
      >
        {selected && <Check className="text-accent-foreground size-3" strokeWidth={3} />}
      </div>
    </Card>
  );
}

/** Skeleton placeholder matching a generic card's shape, for loading grids. */
export function LoadingCard({ className }: { className?: string }) {
  return (
    <Card className={cn("flex flex-col gap-4 p-5", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </Card>
  );
}
