import Link from "next/link";
import { CodeBlock } from "@/features/docs/components/code-block";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { Alert } from "@/components/ui/alert";
import type { TocHeading } from "@/features/docs/types";

const HEADINGS: TocHeading[] = [
  { id: "overview", text: "Overview", depth: 2 },
  { id: "requirements", text: "Requirements", depth: 2 },
  { id: "quick-start", text: "Quick Start", depth: 2 },
  { id: "your-first-session", text: "Your First Session", depth: 2 },
  { id: "next-steps", text: "Next Steps", depth: 2 },
];

const QUICK_START_CODE = `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({ apiKey: "bt_live_51H8x...redacted" });

await tracker.init();

const session = await tracker.startSession({ activity: "walking" });

tracker.on("movementChanged", (event) => {
  console.log("Movement changed:", event);
});

await tracker.stopSession();
tracker.destroy();
`;

const FIRST_SESSION_CODE = `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({ apiKey: "bt_live_9F2ke...redacted" });

await tracker.init();

tracker.on("sessionStarted", (session) => {
  console.log("Session started:", session);
});

tracker.on("sessionEnded", (summary) => {
  console.log("Session ended:", summary);
});

const session = await tracker.startSession({
  activity: "running",
  label: "Morning run",
});

// Poll the current activity snapshot at any point during tracking.
const snapshot = tracker.getActivity();
console.log(\`Currently \${snapshot.activity}, quality: \${snapshot.quality}\`);

const summary = await tracker.stopSession();
console.log(\`Recorded \${summary.durationSeconds}s of \${summary.activity}\`);
`;

export default function GettingStartedPage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Getting Started</h1>
          <p className="text-muted-foreground text-lg">
            Add real-time body tracking, activity detection, and session analytics to your app in a
            few minutes.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 id="overview" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Overview
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/sdk
            </code>{" "}
            is a framework-agnostic JavaScript SDK for real-time body tracking in the browser. It
            turns a device camera feed into structured activity data — standing, walking, running,
            sitting — along with movement quality signals and session analytics, so you can build
            fitness, physical-therapy, or motion-aware products without training or hosting your own
            computer-vision models.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            The core package has no UI and no framework dependencies. If you&apos;re building with
            React, pair it with{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/react
            </code>{" "}
            for hooks and components that wrap the same tracker instance.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="requirements" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Requirements
          </h2>
          <ul className="text-foreground/90 flex list-disc flex-col gap-2 pl-5 leading-relaxed">
            <li>Node.js 18 or later for your build tooling.</li>
            <li>
              A browser with camera access — the SDK requests permission via{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                getUserMedia
              </code>
              .
            </li>
            <li>
              A modern browser: the latest two versions of Chrome, Edge, Safari, or Firefox. Older
              browsers may lack the WebGL and WebAssembly features tracking relies on.
            </li>
            <li>A BodyTracker API key — grab one from the dashboard after signing up.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="quick-start" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Quick Start
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Install the package, then initialize a tracker, start a session, and listen for movement
            updates:
          </p>
          <CodeBlock code={QUICK_START_CODE} language="typescript" filename="tracker.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2
            id="your-first-session"
            className="text-foreground scroll-mt-24 text-2xl font-semibold"
          >
            Your First Session
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            A session represents one continuous tracking window. Listen for{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              sessionStarted
            </code>{" "}
            and{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              sessionEnded
            </code>{" "}
            to react to lifecycle changes, and call{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              getActivity()
            </code>{" "}
            at any point to read the current activity and tracking quality:
          </p>
          <CodeBlock code={FIRST_SESSION_CODE} language="typescript" filename="first-session.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="next-steps" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Next Steps
          </h2>
          <Alert variant="info" title="Where to go next">
            <p>
              Continue with{" "}
              <Link
                href="/docs/installation"
                className="text-accent font-medium underline underline-offset-4"
              >
                Installation
              </Link>{" "}
              for package-manager specific setup, browse the{" "}
              <Link
                href="/docs/api-reference"
                className="text-accent font-medium underline underline-offset-4"
              >
                API Reference
              </Link>{" "}
              for every method and event, or explore{" "}
              <Link
                href="/docs/examples"
                className="text-accent font-medium underline underline-offset-4"
              >
                Examples
              </Link>{" "}
              for full framework integrations.
            </p>
          </Alert>
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
