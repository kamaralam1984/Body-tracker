"use client";

/**
 * <PasswordInput placeholder="••••••••" />
 * <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ("")} />
 * <PhoneInput placeholder="+1 (555) 000-0000" />
 * <CurrencyInput value={amount} onChange={setAmount} currency="USD" />
 * <CounterTextarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
 */

import { forwardRef, useState, type ChangeEvent } from "react";
import { Eye, EyeOff, Phone, Search, X } from "lucide-react";
import { Input, type InputProps } from "./input";
import { Textarea, type TextareaProps } from "./textarea";
import { cn } from "@/lib/utils";

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type" | "endIcon">>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative flex items-center">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-9", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="text-muted-foreground hover:text-foreground absolute right-3 flex transition-colors duration-150 focus-visible:outline-none"
        >
          {visible ? (
            <EyeOff className="size-4" strokeWidth={1.75} />
          ) : (
            <Eye className="size-4" strokeWidth={1.75} />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

interface SearchInputProps extends Omit<InputProps, "type" | "startIcon" | "endIcon"> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    const hasValue = typeof value === "string" ? value.length > 0 : Boolean(value);
    return (
      <div className="relative flex items-center">
        <span className="text-muted-foreground pointer-events-none absolute left-3 flex [&_svg]:size-4">
          <Search />
        </span>
        <Input
          ref={ref}
          type="search"
          value={value}
          className={cn("pl-9", hasValue && onClear && "pr-9", className)}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute right-3 flex transition-colors duration-150 focus-visible:outline-none"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";

export const PhoneInput = forwardRef<HTMLInputElement, Omit<InputProps, "type" | "startIcon">>(
  ({ placeholder = "+1 (555) 000-0000", ...props }, ref) => (
    <Input
      ref={ref}
      type="tel"
      inputMode="tel"
      startIcon={<Phone />}
      placeholder={placeholder}
      {...props}
    />
  ),
);
PhoneInput.displayName = "PhoneInput";

interface CurrencyInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  currency?: string;
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

const currencySymbol = (currency: string, locale: string) =>
  (0)
    .toLocaleString(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    .replace(/\d/g, "")
    .trim();

export function CurrencyInput({
  value,
  onChange,
  currency = "USD",
  locale = "en-US",
  placeholder = "0.00",
  disabled,
  invalid,
  className,
}: CurrencyInputProps) {
  const [text, setText] = useState(value !== undefined ? String(value) : "");
  const [focused, setFocused] = useState(false);

  const displayValue = focused
    ? text
    : value !== undefined
      ? new Intl.NumberFormat(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      : "";

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.replace(/[^0-9.]/g, "");
    setText(raw);
    const parsed = Number.parseFloat(raw);
    onChange(Number.isNaN(parsed) ? undefined : parsed);
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      startIcon={<span className="not-italic">{currencySymbol(currency, locale)}</span>}
      value={displayValue}
      placeholder={placeholder}
      disabled={disabled}
      invalid={invalid}
      className={className}
      onFocus={() => {
        setFocused(true);
        setText(value !== undefined ? String(value) : "");
      }}
      onBlur={() => setFocused(false)}
      onChange={handleChange}
    />
  );
}

interface CounterTextareaProps extends TextareaProps {
  maxLength: number;
}

export const CounterTextarea = forwardRef<HTMLTextAreaElement, CounterTextareaProps>(
  ({ maxLength, value, className, ...props }, ref) => {
    const length = typeof value === "string" ? value.length : 0;
    const nearLimit = length >= maxLength * 0.9;

    return (
      <div className="flex flex-col gap-1">
        <Textarea ref={ref} value={value} maxLength={maxLength} className={className} {...props} />
        <p
          className={cn(
            "text-muted-foreground self-end text-xs",
            nearLimit && "text-warning-600 dark:text-warning-500",
          )}
        >
          {length}/{maxLength}
        </p>
      </div>
    );
  },
);
CounterTextarea.displayName = "CounterTextarea";
