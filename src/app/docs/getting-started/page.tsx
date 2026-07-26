import Link from "next/link";
import { CodeBlock } from "@/features/docs/components/code-block";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { Alert } from "@/components/ui/alert";
import type { TocHeading } from "@/features/docs/types";

const HEADINGS: TocHeading[] = [
  { id: "overview", text: "Overview", depth: 2 },
  { id: "requirements", text: "Requirements", depth: 2 },
  { id: "quick-start", text: "Quick Start", depth: 2 },
  { id: "your-first-tracking-session", text: "Your First Tracking Session", depth: 2 },
  { id: "next-steps", text: "Next Steps", depth: 2 },
];

const QUICK_START_CODE = `import { KvlClient } from "@kvl/sdk";

const client = new KvlClient({
  baseUrl: "https://bodytracker.kvlbusinesssolutions.com/api/v1",
  auth: { type: "apiKey", apiKey: "sk_live_...redacted" },
});

const { items, total } = await client.sessions.list({ limit: 10 });
console.log(\`\${total} sessions, showing \${items.length}\`);

client.on("request.error", ({ error }) => console.error(error));
`;

const FIRST_SESSION_CODE = `import { KvlClient } from "@kvl/sdk";

const client = new KvlClient({ auth: { type: "none" } });
await client.login("owner@example.com", "correct-password");

const session = await client.sessions.create({ title: "Morning run", activityKind: "running" });
await client.tracking.start(session.id);

// Real-time: subscribe to real events pushed over the session's SSE stream.
client.realtime.on("tracking.rep", (payload) => console.log("rep recorded:", payload));
const disconnect = client.realtime.connect(session.id);

await client.tracking.recordRep(session.id, { formScore: 91 });

const stopped = await client.tracking.stop(session.id);
console.log(\`Session \${stopped.id} completed, \${stopped.repCount} reps recorded\`);
disconnect();
`;

export default function GettingStartedPage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Getting Started</h1>
          <p className="text-muted-foreground text-lg">
            Wrap every real Body Tracker REST API endpoint, auth flow, and real-time tracking event
            behind a clean, strongly-typed client — in a few minutes.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 id="overview" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Overview
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">@kvl/sdk</code>{" "}
            is the official TypeScript SDK for the real Body Tracker REST API — sessions, live
            tracking, analytics, reports, webhooks, API keys, organizations, users, OAuth2, service
            accounts, notifications, the Security Center, and platform administration. Every method
            is generated against the real, live OpenAPI schema this API serves at{" "}
            <Link
              href="/docs/api-explorer"
              className="text-accent font-medium underline underline-offset-4"
            >
              /api/v1/openapi.json
            </Link>{" "}
            — nothing here can silently drift from what the server actually does.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            The core package has no UI and no framework dependency. If you&apos;re building with
            React, pair it with{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">@kvl/react</code>{" "}
            for real hooks (useQuery, useMutation, useCurrentUser, useRealtime, ...) built on{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @tanstack/react-query
            </code>
            .
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="requirements" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Requirements
          </h2>
          <ul className="text-foreground/90 flex list-disc flex-col gap-2 pl-5 leading-relaxed">
            <li>
              Node.js 18+ (for its real global{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">fetch</code>)
              or any modern browser.
            </li>
            <li>
              A real API key (
              <Link
                href="/docs/authentication"
                className="text-accent font-medium underline underline-offset-4"
              >
                Authentication
              </Link>
              ) or a real user session — no camera, no device permissions needed by the SDK itself.
            </li>
            <li>
              React 18+ if you use{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                @kvl/react
              </code>
              .
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="quick-start" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Quick Start
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Construct a client with a real API key and list your organization&apos;s real sessions:
          </p>
          <CodeBlock code={QUICK_START_CODE} language="typescript" filename="client.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2
            id="your-first-tracking-session"
            className="text-foreground scroll-mt-24 text-2xl font-semibold"
          >
            Your First Tracking Session
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Log in, create a real tracking session, start it, subscribe to real live events over the
            session&apos;s SSE stream, record a rep, then stop it:
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
                href="/docs/api-explorer"
                className="text-accent font-medium underline underline-offset-4"
              >
                API Explorer
              </Link>{" "}
              for every real REST endpoint, or the{" "}
              <Link
                href="/docs/sdk-reference"
                className="text-accent font-medium underline underline-offset-4"
              >
                SDK Reference
              </Link>{" "}
              for the client&apos;s own methods.
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
