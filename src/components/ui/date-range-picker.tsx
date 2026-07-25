"use client";

/**
 * Date-range picker built on top of the shared `Popover` and `Calendar`.
 *
 * @example
 * const [range, setRange] = useState<DateRange | undefined>();
 * <DateRangePicker value={range} onChange={setRange} placeholder="Select dates" />
 *
 * // Popover stays open while only `from` is picked, closes once `to` is set.
 */

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Popover } from "./popover";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { cn } from "@/lib/utils";

export type { DateRange };

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function formatRangeLabel(value: DateRange | undefined, placeholder: string) {
  if (!value?.from) return placeholder;
  if (!value.to) return `${format(value.from, "MMM d, yyyy")} – ...`;
  return `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="w-auto p-3"
      trigger={
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-normal",
            !value?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4" strokeWidth={1.75} />
          {formatRangeLabel(value, placeholder)}
        </Button>
      }
    >
      <Calendar
        mode="range"
        numberOfMonths={2}
        selected={value?.from ? { from: value.from, to: value.to } : undefined}
        onSelect={(range) => {
          onChange(range ? { from: range.from, to: range.to } : undefined);
          if (range?.from && range?.to) setOpen(false);
        }}
        disabled={disabled}
        autoFocus
      />
    </Popover>
  );
}
