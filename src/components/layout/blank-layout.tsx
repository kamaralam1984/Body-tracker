import { cn } from "@/lib/utils";

interface BlankLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/** Unopinionated full-viewport shell — no chrome, no nav. Used for standalone
 * screens (maintenance, print views, embeds) that need full control of layout. */
export function BlankLayout({ children, className }: BlankLayoutProps) {
  return <div className={cn("bg-background flex min-h-dvh flex-col", className)}>{children}</div>;
}
