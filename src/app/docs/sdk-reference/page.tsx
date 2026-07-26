import Link from "next/link";
import { ParamsTable } from "@/features/docs/components/api-card";
import { CodeBlock } from "@/features/docs/components/code-block";
import { TableOfContents } from "@/features/docs/components/table-of-contents";
import { Alert } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiParam, TocHeading } from "@/features/docs/types";

const HEADINGS: TocHeading[] = [
  { id: "construction", text: "Construction", depth: 2 },
  { id: "configuration", text: "Configuration", depth: 2 },
  { id: "resource-namespaces", text: "Resource namespaces", depth: 2 },
  { id: "errors", text: "Errors", depth: 2 },
  { id: "retries-circuit-breaker", text: "Retries & circuit breaker", depth: 2 },
  { id: "types", text: "Types", depth: 2 },
];

const CONFIG_PARAMS: ApiParam[] = [
  {
    name: "baseUrl",
    type: "string",
    required: false,
    defaultValue: '"/api/v1"',
    description:
      "Only resolvable as a relative default in a browser, same-origin. Required outside a browser (Node, cross-origin).",
  },
  {
    name: "auth",
    type: "AuthMode",
    required: true,
    description:
      '{ type: "apiKey", apiKey } | { type: "bearer", accessToken?, refreshToken?, store? } | { type: "none", store? } — see Authentication.',
  },
  {
    name: "fetch",
    type: "typeof fetch",
    required: false,
    description:
      "Override the fetch implementation — mainly for tests. Node 18+ and every real browser already have one.",
  },
  {
    name: "retry",
    type: "Partial<RetryConfig>",
    required: false,
    description: "maxAttempts (default 3), baseDelayMs (300), maxDelayMs (8000), shouldRetry.",
  },
  {
    name: "circuitBreaker",
    type: "Partial<CircuitBreakerConfig>",
    required: false,
    description: "failureThreshold (default 5), resetTimeoutMs (30000).",
  },
  {
    name: "timeoutMs",
    type: "number",
    required: false,
    defaultValue: "30000",
    description: "Per-request timeout, distinct from a caller's own AbortSignal.",
  },
  {
    name: "middleware",
    type: "Middleware[]",
    required: false,
    description: "beforeRequest/afterResponse/onError hooks — see use().",
  },
];

const RESOURCE_ROWS: { value: string; meaning: string }[] = [
  { value: "client.sessions", meaning: "Tracking session records — list/get/create/update." },
  {
    value: "client.tracking",
    meaning:
      "Live session lifecycle — start/pause/resume/stop/status/recordRep/recordMetrics/recordExerciseSet.",
  },
  {
    value: "client.analytics",
    meaning:
      "Aggregated analytics — summary, daily snapshots, attention/posture/fatigue/movement/gesture reads.",
  },
  { value: "client.reports", meaning: "Generated report documents — list/get/create/download." },
  {
    value: "client.webhooks",
    meaning: "Outbound event delivery — list/create/update/delete/deliveries/test.",
  },
  {
    value: "client.apiKeys",
    meaning: "Personal API key management — list/create/update/revoke/rotate/rotationHistory.",
  },
  { value: "client.organizations", meaning: "Your org, teams, roles, members." },
  {
    value: "client.users",
    meaning: "The caller's org's users, and your own profile (incl. avatar upload).",
  },
  {
    value: "client.serviceAccounts",
    meaning: "Machine identities for CI/CD — list/create/update/delete/issueApiKey.",
  },
  {
    value: "client.oauth",
    meaning:
      "This app's own OAuth2 provider — client-app CRUD + the authorization-code+PKCE exchange.",
  },
  {
    value: "client.notifications",
    meaning: "Real in-app notifications — list/markRead/markAllRead.",
  },
  {
    value: "client.securityCenter",
    meaning:
      "Real security posture — inactive/expired/near-expiration/compromised keys, failed-auth spikes.",
  },
  {
    value: "client.platformAdmin",
    meaning: "Real cross-org administration — requires a real platform-admin principal.",
  },
  { value: "client.realtime", meaning: "The real SSE tracking-stream client — see Events." },
  {
    value: "client.uploads",
    meaning: "The real file-upload client (avatar upload with real progress events).",
  },
];

const ERROR_ROWS: { value: string; meaning: string }[] = [
  {
    value: "KvlApiError",
    meaning:
      "A real non-2xx HTTP response — carries the server's real code/status/message/details/traceId.",
  },
  {
    value: "KvlNetworkError",
    meaning: "The request never got a response at all (DNS failure, offline, connection refused).",
  },
  { value: "KvlTimeoutError", meaning: "The request was aborted by timeoutMs." },
  { value: "KvlAbortError", meaning: "The caller's own AbortSignal fired." },
  {
    value: "KvlCircuitOpenError",
    meaning:
      "The circuit breaker is open — the request was rejected without even attempting the network call.",
  },
];

const TYPES_CODE = `class KvlClient extends EventEmitter {
  readonly auth: AuthManager;
  readonly baseUrl: string;
  // ...one property per resource namespace, see the table above

  constructor(config: KvlClientConfig);
  use(middleware: Middleware): void;
  request<T>(options: RequestOptions): Promise<T>;
  login(email: string, password: string): Promise<LoginResult>;
  logout(): Promise<void>;
}

interface KvlClientConfig {
  baseUrl?: string;
  auth: AuthMode;
  fetch?: typeof fetch;
  retry?: Partial<RetryConfig>;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  timeoutMs?: number;
  middleware?: Middleware[];
}

type AuthMode =
  | { type: "apiKey"; apiKey: string }
  | { type: "bearer"; accessToken?: string; refreshToken?: string; store?: TokenStore }
  | { type: "none"; store?: TokenStore };

interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}
`;

const INIT_CODE = `import { KvlClient } from "@kvl/sdk";

// Construction is synchronous and cheap — no network request happens
// until you call a method.
const client = new KvlClient({
  baseUrl: "https://bodytracker.kvlbusinesssolutions.com/api/v1",
  auth: { type: "apiKey", apiKey: "sk_live_...redacted" },
});

const { items } = await client.sessions.list({ limit: 10 });
`;

function ConstantsTable({ rows }: { rows: { value: string; meaning: string }[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>What it real does</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.value}>
            <TableCell>
              <code className="text-accent-600 dark:text-accent-400 font-mono text-xs">
                {row.value}
              </code>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm whitespace-normal">
              {row.meaning}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function SdkReferencePage() {
  return (
    <div className="flex gap-12">
      <article className="flex max-w-4xl min-w-0 flex-1 flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">SDK Reference</h1>
          <p className="text-muted-foreground text-lg">
            A conceptual tour of{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">@kvl/sdk</code>
            &apos;s root{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              KvlClient
            </code>{" "}
            — configuration, resource namespaces, real error types, and retry behavior. For the
            client&apos;s own methods (construction, login, request, use, on), see the{" "}
            <Link
              href="/docs/api-reference"
              className="text-accent font-medium underline underline-offset-4"
            >
              API Reference
            </Link>
            ; for every real REST endpoint underneath, see the{" "}
            <Link
              href="/docs/api-explorer"
              className="text-accent font-medium underline underline-offset-4"
            >
              API Explorer
            </Link>
            .
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 id="construction" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Construction
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              new KvlClient(config)
            </code>{" "}
            is synchronous — it sets up the token store, transport, retry/circuit-breaker, and
            instantiates every resource namespace immediately. Nothing touches the network until you
            call a method.
          </p>
          <CodeBlock code={INIT_CODE} language="typescript" filename="client.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="configuration" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Configuration
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Every real field on{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              KvlClientConfig
            </code>
            :
          </p>
          <ParamsTable params={CONFIG_PARAMS} />
        </section>

        <section className="flex flex-col gap-4">
          <h2
            id="resource-namespaces"
            className="text-foreground scroll-mt-24 text-2xl font-semibold"
          >
            Resource namespaces
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Every real resource this API has, wrapped behind a real, typed method group on the
            client instance:
          </p>
          <ConstantsTable rows={RESOURCE_ROWS} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="errors" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Errors
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Every failure mode a real request can hit, as a distinct real error class you can{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">instanceof</code>{" "}
            check (or use{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              isKvlApiError()
            </code>{" "}
            for the common case):
          </p>
          <ConstantsTable rows={ERROR_ROWS} />
        </section>

        <section className="flex flex-col gap-4">
          <h2
            id="retries-circuit-breaker"
            className="text-foreground scroll-mt-24 text-2xl font-semibold"
          >
            Retries &amp; circuit breaker
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Real exponential backoff (with full jitter) retries network failures and 429/502/503/504
            responses up to{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              maxAttempts
            </code>{" "}
            times. A real circuit breaker sits in front of that: after{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              failureThreshold
            </code>{" "}
            consecutive failures, every further request is rejected immediately (no network call at
            all) with{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              KvlCircuitOpenError
            </code>{" "}
            until{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              resetTimeoutMs
            </code>{" "}
            passes, at which point one real trial request is let through.
          </p>
          <Alert variant="info" title="Validation errors are never retried">
            <p>
              Only network failures and 429/502/503/504 are retried by default — a real
              400/401/403/404/422 fails immediately, since retrying it would never succeed.
            </p>
          </Alert>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="types" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Types
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            The core public surface, exported from{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">@kvl/sdk</code>:
          </p>
          <CodeBlock code={TYPES_CODE} language="typescript" filename="types.ts" showLineNumbers />
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
