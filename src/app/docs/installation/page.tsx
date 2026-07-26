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
  { language: "bash", label: "npm", code: "npm install @kvl/sdk" },
  { language: "bash", label: "yarn", code: "yarn add @kvl/sdk" },
  { language: "bash", label: "pnpm", code: "pnpm add @kvl/sdk" },
  { language: "bash", label: "bun", code: "bun add @kvl/sdk" },
  {
    language: "bash",
    label: "CDN",
    code: `<script src="https://your-cdn.example.com/kvl-sdk.global.js"></script>
<script>
  const client = new KvlSDK.KvlClient({
    baseUrl: "https://bodytracker.kvlbusinesssolutions.com/api/v1",
    auth: { type: "apiKey", apiKey: "sk_live_...redacted" },
  });
</script>`,
  },
];

const REACT_INSTALL_EXAMPLES: CodeExample[] = [
  { language: "bash", label: "npm", code: "npm install @kvl/react" },
  { language: "bash", label: "yarn", code: "yarn add @kvl/react" },
  { language: "bash", label: "pnpm", code: "pnpm add @kvl/react" },
  { language: "bash", label: "bun", code: "bun add @kvl/react" },
];

const VERIFY_CODE = `import { KvlClient } from "@kvl/sdk";

const client = new KvlClient({ auth: { type: "none" } });
const health = await fetch(\`\${client.baseUrl}/health\`).then((r) => r.json());
console.log(health); // { status: "ok", timestamp: "..." }
`;

const VERSION_HISTORY = [
  {
    version: "0.1.0",
    date: "Current",
    note: "First real release — full REST API coverage (13 resource areas), auth (API key/Bearer/OAuth2/auto-refresh), real-time SSE client, file upload, React hooks. See the Changelog.",
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
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">@kvl/sdk</code>{" "}
            to your project using your package manager of choice, or load the CDN bundle directly.
          </p>
        </div>

        <Alert variant="neutral">
          <p>
            <strong>Not yet published to a public npm registry.</strong> The code is real, built,
            and tested (ESM + CJS + a minified CDN bundle, both dual-tested against a real running
            server) — publishing is a deliberate, separate step. Until then, install from this
            monorepo directly: <code className="font-mono text-[13px]">npm install</code> at the
            repo root links both packages via npm workspaces.
          </p>
        </Alert>

        <section className="flex flex-col gap-4">
          <h2 id="package-managers" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Package managers
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            The core SDK has zero runtime dependencies beyond the real Web/Node platform APIs it
            already uses (fetch, FormData, AbortController). Install it with npm, yarn, pnpm, or bun
            — or load the real minified CDN bundle with no build step at all.
          </p>
          <CodeTabs examples={PACKAGE_MANAGER_EXAMPLES} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="react-bindings" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            React bindings
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Building with React? Install{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">@kvl/react</code>{" "}
            alongside the core SDK for real hooks (useQuery/useMutation/useCurrentUser/useRealtime/
            ...) built on @tanstack/react-query.
          </p>
          <CodeTabs examples={REACT_INSTALL_EXAMPLES} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="requirements" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Requirements
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Node.js 18+ (for its real global <code className="font-mono text-[13px]">fetch</code>)
            or any modern browser. React 18+ if you use{" "}
            <code className="font-mono text-[13px]">@kvl/react</code>. No camera or media
            permissions are needed by this SDK itself — see{" "}
            <Link
              href="/docs/getting-started"
              className="text-accent font-medium underline underline-offset-4"
            >
              Getting Started
            </Link>{" "}
            for a real quick start.
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
            Once installed, construct a real client and hit the real health endpoint to confirm
            everything resolved correctly:
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
