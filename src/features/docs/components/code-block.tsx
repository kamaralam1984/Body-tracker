"use client";

/**
 * The flagship docs primitive — a premium code block (Stripe/Vercel-docs
 * quality): dark chrome regardless of site theme (code blocks read best on
 * a fixed dark surface, matching virtually every major docs site), a
 * language/filename header, a copy button, optional line numbers, and
 * optional highlighted lines. Syntax coloring comes from the hand-built
 * tokenizer in `../lib/code-highlight.ts` (no Shiki/Prism dependency).
 *
 * <CodeBlock code={code} language="typescript" filename="tracker.ts" />
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { tokenizeLine, TOKEN_CLASS } from "../lib/code-highlight";
import type { CodeLanguage } from "../types";

const LANGUAGE_LABEL: Record<CodeLanguage, string> = {
  bash: "Shell",
  javascript: "JavaScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  json: "JSON",
  python: "Python",
  http: "HTTP",
};

export interface CodeBlockProps {
  code: string;
  language: CodeLanguage;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = false,
  highlightLines = [],
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  const highlighted = new Set(highlightLines);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {filename ? (
            <span className="truncate font-mono text-xs text-neutral-300">{filename}</span>
          ) : (
            <span className="text-xs font-medium text-neutral-400">{LANGUAGE_LABEL[language]}</span>
          )}
          {filename && (
            <span className="shrink-0 rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium tracking-wide text-neutral-400 uppercase">
              {LANGUAGE_LABEL[language]}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-400 transition-colors duration-150 hover:bg-neutral-800 hover:text-neutral-100"
        >
          {copied ? (
            <>
              <Check className="text-success-500 size-3.5" strokeWidth={2} />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" strokeWidth={1.75} />
              Copy
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto">
        <pre className="py-3 text-[13px] leading-relaxed">
          <code className="grid">
            {lines.map((line, i) => {
              const lineNumber = i + 1;
              const tokens = tokenizeLine(line, language);
              return (
                <span
                  key={i}
                  className={cn(
                    "px-4",
                    highlighted.has(lineNumber) &&
                      "bg-accent-500/10 border-accent-400 -ml-px border-l-2 pl-[calc(1rem-2px)]",
                  )}
                >
                  {showLineNumbers && (
                    <span className="mr-4 inline-block w-5 shrink-0 text-right text-neutral-600 select-none">
                      {lineNumber}
                    </span>
                  )}
                  {tokens.length === 0 ? (
                    <span>&nbsp;</span>
                  ) : (
                    tokens.map((token, tokenIndex) => (
                      <span key={tokenIndex} className={TOKEN_CLASS[token.type]}>
                        {token.text}
                      </span>
                    ))
                  )}
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
