"use client";

/**
 * <AvatarGroup max={4}>
 *   {members.map((m) => <Avatar key={m.id} fallback={m.name} />)}
 * </AvatarGroup>
 * <AvatarUpload fallback="Jordan Rivera" onFileSelect={(file) => ...} />
 */

import { useId, useRef } from "react";
import { Camera } from "lucide-react";
import { Avatar, type AvatarProps } from "./avatar";
import { cn } from "@/lib/utils";

interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

/** Overlapping avatar stack with a "+N" overflow indicator once `max` is exceeded. */
export function AvatarGroup({ children, max = 4, size = "md", className }: AvatarGroupProps) {
  const items = Array.isArray(children) ? children : [children];
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;

  const ringSize = {
    sm: "size-7 text-xs",
    md: "size-9 text-sm",
    lg: "size-12 text-base",
    xl: "size-16 text-lg",
  }[size ?? "md"];

  return (
    <div className={cn("flex items-center -space-x-2.5", className)}>
      {visible.map((child, index) => (
        <div key={index} className="ring-background rounded-full ring-2">
          {child}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "bg-muted text-muted-foreground ring-background relative flex shrink-0 items-center justify-center rounded-full font-medium ring-2",
            ringSize,
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

interface AvatarUploadProps {
  src?: string;
  fallback?: string;
  size?: AvatarProps["size"];
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

/** Avatar with a hover overlay to trigger a file picker — upload wiring is the caller's responsibility. */
export function AvatarUpload({
  src,
  fallback,
  size = "xl",
  onFileSelect,
  disabled,
  className,
}: AvatarUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("group relative inline-flex", className)}>
      <Avatar src={src} fallback={fallback} size={size} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label="Change photo"
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-neutral-900/0 text-transparent transition-colors duration-150",
          "group-hover:bg-neutral-900/50 group-hover:text-white focus-visible:bg-neutral-900/50 focus-visible:text-white",
          "focus-visible:ring-ring/40 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Camera className="size-4" strokeWidth={1.75} />
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelect?.(file);
        }}
      />
    </div>
  );
}
