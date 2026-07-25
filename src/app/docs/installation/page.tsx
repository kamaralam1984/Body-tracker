import Link from "next/link";
import { CodeBlock } from "@/features/docs/components/code-block";
import { CodeTabs } from "@/features/docs/components/code-tabs";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { Alert } from "@/components/ui/alert";
import type { CodeExample, TocHeading } from "@/features/docs/types";

const HEADINGS: TocHeading[] = [
  { id: "package-managers", text: "Package managers", depth: 2 },
  { id: "react-bindings", text: "React bindings", depth: 2 },
  { id: "requirements", text: "Requirements", depth: 2 },
  { id: "verify-your-installation", text: "Verify your installation", depth: 2 },
  { id: "version-history", text: "Version history", depth: 2 },
];

const PACKAGE_MANAGER_EXAMPLES: CodeExample[] = [
  { language: "bash", label: "npm", code: "npm install @bodytracker/sdk" },
  { language: "bash", label: "yarn", code: "yarn add @bodytracker/sdk" },
  { language: "bash", label: "pnpm", code: "pnpm add @bodytracker/sdk" },
  { language: "bash", label: "bun", code: "bun add @bodytracker/sdk" },
  {
    language: "bash",
    label: "CDN",
    code: `<script type="module">
  import { BodyTracker } from "https://unpkg.com/@bodytracker/sdk@3.4.0/dist/index.js";

  const tracker = new BodyTracker({ apiKey: "bt_live_7QxNm...redacted" });
</script>`,
  },
];

const REACT_INSTALL_EXAMPLES: CodeExample[] = [
  { language: "bash", label: "npm", code: "npm install @bodytracker/react" },
  { language: "bash", label: "yarn", code: "yarn add @bodytracker/react" },
  { language: "bash", label: "pnpm", code: "pnpm add @bodytracker/react" },
  { language: "bash", label: "bun", code: "bun add @bodytracker/react" },
];

const VERIFY_CODE = `import { BodyTracker, VERSION } from "@bodytracker/sdk";

console.log(\`@bodytracker/sdk v\${VERSION}\`);

const tracker = new BodyTracker({ apiKey: "bt_test_3Lw8p...redacted" });
console.log(tracker.getStatus()); // "idle"
`;

const VERSION_HISTORY = [
  {
    version: "3.4.0",
    date: "Current",
    note: "Adds pauseSession/resumeSession and the qualityChanged event.",
  },
  {
    version: "3.3.0",
    date: "Prior",
    note: "Introduces exportSession with JSON, CSV, and PDF output.",
  },
  { version: "3.2.0", date: "Prior", note: "Adds configurable smoothing and locale support." },
  {
    version: "3.0.0",
    date: "Prior",
    note: "Rewrites the event system around on()/off() with unsubscribe functions.",
  },
];

export default function InstallationPage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Installation</h1>
          <p className="text-muted-foreground text-lg">
            Add{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/sdk
            </code>{" "}
            to your project using your package manager of choice, or load it directly from a CDN.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 id="package-managers" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Package managers
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            The core SDK ships as a single package with no runtime dependencies. Install it with
            npm, yarn, pnpm, or bun — or import it straight from a CDN with no build step at all.
          </p>
          <CodeTabs examples={PACKAGE_MANAGER_EXAMPLES} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="react-bindings" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            React bindings
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Building with React? Install{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/react
            </code>{" "}
            alongside the core SDK for hooks and components that manage the tracker lifecycle for
            you.
          </p>
          <CodeTabs examples={REACT_INSTALL_EXAMPLES} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="requirements" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Requirements
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Node.js 18+ for your build tooling, and a modern browser (the latest two versions of
            Chrome, Edge, Safari, or Firefox) with camera access for tracking at runtime. See{" "}
            <Link
              href="/docs/getting-started"
              className="text-accent font-medium underline underline-offset-4"
            >
              Getting Started
            </Link>{" "}
            for the full list.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2
            id="verify-your-installation"
            className="text-foreground scroll-mt-24 text-2xl font-semibold"
          >
            Verify your installation
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Once installed, import the SDK and log its version to confirm everything resolved
            correctly:
          </p>
          <CodeBlock code={VERIFY_CODE} language="typescript" filename="verify.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="version-history" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Version history
          </h2>
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 text-muted-foreground border-b text-left">
                  <th className="px-4 py-2.5 font-medium">Version</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Highlights</th>
                </tr>
              </thead>
              <tbody>
                {VERSION_HISTORY.map((entry, i) => (
                  <tr
                    key={entry.version}
                    className={
                      i !== VERSION_HISTORY.length - 1 ? "border-border border-b" : undefined
                    }
                  >
                    <td className="text-foreground px-4 py-2.5 font-mono text-[13px]">
                      {entry.version}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5">{entry.date}</td>
                    <td className="text-foreground/90 px-4 py-2.5">{entry.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Alert variant="neutral">
            <p>
              See the full{" "}
              <Link
                href="/docs/changelog"
                className="text-accent font-medium underline underline-offset-4"
              >
                Changelog
              </Link>{" "}
              for every release, including patch versions and migration notes.
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
