"use client";

/**
 * The right-rail "On this page" TOC. Each content page declares its own
 * `TocHeading[]` (matching the `id`s on its actual `<h2>`/`<h3>` elements)
 * rather than this component scraping the DOM or an MDX AST — there's no
 * MDX pipeline in this project, so headings are just data, same as
 * everything else in this docs portal.
 *
 * <TableOfContents headings={[{id:"overview", text:"Overview", depth:2}]} />
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useScrollSpy } from "../hooks/use-scroll-spy";
import type { TocHeading } from "../types";

export function TableOfContents({
  headings,
  className,
}: {
  headings: TocHeading[];
  className?: string;
}) {
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const activeId = useScrollSpy(ids);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" className={cn("flex flex-col gap-2", className)}>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        On this page
      </p>
      <ul className="border-border flex flex-col gap-1 border-l">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  "-ml-px block border-l-2 py-1 text-sm transition-colors duration-150",
                  heading.depth === 3 ? "pl-7" : "pl-3.5",
                  active
                    ? "border-accent-500 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
