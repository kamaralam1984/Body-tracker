"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
} as const;

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: keyof typeof sizeMap;
  status?: "online" | "offline" | "away" | "busy";
  className?: string;
}

const statusColor: Record<NonNullable<AvatarProps["status"]>, string> = {
  online: "bg-success-500",
  offline: "bg-neutral-400",
  away: "bg-warning-500",
  busy: "bg-danger-500",
};

export function Avatar({ src, alt, fallback, size = "md", status, className }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;

  return (
    <span className={cn("relative inline-flex shrink-0", sizeMap[size], className)}>
      <span
        className={cn(
          "bg-muted text-muted-foreground ring-border-subtle relative flex size-full items-center justify-center overflow-hidden rounded-full font-medium ring-1 ring-inset",
        )}
      >
        {showImage ? (
          <Image
            src={src}
            alt={alt ?? ""}
            fill
            sizes="64px"
            className="object-cover"
            onError={() => setErrored(true)}
          />
        ) : (
          <span className="uppercase">{fallback?.slice(0, 2)}</span>
        )}
      </span>
      {status && (
        <span
          className={cn(
            "ring-background absolute right-0 bottom-0 block size-2.5 rounded-full ring-2",
            statusColor[status],
          )}
        />
      )}
    </span>
  );
}
