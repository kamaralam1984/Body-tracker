import { ParamsTable } from "@/features/docs/components/api-card";
import { CodeBlock } from "@/features/docs/components/code-block";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { Badge } from "@/components/ui/badge";
import { SDK_EVENTS } from "@/features/docs/lib/sdk-events-content";
import type { EventCategory, EventDoc, TocHeading } from "@/features/docs/types";

const CATEGORY_META: Record<EventCategory, { heading: string; id: string; description: string }> = {
  lifecycle: {
    heading: "Lifecycle events",
    id: "lifecycle-events",
    description:
      "Fired as the tracker itself moves through initialization, independent of any session.",
  },
  tracking: {
    heading: "Tracking events",
    id: "tracking-events",
    description:
      "Fired as frame-by-frame tracking starts, stops, or the detected activity and quality change.",
  },
  session: {
    heading: "Session events",
    id: "session-events",
    description:
      "Fired when a session is created or finalized, mirroring startSession() and stopSession().",
  },
  error: {
    heading: "Error events",
    id: "error-events",
    description:
      "Fired when the tracker encounters a runtime error outside a specific method call's promise.",
  },
};

const CATEGORY_ORDER: EventCategory[] = ["lifecycle", "tracking", "session", "error"];

const HEADINGS: TocHeading[] = [
  { id: "overview", text: "Overview", depth: 2 },
  ...CATEGORY_ORDER.map((category) => ({
    id: CATEGORY_META[category].id,
    text: CATEGORY_META[category].heading,
    depth: 2 as const,
  })),
];

function EventCard({ doc }: { doc: EventDoc }) {
  return (
    <div
      id={doc.name}
      className="border-border flex scroll-mt-24 flex-col gap-4 rounded-lg border p-5"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <code className="text-foreground font-mono text-base font-semibold">{doc.name}</code>
        <Badge variant="outline">{doc.payloadType}</Badge>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{doc.description}</p>
      {doc.payloadFields.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Payload
          </h4>
          <ParamsTable params={doc.payloadFields} />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Example
        </h4>
        <CodeBlock
          code={doc.example.code}
          language={doc.example.language}
          filename={doc.example.filename}
        />
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-4xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground text-lg">
            The tracker emits a fixed set of named events you can subscribe to with{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              tracker.on(event, handler)
            </code>
            , which returns an unsubscribe function, or detach later with{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              tracker.off(event, handler)
            </code>
            . In React, prefer{" "}
            <a
              href="/docs/hooks#use-events"
              className="text-accent font-medium underline underline-offset-4"
            >
              useEvents()
            </a>
            , which subscribes for the component&apos;s lifetime and unsubscribes automatically on
            unmount.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 id="overview" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Overview
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Every event name is a member of the{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              TrackerEventName
            </code>{" "}
            union and falls into one of four categories: <strong>lifecycle</strong> events track the
            tracker instance itself, <strong>tracking</strong> events track the frame-by-frame
            detection process, <strong>session</strong> events track the creation and completion of
            recorded sessions, and the single <strong>error</strong> event surfaces runtime failures
            that don&apos;t belong to a specific method call.
          </p>
        </section>

        {CATEGORY_ORDER.map((category) => {
          const meta = CATEGORY_META[category];
          const events = SDK_EVENTS.filter((e) => e.category === category);
          return (
            <section key={category} className="flex flex-col gap-4">
              <h2 id={meta.id} className="text-foreground scroll-mt-24 text-2xl font-semibold">
                {meta.heading}
              </h2>
              <p className="text-muted-foreground leading-relaxed">{meta.description}</p>
              <div className="flex flex-col gap-6">
                {events.map((doc) => (
                  <EventCard key={doc.id} doc={doc} />
                ))}
              </div>
            </section>
          );
        })}
      </article>

      <aside className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-24">
          <TableOfContents headings={HEADINGS} />
        </div>
      </aside>
    </div>
  );
}
