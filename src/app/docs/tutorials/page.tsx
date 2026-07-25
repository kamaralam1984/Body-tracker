"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { CodeBlock } from "@/features/docs/components/code-block";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { TUTORIALS } from "@/features/docs/lib/tutorials-content";
import type { TocHeading, TutorialLevel } from "@/features/docs/types";

const HEADINGS: TocHeading[] = [{ id: "all-tutorials", text: "All tutorials", depth: 2 }];

const LEVEL_LABEL: Record<TutorialLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  enterprise: "Enterprise",
  production: "Production",
  "best-practices": "Best Practices",
};

const LEVEL_BADGE_VARIANT: Record<TutorialLevel, BadgeProps["variant"]> = {
  beginner: "success",
  intermediate: "info",
  advanced: "accent",
  enterprise: "warning",
  production: "danger",
  "best-practices": "neutral",
};

const LEVELS = TUTORIALS.map((t) => t.level);

export default function TutorialsPage() {
  const [filter, setFilter] = useState<TutorialLevel | "all">("all");

  const visible = filter === "all" ? TUTORIALS : TUTORIALS.filter((t) => t.level === filter);

  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Tutorials</h1>
          <p className="text-muted-foreground text-lg">
            Step-by-step guides from your first tracking session to enterprise-scale, production
            deployments. Expand a tutorial to read it in full.
          </p>
        </div>

        <section id="all-tutorials" className="flex scroll-mt-24 flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFilter("all")}>
              <Badge
                variant={filter === "all" ? "accent" : "outline"}
                className="cursor-pointer px-3 py-1 text-[13px]"
              >
                All
              </Badge>
            </button>
            {LEVELS.map((level) => (
              <button key={level} type="button" onClick={() => setFilter(level)}>
                <Badge
                  variant={filter === level ? "accent" : "outline"}
                  className="cursor-pointer px-3 py-1 text-[13px]"
                >
                  {LEVEL_LABEL[level]}
                </Badge>
              </button>
            ))}
          </div>

          <Accordion
            type="single"
            collapsible
            className="border-border bg-surface rounded-xl border px-6"
          >
            {visible.map((tutorial) => (
              <AccordionItem key={tutorial.id} value={tutorial.id}>
                <AccordionTrigger>
                  <span className="flex flex-1 flex-wrap items-center gap-3">
                    <span className="text-foreground font-medium">{tutorial.title}</span>
                    <Badge variant={LEVEL_BADGE_VARIANT[tutorial.level]}>
                      {LEVEL_LABEL[tutorial.level]}
                    </Badge>
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <Clock className="size-3.5" strokeWidth={1.75} />
                      {tutorial.durationMinutes} min read
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-foreground/90 mb-6 leading-relaxed">{tutorial.description}</p>
                  <div className="flex flex-col gap-6">
                    {tutorial.sections.map((section, i) => (
                      <div key={i} className="flex flex-col gap-3">
                        <h3 className="text-foreground text-base font-semibold">
                          {section.heading}
                        </h3>
                        <p className="text-foreground/90 leading-relaxed">{section.body}</p>
                        {section.code && (
                          <CodeBlock
                            code={section.code.code}
                            language={section.code.language}
                            filename={section.code.filename}
                            showLineNumbers
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {visible.length === 0 && (
            <p className="text-muted-foreground text-sm">No tutorials match this filter.</p>
          )}
        </section>
      </article>

      <aside className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-24">
          <TableOfContents headings={HEADINGS} />
        </div>
      </aside>
    </div>
  );
}
