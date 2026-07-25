import { cn } from "@/lib/utils";

interface StackedBarSegment {
  label: string;
  value: number;
  /** Tailwind background class for this segment — pass the accent hue for the emphasized series. */
  colorClassName: string;
}

interface StackedBarProps {
  data: StackedBarSegment[];
  className?: string;
}

/** Part-to-whole share, emphasis form — one accent segment, the rest de-emphasized gray. */
export function StackedBar({ data, className }: StackedBarProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {data.map((d) => (
          <div
            key={d.label}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", d.colorClassName)}
            style={{ width: `${(d.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className={cn("size-2 shrink-0 rounded-full", d.colorClassName)} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="text-foreground font-medium">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
