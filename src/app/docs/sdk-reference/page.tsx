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
  { id: "initialization", text: "Initialization", depth: 2 },
  { id: "configuration", text: "Configuration", depth: 2 },
  { id: "lifecycle", text: "Lifecycle", depth: 2 },
  { id: "utilities", text: "Utilities", depth: 2 },
  { id: "constants", text: "Constants", depth: 2 },
  { id: "types-interfaces", text: "Types & Interfaces", depth: 2 },
];

const CONFIG_PARAMS: ApiParam[] = [
  {
    name: "apiKey",
    type: "string",
    required: true,
    description:
      'Your BodyTracker API key, e.g. "bt_live_..." for production or "bt_test_..." for sandbox testing.',
  },
  {
    name: "environment",
    type: '"production" | "sandbox"',
    required: false,
    defaultValue: '"production"',
    description:
      'Use "sandbox" during development to exercise the API against synthetic tracking data with no camera required.',
  },
  {
    name: "cameraDeviceId",
    type: "string",
    required: false,
    description:
      "The deviceId of a specific camera to use. Omit to let the SDK pick the system default.",
  },
  {
    name: "activityTypes",
    type: "ActivityType[]",
    required: false,
    description:
      "Restricts detection to a subset of activity types. Omit to detect all supported activities.",
  },
  {
    name: "smoothing",
    type: "{ enabled: boolean; windowSize?: number }",
    required: false,
    description:
      "Applies a rolling-average filter to reduce jitter in movement data. windowSize is the number of frames averaged.",
  },
  {
    name: "locale",
    type: "string",
    required: false,
    description:
      'A BCP 47 locale tag (e.g. "en-US") used to localize error messages and export labels.',
  },
];

const STATUS_ROWS: { value: string; meaning: string }[] = [
  {
    value: "idle",
    meaning: "The tracker has been constructed but init() has not been called yet.",
  },
  {
    value: "initializing",
    meaning: "init() is in progress — requesting camera permission and loading the tracking model.",
  },
  { value: "ready", meaning: "init() has resolved; the tracker is ready to start a session." },
  { value: "tracking", meaning: "A session is actively recording movement data." },
  { value: "paused", meaning: "A session exists but is paused via pauseSession()." },
  { value: "stopped", meaning: "destroy() has been called; the instance can no longer be used." },
  { value: "error", meaning: "An unrecoverable error occurred during initialization or tracking." },
];

const ACTIVITY_ROWS: { value: string; meaning: string }[] = [
  { value: "standing", meaning: "Subject is upright and stationary." },
  { value: "walking", meaning: "Subject is moving at a walking pace." },
  { value: "running", meaning: "Subject is moving at a running pace." },
  { value: "sitting", meaning: "Subject is seated." },
  { value: "idle", meaning: "No activity has been confidently detected yet." },
];

const QUALITY_ROWS: { value: string; meaning: string }[] = [
  {
    value: "excellent",
    meaning: "High-confidence tracking with a clear, well-lit view of the subject.",
  },
  { value: "good", meaning: "Reliable tracking with minor visibility or lighting limitations." },
  {
    value: "limited",
    meaning: "Tracking is degraded — consider repositioning the camera or subject.",
  },
  { value: "searching", meaning: "The tracker is actively trying to reacquire the subject." },
  { value: "offline", meaning: "No camera feed is available to evaluate quality." },
];

const TYPES_CODE = `class BodyTracker {
  constructor(config: BodyTrackerConfig);
  init(): Promise<void>;
  startSession(options?: StartSessionOptions): Promise<Session>;
  stopSession(): Promise<SessionSummary>;
  pauseSession(): void;
  resumeSession(): void;
  getStatus(): TrackerStatus;
  getActivity(): ActivitySnapshot;
  on(event: TrackerEventName, handler: (payload: unknown) => void): () => void; // returns unsubscribe fn
  off(event: TrackerEventName, handler: (payload: unknown) => void): void;
  exportSession(sessionId: string, format: "json" | "csv" | "pdf"): Promise<Blob>;
  destroy(): void;
}

interface BodyTrackerConfig {
  apiKey: string;
  environment?: "production" | "sandbox"; // default "production"
  cameraDeviceId?: string;
  activityTypes?: ActivityType[];
  smoothing?: { enabled: boolean; windowSize?: number };
  locale?: string;
}

interface StartSessionOptions {
  activity?: ActivityType;
  label?: string;
}

type TrackerStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "tracking"
  | "paused"
  | "stopped"
  | "error";

type ActivityType = "standing" | "walking" | "running" | "sitting" | "idle";

type QualityLevel = "excellent" | "good" | "limited" | "searching" | "offline";

interface Session {
  id: string;
  startedAt: string;
  activity: ActivityType;
  status: "recording" | "paused";
}

interface SessionSummary {
  id: string;
  durationSeconds: number;
  activity: ActivityType;
  averageQuality: QualityLevel;
}

interface ActivitySnapshot {
  activity: ActivityType;
  quality: QualityLevel;
  since: string;
}

type TrackerEventName =
  | "ready"
  | "trackingStarted"
  | "trackingStopped"
  | "trackingLost"
  | "trackingRestored"
  | "sessionStarted"
  | "sessionEnded"
  | "movementChanged"
  | "activityChanged"
  | "qualityChanged"
  | "error";
`;

const INIT_CODE = `import { BodyTracker } from "@bodytracker/sdk";

// 1. Construct — synchronous, cheap, no camera or model work yet.
const tracker = new BodyTracker({ apiKey: "bt_live_4Nq8v...redacted" });

// 2. Initialize — async, requests camera permission and loads the model.
await tracker.init();

console.log(tracker.getStatus()); // "ready"
`;

function ConstantsTable({ rows }: { rows: { value: string; meaning: string }[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Value</TableHead>
          <TableHead>Meaning</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.value}>
            <TableCell>
              <code className="text-accent-600 dark:text-accent-400 font-mono text-xs">
                &quot;{row.value}&quot;
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
            A conceptual tour of the{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/sdk
            </code>{" "}
            core: how the tracker initializes, how it&apos;s configured, how it moves through its
            lifecycle, and the constants and types that make up its public surface. For the
            method-by-method breakdown, see the{" "}
            <Link
              href="/docs/api-reference"
              className="text-accent font-medium underline underline-offset-4"
            >
              API Reference
            </Link>
            .
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 id="initialization" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Initialization
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Creating a tracker is deliberately split into two steps. The{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              new BodyTracker(config)
            </code>{" "}
            constructor is synchronous and cheap — it validates your config and returns an instance
            in the{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">idle</code>{" "}
            status, with no side effects on the page. Nothing touches the camera or downloads a
            model yet, so you can construct a tracker eagerly (at module scope, in a provider,
            wherever is convenient) without worrying about triggering a permission prompt or a
            network request too early.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">init()</code> is
            where the real work happens: it requests camera access via{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              getUserMedia
            </code>
            , downloads and warms up the on-device tracking model, and only then transitions the
            tracker to{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">ready</code>.
            Separating the two steps means you control exactly when the permission prompt appears —
            for example, behind a user-initiated &quot;Enable camera&quot; button, rather than the
            moment your component mounts.
          </p>
          <CodeBlock code={INIT_CODE} language="typescript" filename="init.ts" />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="configuration" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Configuration
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Every option accepted by the{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              BodyTrackerConfig
            </code>{" "}
            object passed to the constructor:
          </p>
          <ParamsTable params={CONFIG_PARAMS} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="lifecycle" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Lifecycle
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            A tracker instance moves through a small, well-defined state machine. Read the current
            state at any point with{" "}
            <Link
              href="/docs/api-reference#get-status"
              className="text-accent font-medium underline underline-offset-4"
            >
              getStatus()
            </Link>
            , or subscribe to lifecycle and tracking events for reactive updates instead of polling.
          </p>
          <ol className="text-foreground/90 flex list-decimal flex-col gap-2 pl-5 leading-relaxed">
            <li>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">idle</code> —
              immediately after construction. Nothing has happened yet.
            </li>
            <li>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                initializing
              </code>{" "}
              — while{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">init()</code>{" "}
              is in flight.
            </li>
            <li>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">ready</code> —
              init() resolved; waiting for a session.
            </li>
            <li>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">tracking</code>{" "}
              ⇄ <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">paused</code>{" "}
              — a session is active; pauseSession()/resumeSession() move back and forth between
              these two without ending it.
            </li>
            <li>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">stopped</code>{" "}
              — after{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
                destroy()
              </code>
              . Terminal — construct a new tracker to track again.
            </li>
          </ol>
          <Alert variant="warning" title="error is reachable from any state">
            <p>
              A tracker can transition to <code className="font-mono text-[13px]">error</code> from
              any other state if initialization fails or an unrecoverable runtime error occurs —
              always attach an{" "}
              <Link
                href="/docs/events#error"
                className="text-accent font-medium underline underline-offset-4"
              >
                error
              </Link>{" "}
              listener in production.
            </p>
          </Alert>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="utilities" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Utilities
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Beyond the core lifecycle and session methods, the tracker exposes{" "}
            <Link
              href="/docs/api-reference#export-session"
              className="text-accent font-medium underline underline-offset-4"
            >
              exportSession()
            </Link>{" "}
            for turning a completed session into a downloadable{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">json</code>,{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">csv</code>, or{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">pdf</code> export
            — see the API Reference entry for its full signature, parameters, and an example.
          </p>
        </section>

        <section className="flex flex-col gap-6">
          <h2 id="constants" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Constants
          </h2>
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground font-mono text-sm font-semibold">TrackerStatus</h3>
            <ConstantsTable rows={STATUS_ROWS} />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground font-mono text-sm font-semibold">ActivityType</h3>
            <ConstantsTable rows={ACTIVITY_ROWS} />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground font-mono text-sm font-semibold">QualityLevel</h3>
            <ConstantsTable rows={QUALITY_ROWS} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 id="types-interfaces" className="text-foreground scroll-mt-24 text-2xl font-semibold">
            Types &amp; Interfaces
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            The full set of TypeScript declarations that make up the core SDK&apos;s public surface,
            exported from{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]">
              @bodytracker/sdk
            </code>
            :
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
