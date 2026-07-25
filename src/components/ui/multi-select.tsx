"use client";

/**
 * MultiSelect — checkbox-driven multi-value select built on the Popover
 * anchored-overlay shell, following the same structural pattern as `Select`.
 *
 * @example
 * const [value, setValue] = useState<string[]>(["draft"]);
 * <MultiSelect
 *   options={[
 *     { value: "draft", label: "Draft" },
 *     { value: "active", label: "Active" },
 *     { value: "archived", label: "Archived" },
 *   ]}
 *   value={value}
 *   onValueChange={setValue}
 *   placeholder="Filter status…"
 * />
 */

import { useMemo, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Popover } from "./popover";
import { Checkbox } from "./checkbox";
import { Badge } from "./badge";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}

const CHIP_DISPLAY_THRESHOLD = 3;

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchable = true,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOptions = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  function toggleValue(optionValue: string) {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((v) => v !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  }

  function removeValue(optionValue: string, event: React.MouseEvent) {
    event.stopPropagation();
    onValueChange(value.filter((v) => v !== optionValue));
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      className="p-1"
      trigger={
        <button
          type="button"
          className={cn(
            "border-border bg-surface text-foreground flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm shadow-xs transition-colors duration-150",
            "focus-visible:ring-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:outline-none",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {selectedOptions.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selectedOptions.length > 0 && selectedOptions.length <= CHIP_DISPLAY_THRESHOLD && (
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {selectedOptions.map((option) => (
                  <Badge key={option.value} variant="neutral" className="max-w-32 pr-1">
                    <span className="truncate">{option.label}</span>
                    <span
                      role="button"
                      aria-label={`Remove ${option.label}`}
                      onClick={(e) => removeValue(option.value, e)}
                      className="ml-0.5 flex shrink-0 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                    >
                      <X className="size-3" strokeWidth={1.75} />
                    </span>
                  </Badge>
                ))}
              </span>
            )}
            {selectedOptions.length > CHIP_DISPLAY_THRESHOLD && (
              <Badge variant="accent">{selectedOptions.length} selected</Badge>
            )}
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </button>
      }
    >
      <div className="flex flex-col gap-1">
        {searchable && (
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="h-8"
          />
        )}
        <div
          role="listbox"
          aria-multiselectable
          className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
        >
          {filteredOptions.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">No results found</p>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleValue(option.value)}
                  className={cn(
                    "text-foreground flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-100",
                    "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    readOnly
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Popover>
  );
}
