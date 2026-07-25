/**
 * Framework/language-specific integration examples for the `/docs/examples`
 * page. Each entry is a single, complete, copy-pasteable snippet — not a
 * fragment — so a developer can drop it straight into a project matching
 * that `framework` and have it work.
 */

import type { ExampleDoc } from "../types";

export const EXAMPLES: ExampleDoc[] = [
  {
    id: "basic-integration",
    title: "Basic Integration",
    description:
      "The smallest possible integration: create a tracker, initialize it, start a session, and stop it. A good starting point before adding events, error handling, or a framework wrapper.",
    framework: "javascript",
    tags: ["quickstart", "core", "sessions"],
    code: {
      language: "javascript",
      filename: "basic.js",
      code: `import { BodyTracker } from "@bodytracker/sdk";

// 1. Create a tracker instance with your API key.
const tracker = new BodyTracker({
  apiKey: "bt_live_7QxNm...redacted",
});

// 2. Initialize — this requests camera permission and loads the model.
await tracker.init();

// 3. Start a session for a specific activity.
const session = await tracker.startSession({ activity: "walking" });
console.log("Session started:", session);

// 4. Later, stop the session and read the summary.
const summary = await tracker.stopSession();
console.log(\`Tracked \${summary.durationSeconds}s of walking\`);

// 5. Release the camera and any internal listeners when you're done.
tracker.destroy();
`,
    },
  },
  {
    id: "advanced-integration",
    title: "Advanced Integration",
    description:
      "A production-shaped setup: full config (smoothing, restricted activity types), multiple event listeners wired up before initializing, and try/catch error handling around init() for cameras that are denied, missing, or already in use.",
    framework: "typescript",
    tags: ["config", "events", "error-handling"],
    code: {
      language: "typescript",
      filename: "advanced.ts",
      code: `import { BodyTracker, type TrackerEventName } from "@bodytracker/sdk";

const tracker = new BodyTracker({
  apiKey: "bt_live_7QxNm...redacted",
  environment: "production",
  activityTypes: ["standing", "walking", "running"],
  smoothing: { enabled: true, windowSize: 5 },
  locale: "en-US",
});

// Wire up listeners before init() so you don't miss the "ready" event.
const unsubscribers: Array<() => void> = [];

function on(event: TrackerEventName, handler: (payload: unknown) => void) {
  unsubscribers.push(tracker.on(event, handler));
}

on("ready", () => console.log("Tracker ready"));
on("trackingStarted", () => console.log("Tracking started"));
on("trackingLost", () => console.warn("Lost tracking — subject out of frame?"));
on("trackingRestored", () => console.log("Tracking restored"));
on("qualityChanged", (payload) => console.log("Quality:", payload));
on("error", (payload) => console.error("Tracker error:", payload));

async function bootstrap() {
  try {
    await tracker.init();
  } catch (err) {
    // init() rejects if the camera is denied, unavailable, or already
    // claimed by another tab/app — surface this distinctly from tracking
    // errors emitted later via the "error" event.
    console.error("Failed to initialize BodyTracker:", err);
    return;
  }

  await tracker.startSession({ activity: "running", label: "Interval training" });
}

bootstrap();

// Clean up when the page/component tears down.
function teardown() {
  unsubscribers.forEach((unsubscribe) => unsubscribe());
  tracker.destroy();
}
`,
    },
  },
  {
    id: "react-example",
    title: "React Example",
    description:
      "Combining useTracking() and useSession() from @bodytracker/react into a small component with a Start/Tracking status and a Start/Stop session button.",
    framework: "react",
    tags: ["react", "hooks", "sessions"],
    code: {
      language: "tsx",
      filename: "TrackingPanel.tsx",
      code: `import { useTracking, useSession } from "@bodytracker/react";

export function TrackingPanel() {
  const { status, start, stop, error } = useTracking();
  const { session, startSession, stopSession, isRecording } = useSession();

  async function handleToggle() {
    if (isRecording) {
      const summary = await stopSession();
      console.log("Session summary:", summary);
    } else {
      await start();
      await startSession({ activity: "walking", label: "Afternoon walk" });
    }
  }

  return (
    <div>
      <p>Status: {status}</p>
      {error && <p role="alert">Tracking error: {error.message}</p>}
      {session && <p>Recording session {session.id}</p>}

      <button type="button" onClick={handleToggle}>
        {isRecording ? "Stop" : "Start"} tracking
      </button>
    </div>
  );
}
`,
    },
  },
  {
    id: "nextjs-example",
    title: "Next.js Example",
    description:
      'An important SSR-safety note: BodyTracker needs window and camera access, both unavailable during server rendering. This client component marks itself "use client" and only constructs/initializes the tracker inside useEffect, never at module scope or render time.',
    framework: "nextjs",
    tags: ["nextjs", "ssr", "client-component"],
    code: {
      language: "tsx",
      filename: "app/tracker/TrackerClient.tsx",
      code: `"use client";

import { useEffect, useRef, useState } from "react";
import { BodyTracker, type TrackerStatus } from "@bodytracker/sdk";

export function TrackerClient() {
  const trackerRef = useRef<BodyTracker | null>(null);
  const [status, setStatus] = useState<TrackerStatus>("idle");

  useEffect(() => {
    // IMPORTANT: never construct BodyTracker at module scope or during
    // render — the constructor and init() both touch window/getUserMedia,
    // which don't exist during Next.js server rendering and will throw
    // (or silently break) if evaluated outside the browser. useEffect only
    // runs client-side, after mount, which makes it the correct place.
    const tracker = new BodyTracker({
      apiKey: process.env.NEXT_PUBLIC_BODYTRACKER_KEY!,
      environment: "production",
    });
    trackerRef.current = tracker;

    tracker.init().then(() => setStatus(tracker.getStatus()));

    const unsubscribe = tracker.on("qualityChanged", () => {
      setStatus(tracker.getStatus());
    });

    return () => {
      unsubscribe();
      tracker.destroy();
      trackerRef.current = null;
    };
  }, []);

  return <p>Tracker status: {status}</p>;
}
`,
    },
  },
  {
    id: "multi-camera-example",
    title: "Multi-Camera Example",
    description:
      "Listing available cameras and choosing which one BodyTracker uses via the cameraDeviceId config option. The SDK has no runtime device-switch method — switching cameras mid-session means destroy()-ing the current tracker and constructing a new one with the new cameraDeviceId, which this example does honestly rather than inventing an API.",
    framework: "typescript",
    tags: ["camera", "devices", "config"],
    code: {
      language: "typescript",
      filename: "multi-camera.ts",
      code: `import { BodyTracker } from "@bodytracker/sdk";

let tracker: BodyTracker | null = null;

async function listCameras(): Promise<MediaDeviceInfo[]> {
  // Requires an initial getUserMedia prompt for labeled device names.
  await navigator.mediaDevices.getUserMedia({ video: true });
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "videoinput");
}

async function startWithCamera(apiKey: string, cameraDeviceId: string) {
  // The SDK doesn't expose a method to swap cameras on a live instance —
  // cameraDeviceId is only read at construction time. To switch devices,
  // tear down the current instance and create a fresh one.
  if (tracker) {
    tracker.destroy();
    tracker = null;
  }

  tracker = new BodyTracker({
    apiKey,
    cameraDeviceId,
  });

  await tracker.init();
  await tracker.startSession({ activity: "standing" });
  return tracker;
}

// Usage: build a <select> of cameras, then re-initialize on change.
const cameras = await listCameras();
const [first] = cameras;
if (first) {
  await startWithCamera("bt_live_7QxNm...redacted", first.deviceId);
}

// Later, when the user picks a different camera from the <select>:
async function onCameraChange(deviceId: string) {
  await startWithCamera("bt_live_7QxNm...redacted", deviceId);
}
`,
    },
  },
  {
    id: "session-recording",
    title: "Session Recording",
    description:
      'The full record-and-export flow: startSession(), stopSession(), then exportSession(id, "json") to fetch a Blob of the recorded session and save it to disk via a generated download link.',
    framework: "typescript",
    tags: ["sessions", "export", "recording"],
    code: {
      language: "typescript",
      filename: "record-and-export.ts",
      code: `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({ apiKey: "bt_live_7QxNm...redacted" });
await tracker.init();

// Start recording a labeled session.
const session = await tracker.startSession({
  activity: "running",
  label: "5K time trial",
});

// ... user runs, tracker records movement and activity data ...

// Stop the session once the user is done.
const summary = await tracker.stopSession();
console.log(\`Recorded \${summary.durationSeconds}s, session id \${session.id}\`);

// Export the full session as JSON and trigger a browser download.
const blob = await tracker.exportSession(session.id, "json");
downloadBlob(blob, \`session-\${session.id}.json\`);

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
`,
    },
  },
  {
    id: "analytics-integration",
    title: "Analytics Integration",
    description:
      "Rendering a lightweight stats summary — total sessions, total minutes tracked, most frequent activity, and average tracking quality — using the useAnalytics() hook from @bodytracker/react.",
    framework: "react",
    tags: ["react", "hooks", "analytics"],
    code: {
      language: "tsx",
      filename: "StatsSummary.tsx",
      code: `import { useAnalytics } from "@bodytracker/react";

export function StatsSummary() {
  const { totalSessions, totalMinutes, mostFrequentActivity, averageQuality } = useAnalytics();

  return (
    <dl>
      <div>
        <dt>Total sessions</dt>
        <dd>{totalSessions}</dd>
      </div>
      <div>
        <dt>Minutes tracked</dt>
        <dd>{totalMinutes}</dd>
      </div>
      <div>
        <dt>Most frequent activity</dt>
        <dd>{mostFrequentActivity ?? "—"}</dd>
      </div>
      <div>
        <dt>Average quality</dt>
        <dd>{averageQuality ?? "—"}</dd>
      </div>
    </dl>
  );
}
`,
    },
  },
  {
    id: "custom-components",
    title: "Custom Components",
    description:
      "A reusable pattern for wrapping SDK state in your own design system: a small ActivityBadge component built on useActivity() that any part of the app can drop in without touching the hook directly.",
    framework: "react",
    tags: ["react", "hooks", "patterns"],
    code: {
      language: "tsx",
      filename: "ActivityBadge.tsx",
      code: `import { useActivity } from "@bodytracker/react";

const QUALITY_COLOR: Record<string, string> = {
  excellent: "#16a34a",
  good: "#65a30d",
  limited: "#d97706",
  searching: "#6b7280",
  offline: "#dc2626",
};

/**
 * Reusable presentational wrapper around useActivity() — consumers never
 * import the hook directly, so the tracking source can change later
 * without touching every call site.
 */
export function ActivityBadge() {
  const { currentActivity, quality } = useActivity();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 13,
        fontWeight: 500,
        background: "#f4f4f5",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: QUALITY_COLOR[quality] ?? QUALITY_COLOR.offline,
        }}
      />
      {currentActivity ?? "idle"}
    </span>
  );
}
`,
    },
  },
];
