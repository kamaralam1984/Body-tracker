"use client";

import { useEffect, useRef } from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Segmented OTP (one-time-passcode) input. Controlled via `value`/`onChange`,
 * with `value` as the single source of truth (a plain digit string).
 *
 * @example
 * const [code, setCode] = useState("");
 * <OtpInput
 *   length={6}
 *   value={code}
 *   onChange={setCode}
 *   onComplete={(v) => verifyCode(v)}
 *   invalid={hasError}
 * />
 */
export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus,
  className,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const hasFiredComplete = useRef(false);

  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
    // Only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value.length === length) {
      if (!hasFiredComplete.current) {
        hasFiredComplete.current = true;
        onComplete?.(value);
      }
    } else {
      hasFiredComplete.current = false;
    }
  }, [value, length, onComplete]);

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(length - 1, index));
    inputRefs.current[clamped]?.focus();
  }

  function setDigit(index: number, char: string) {
    const next = chars.slice();
    next[index] = char;
    onChange(next.join("").replace(/\s+$/, ""));
  }

  /** Distributes a run of digits across boxes starting from the first box. */
  function distribute(digits: string) {
    const clipped = digits.slice(0, length);
    onChange(clipped);
    if (clipped.length >= length) {
      inputRefs.current[length - 1]?.blur();
    } else if (clipped.length > 0) {
      focusIndex(clipped.length - 1);
    }
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^0-9]/g, "");

    if (!digits) {
      setDigit(index, "");
      return;
    }

    // Some mobile browsers deliver SMS autofill as a multi-character change
    // event (bypassing maxLength) rather than a paste event. Treat that the
    // same as a paste: distribute from the first box.
    if (digits.length > 1) {
      distribute(digits);
      return;
    }

    setDigit(index, digits);
    if (index < length - 1) {
      focusIndex(index + 1);
    } else {
      inputRefs.current[index]?.blur();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !chars[index]) {
      if (index > 0) {
        e.preventDefault();
        setDigit(index - 1, "");
        focusIndex(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!digits) return;
    e.preventDefault();
    distribute(digits);
  }

  return (
    <div className={cn("flex gap-2.5", className)} role="group" aria-label="One-time passcode">
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          value={char}
          disabled={disabled}
          aria-invalid={invalid}
          aria-label={`Digit ${index + 1} of ${length}`}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "border-border bg-surface text-foreground focus-visible:ring-ring/40 focus-visible:border-ring aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30 size-11 rounded-md border text-center text-lg font-semibold shadow-xs transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      ))}
    </div>
  );
}
