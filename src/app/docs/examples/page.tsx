"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CodeBlock } from "@/features/docs/components/code-block";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EXAMPLES } from "@/features/docs/lib/examples-content";
import type { ExampleFramework, TocHeading } from "@/features/docs/types";

const HEADINGS: TocHeading[] = [{ id: "all-examples", text: "All examples", depth: 2 }];

const FRAMEWORK_LABEL: Record<ExampleFramework, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  react: "React",
  nextjs: "Next.js",
  vue: "Vue",
  angular: "Angular",
  node: "Node.js",
  python: "Python",
};

export default function ExamplesPage() {
  const [filter, setFilter] = useState<ExampleFramework | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const frameworks = useMemo(() => {
    const seen = new Set<ExampleFramework>();
    for (const example of EXAMPLES) seen.add(example.framework);
    return Array.from(seen);
  }, []);

  const visible = filter === "all" ? EXAMPLES : EXAMPLES.filter((e) => e.framework === filter);

  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Examples</h1>
          <p className="text-muted-foreground text-lg">
            Complete, copy-pasteable integrations across languages and frameworks — from a bare
            script to a full Next.js client component. Filter by framework, then click a card to see
            the full source.
          </p>
        </div>

        <section id="all-examples" className="flex scroll-mt-24 flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFilter("all")}>
              <Badge
                variant={filter === "all" ? "accent" : "outline"}
                className="cursor-pointer px-3 py-1 text-[13px]"
              >
                All
              </Badge>
            </button>
            {frameworks.map((fw) => (
              <button key={fw} type="button" onClick={() => setFilter(fw)}>
                <Badge
                  variant={filter === fw ? "accent" : "outline"}
                  className="cursor-pointer px-3 py-1 text-[13px]"
                >
                  {FRAMEWORK_LABEL[fw]}
                </Badge>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visible.map((example) => {
              const isExpanded = expandedId === example.id;
              return (
                <Card
                  key={example.id}
                  interactive
                  selected={isExpanded}
                  className={cn(isExpanded && "sm:col-span-2")}
                >
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : example.id)}
                    aria-expanded={isExpanded}
                  >
                    <CardHeader className="flex-row items-start justify-between gap-3 pb-0">
                      <div className="flex flex-col gap-1">
                        <CardTitle>{example.title}</CardTitle>
                        <CardDescription>{example.description}</CardDescription>
                      </div>
                      <ChevronDown
                        strokeWidth={1.75}
                        className={cn(
                          "text-muted-foreground mt-1 size-4 shrink-0 transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-2 pt-3">
                      <Badge variant="neutral">{FRAMEWORK_LABEL[example.framework]}</Badge>
                      {example.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </CardContent>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6">
                      <CodeBlock
                        code={example.code.code}
                        language={example.code.language}
                        filename={example.code.filename}
                        showLineNumbers
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {visible.length === 0 && (
            <p className="text-muted-foreground text-sm">No examples match this filter.</p>
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
