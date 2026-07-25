"use client";

/**
 * Single-date picker built on top of the shared `Popover` and `Calendar`.
 *
 * @example
 * const [date, setDate] = useState<Date | undefined>();
 * <DatePicker value={date} onChange={setDate} placeholder="Due date" />
 *
 * // Controlled form field
 * <DatePicker value={form.dueDate} onChange={(d) => form.setDueDate(d)} />
 */

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover } from "./popover";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
}: DatePickerProps) {
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
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4" strokeWidth={1.75} />
          {value ? format(value, "MMM d, yyyy") : placeholder}
        </Button>
      }
    >
      <Calendar
        mode="single"
        selected={value}
        onSelect={(date) => {
          onChange(date);
          setOpen(false);
        }}
        disabled={disabled}
        autoFocus
      />
    </Popover>
  );
}
