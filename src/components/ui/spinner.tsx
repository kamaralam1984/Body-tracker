import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

export function Spinner({
  size = "md",
  className,
}: {
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  return (
    <Loader2
      className={cn("text-muted-foreground animate-spin", sizeMap[size], className)}
      aria-label="Loading"
    />
  );
}
