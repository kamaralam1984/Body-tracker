"use client";

import { createContext, forwardRef, useContext, useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  className?: string;
  children: React.ReactNode;
}

export function RadioGroup({ value, onValueChange, name, className, children }: RadioGroupProps) {
  const generatedName = useId();
  return (
    <RadioGroupContext.Provider value={{ name: name ?? generatedName, value, onValueChange }}>
      <div role="radiogroup" className={cn("flex flex-col gap-2.5", className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const RadioGroupItem = forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ value, disabled, className, id }, ref) => {
    const ctx = useContext(RadioGroupContext);
    if (!ctx) throw new Error("RadioGroupItem must be used within a RadioGroup");
    const checked = ctx.value === value;

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => ctx.onValueChange?.(value)}
        className={cn(
          "border-border bg-surface flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
          "focus-visible:ring-ring/40 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
          checked && "border-accent",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <motion.span
          initial={false}
          animate={{ scale: checked ? 1 : 0 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="bg-accent size-2 rounded-full"
        />
      </button>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";
