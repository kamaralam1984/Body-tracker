import { CodeBlock } from "@/features/docs/components/code-block";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { Alert } from "@/components/ui/alert";
import type { TocHeading } from "@/features/docs/types";

const HEADINGS: TocHeading[] = [
  { id: "api-keys", text: "API keys", depth: 2 },
  { id: "environments", text: "Environments", depth: 2 },
  { id: "configuring-the-client", text: "Configuring the client", depth: 2 },
  { id: "rotating-keys", text: "Rotating keys", depth: 2 },
];

const API_KEY_CODE = `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({
  apiKey: "bt_live_51H8x...redacted",
});
`;

const ENVIRONMENT_CODE = `import { BodyTracker } from "@bodytracker/sdk";

// Sandbox: safe for local development, uses bt_test_ keys,
// and never bills or writes to production analytics.
const tracker = new BodyTracker({
  apiKey: "bt_test_82Vd0...redacted",
  environment: "sandbox",
});
`;

const CONFIG_CODE = `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({
  apiKey: "bt_live_9Fk2q...redacted",
  environment: "production",
  cameraDeviceId: "e3f1c9b2...",
  activityTypes: ["standing", "walking", "running"],
  smoothing: { enabled: true, windowSize: 5 },
  locale: "en-US",
});
`;

export default function AuthenticationPage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Authentication</h1>
          <p className="text-muted-foreground text-lg">
            Every tracker instance is authenticated with an API key, scoped to a production or
            sandbox environment.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 id="api-keys" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            API keys
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Pass your key via the{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">apiKey</code>{" "}
            field when constructing a{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              BodyTracker
            </code>
            . Keys come in two flavors, distinguished by prefix:
          </p>
          <ul className="text-foreground/90 flex list-disc flex-col gap-2 pl-5 leading-relaxed">
            <li>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                bt_live_...
              </code>{" "}
              — production keys. These track real sessions and count against your plan&apos;s usage.
            </li>
            <li>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                bt_test_...
              </code>{" "}
              — sandbox keys. Safe for local development and CI; sessions are not billed or
              persisted long-term.
            </li>
          </ul>
          <CodeBlock code={API_KEY_CODE} language="typescript" filename="tracker.ts" />
          <Alert variant="warning" title="Never expose live keys in client-side bundles">
            <p>
              A{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">bt_live_</code>{" "}
              key embedded in a browser bundle is visible to anyone who opens dev tools. For
              production apps, mint short-lived tokens from your backend — proxy the initial
              handshake through your own server, which holds the real key, and hand the browser a
              scoped token instead. Sandbox keys are lower risk but should still stay out of public
              repos.
            </p>
          </Alert>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="environments" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Environments
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            The optional{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              environment
            </code>{" "}
            field controls which backend your tracker talks to —{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              &quot;production&quot;
            </code>{" "}
            (the default) or{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              &quot;sandbox&quot;
            </code>
            . It should match your key type: pairing a{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">bt_test_</code>{" "}
            key with{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              &quot;production&quot;
            </code>{" "}
            (or vice versa) causes{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">init()</code> to
            reject.
          </p>
          <CodeBlock code={ENVIRONMENT_CODE} language="typescript" filename="sandbox.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2
            id="configuring-the-client"
            className="text-foreground scroll-mt-24 text-2xl font-semibold"
          >
            Configuring the client
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">apiKey</code> is
            the only required field. Everything else in{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              BodyTrackerConfig
            </code>{" "}
            is optional and lets you pin a specific camera, restrict which activities are detected,
            tune motion smoothing, and set a locale for formatted output:
          </p>
          <CodeBlock code={CONFIG_CODE} language="typescript" filename="configured-tracker.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="rotating-keys" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Rotating keys
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            If a key is ever exposed — committed to a public repo, leaked in a client bundle, or
            simply due for routine rotation — revoke it and generate a replacement from the account
            dashboard. Revoking a key takes effect immediately; any tracker instance still using it
            will fail on its next request, so roll out the new key to your deployments before
            revoking the old one.
          </p>
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
