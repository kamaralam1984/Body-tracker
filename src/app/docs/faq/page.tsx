"use client";

import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SearchInput } from "@/components/ui/input-extras";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { FAQ_ENTRIES } from "@/features/docs/lib/faq-content";
import type { FaqCategory, TocHeading } from "@/features/docs/types";

const CATEGORY_LABEL: Record<FaqCategory, string> = {
  installation: "Installation",
  authentication: "Authentication",
  permissions: "Permissions",
  performance: "Performance",
  troubleshooting: "Troubleshooting",
  "browser-support": "Browser support",
};

const CATEGORY_ORDER: FaqCategory[] = [
  "installation",
  "authentication",
  "permissions",
  "performance",
  "troubleshooting",
  "browser-support",
];

const HEADINGS: TocHeading[] = CATEGORY_ORDER.map((category) => ({
  id: category,
  text: CATEGORY_LABEL[category],
  depth: 2,
}));

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export default function FaqPage() {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = normalized
      ? FAQ_ENTRIES.filter((entry) => {
          const haystack = `${entry.question} ${stripTags(entry.answer)}`.toLowerCase();
          return haystack.includes(normalized);
        })
      : FAQ_ENTRIES;

    return CATEGORY_ORDER.map((category) => ({
      category,
      entries: matches.filter((entry) => entry.category === category),
    })).filter((group) => group.entries.length > 0);
  }, [query]);

  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Frequently asked questions
          </h1>
          <p className="text-muted-foreground text-lg">
            Answers to the questions we hear most often about installing, authenticating, and
            running{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/sdk
            </code>
            . Can&apos;t find what you&apos;re looking for? Search across every question below.
          </p>
        </div>

        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          placeholder="Search the FAQ…"
          aria-label="Search the FAQ"
        />

        {grouped.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No questions match &ldquo;{query}&rdquo;. Try a different search term.
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {grouped.map(({ category, entries }) => (
              <section key={category} className="flex flex-col gap-2">
                <h2 id={category} className="text-foreground scroll-mt-24 text-2xl font-semibold">
                  {CATEGORY_LABEL[category]}
                </h2>
                <Accordion type="multiple">
                  {entries.map((entry) => (
                    <AccordionItem key={entry.id} value={entry.id}>
                      <AccordionTrigger>{entry.question}</AccordionTrigger>
                      <AccordionContent>
                        <div
                          className="[&_code]:bg-muted [&_code]:text-foreground leading-relaxed [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]"
                          dangerouslySetInnerHTML={{ __html: entry.answer }}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        )}
      </article>

      <aside className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-24">
          <TableOfContents headings={HEADINGS} />
        </div>
      </aside>
    </div>
  );
}
