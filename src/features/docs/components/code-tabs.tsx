"use client";

/**
 * Multi-language code example switcher — the "JavaScript / TypeScript /
 * React / Python…" tabs seen on every major SDK docs site. Deliberately
 * does NOT reuse the shared `Tabs` primitive from `@/components/ui/tabs`:
 * that component is theme-adaptive (`text-foreground`, `bg-surface` for the
 * active-tab pill), designed for tab strips that sit on the page's normal
 * light/dark background — but `CodeBlock`'s chrome is a fixed dark surface
 * regardless of site theme (the standard docs-site convention), so the tab
 * strip needs fixed dark-surface colors too. A small hand-rolled strip here
 * avoids fighting that mismatch.
 *
 * <CodeTabs examples={[{language:"javascript", code:"..."}, {language:"typescript", code:"..."}]} />
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import type { CodeExample } from "../types";

const LANGUAGE_LABEL: Record<string, string> = {
  bash: "Shell",
  javascript: "JavaScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  json: "JSON",
  python: "Python",
  http: "HTTP",
};

export interface CodeTabsProps {
  examples: CodeExample[];
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeTabs({ examples, showLineNumbers, className }: CodeTabsProps) {
  const [active, setActive] = useState(0);

  if (examples.length === 0) return null;
  if (examples.length === 1) {
    const only = examples[0];
    return (
      <CodeBlock
        code={only.code}
        language={only.language}
        filename={only.filename}
        showLineNumbers={showLineNumbers}
        highlightLines={only.highlightLines}
        className={className}
      />
    );
  }

  const current = examples[active];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950",
        className,
      )}
    >
      <div role="tablist" className="flex items-center gap-1 border-b border-neutral-800 px-2 pt-2">
        {examples.map((example, i) => {
          const isActive = i === active;
          return (
            <button
              key={example.language + (example.label ?? "") + i}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={cn(
                "relative rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                isActive ? "text-neutral-50" : "text-neutral-500 hover:text-neutral-300",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="code-tabs-indicator"
                  className="absolute inset-0 rounded-t-md bg-neutral-800"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">
                {example.label ?? LANGUAGE_LABEL[example.language] ?? example.language}
              </span>
            </button>
          );
        })}
      </div>
      <CodeBlock
        code={current.code}
        language={current.language}
        filename={current.filename}
        showLineNumbers={showLineNumbers}
        highlightLines={current.highlightLines}
        className="rounded-none border-none"
      />
    </div>
  );
}
