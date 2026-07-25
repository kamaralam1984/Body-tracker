import { ApiCard } from "@/features/docs/components/api-card";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { API_METHODS } from "@/features/docs/lib/sdk-api-content";
import type { TocHeading } from "@/features/docs/types";

const HEADINGS: TocHeading[] = API_METHODS.map((doc) => ({
  id: doc.id,
  text: doc.name,
  depth: 2,
}));

export default function ApiReferencePage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-4xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">API Reference</h1>
          <p className="text-muted-foreground text-lg">
            Complete reference for the{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              BodyTracker
            </code>{" "}
            class — the single entry point for the core{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/sdk
            </code>{" "}
            package. Every constructor, method, and property is documented below with its full
            signature, parameters, return value, and a runnable example. If you&apos;re building
            with React, the{" "}
            <a href="/docs/hooks" className="text-accent font-medium underline underline-offset-4">
              Hooks reference
            </a>{" "}
            wraps this same class with reactive bindings.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {API_METHODS.map((doc) => (
            <ApiCard key={doc.id} doc={doc} />
          ))}
        </div>
      </article>

      <aside className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-24">
          <TableOfContents headings={HEADINGS} />
        </div>
      </aside>
    </div>
  );
}
