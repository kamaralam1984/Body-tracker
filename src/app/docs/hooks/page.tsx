import { HookCard } from "@/features/docs/components/api-card";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { Alert } from "@/components/ui/alert";
import { SDK_HOOKS } from "@/features/docs/lib/sdk-hooks-content";
import type { TocHeading } from "@/features/docs/types";

const HEADINGS: TocHeading[] = SDK_HOOKS.map((doc) => ({
  id: doc.id,
  text: doc.name,
  depth: 2,
}));

export default function HooksPage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-4xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">React Hooks</h1>
          <p className="text-muted-foreground text-lg">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/react
            </code>{" "}
            wraps a shared{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              BodyTracker
            </code>{" "}
            instance with hooks that read tracker state reactively instead of polling the imperative
            methods in the{" "}
            <a
              href="/docs/api-reference"
              className="text-accent font-medium underline underline-offset-4"
            >
              API Reference
            </a>
            . Every hook below reads from the same underlying tracker, provided once near the root
            of your component tree.
          </p>
        </div>

        <Alert variant="info" title="Requires a provider">
          <p>
            All hooks on this page expect a{" "}
            <code className="font-mono text-[13px]">&lt;BodyTrackerProvider&gt;</code> somewhere
            above them in the tree, constructed once with your{" "}
            <code className="font-mono text-[13px]">BodyTrackerConfig</code>. Calling a hook outside
            a provider throws at render time.
          </p>
        </Alert>

        <div className="flex flex-col gap-8">
          {SDK_HOOKS.map((doc) => (
            <HookCard key={doc.id} doc={doc} />
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
