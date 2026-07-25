/**
 * Structured API reference content for `@bodytracker/sdk`'s core `BodyTracker`
 * class — one `ApiMethodDoc` per member, in declaration order (constructor,
 * lifecycle methods, session methods, status/activity readers, the event
 * emitter pair, export, and teardown). Rendered by
 * `src/app/docs/api-reference/page.tsx` via `<ApiCard doc={...} />`.
 *
 * Keep this file in sync with the canonical `BodyTracker` class shape — every
 * public member gets exactly one entry here, `id`s are kebab-case and double
 * as deep-link anchors (`/docs/api-reference#start-session`).
 */

import type { ApiMethodDoc } from "../types";

export const API_METHODS: ApiMethodDoc[] = [
  {
    id: "constructor",
    kind: "constructor",
    name: "new BodyTracker()",
    signature: "new BodyTracker(config: BodyTrackerConfig)",
    description:
      "Creates a new tracker instance from a configuration object. The constructor is synchronous and does no camera or model work — it validates the config, stores it, and puts the tracker in the idle status. Call init() afterward to perform the async setup that actually prepares tracking.",
    params: [
      {
        name: "config",
        type: "BodyTrackerConfig",
        required: true,
        description:
          "Tracker configuration: your API key, target environment, optional camera device, activity type allowlist, movement smoothing, and locale.",
      },
    ],
    returns: {
      type: "BodyTracker",
      description: "A new tracker instance in the idle status, ready to be initialized.",
    },
    throws: [
      {
        type: "TypeError",
        description: "Thrown synchronously if config.apiKey is missing, empty, or not a string.",
      },
    ],
    examples: [
      {
        language: "typescript",
        filename: "tracker.ts",
        code: `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({
  apiKey: "bt_live_7Gm3q...redacted",
  environment: "production",
  activityTypes: ["standing", "walking", "running"],
  smoothing: { enabled: true, windowSize: 5 },
});

console.log(tracker.getStatus()); // "idle"
`,
      },
    ],
    notes: [
      "Constructing a tracker has no side effects on the page — no camera prompt, no network request — until init() is called.",
      'Use environment: "sandbox" during development to exercise the full API against synthetic tracking data without a real camera feed.',
    ],
    since: "1.0.0",
  },
  {
    id: "init",
    kind: "method",
    name: "init()",
    signature: "init(): Promise<void>",
    description:
      "Performs the tracker's asynchronous setup: requests camera permission via getUserMedia, downloads and warms up the on-device tracking model, and transitions status from idle to initializing to ready. Every other tracking method requires init() to have resolved first.",
    params: [],
    returns: {
      type: "Promise<void>",
      description:
        "Resolves once the tracker has reached the ready status and startSession() can be called.",
    },
    throws: [
      {
        type: "CameraPermissionDeniedError",
        description:
          "Thrown if the user denies the camera permission prompt or the browser blocks getUserMedia.",
      },
      {
        type: "ModelLoadError",
        description:
          "Thrown if the tracking model fails to download or fails to initialize on the current device.",
      },
    ],
    examples: [
      {
        language: "typescript",
        filename: "init.ts",
        code: `const tracker = new BodyTracker({ apiKey: "bt_test_2Lp9x...redacted" });

try {
  await tracker.init();
  console.log(tracker.getStatus()); // "ready"
} catch (error) {
  console.error("Failed to initialize tracker:", error);
}
`,
      },
    ],
    notes: [
      "Calling init() more than once on the same instance is safe — subsequent calls resolve immediately once the tracker is ready.",
      'In environment: "sandbox" mode, init() skips the camera permission prompt entirely and resolves against synthetic data.',
    ],
    since: "1.0.0",
  },
  {
    id: "start-session",
    kind: "method",
    name: "startSession()",
    signature: "startSession(options?: StartSessionOptions): Promise<Session>",
    description:
      "Begins a new tracking session and transitions status to tracking. A session groups continuous movement data under a single id until stopSession() is called, and can be paused and resumed without ending it.",
    params: [
      {
        name: "options",
        type: "StartSessionOptions",
        required: false,
        description:
          "Optional session metadata: the activity to record under and a human-readable label shown in exports and dashboards.",
      },
    ],
    returns: {
      type: "Promise<Session>",
      description: "Resolves with the newly created session once recording has started.",
    },
    throws: [
      {
        type: "TrackerNotReadyError",
        description:
          "Thrown if init() has not resolved yet — the tracker must be in the ready status.",
      },
      {
        type: "SessionAlreadyActiveError",
        description: "Thrown if a session is already recording or paused; stop it first.",
      },
    ],
    examples: [
      {
        language: "typescript",
        filename: "start-session.ts",
        code: `await tracker.init();

const session = await tracker.startSession({
  activity: "running",
  label: "Morning run",
});

console.log(session.id, session.status); // "recording"
`,
      },
    ],
    notes: [
      "If options.activity is omitted, the SDK infers the initial activity from the live camera feed as soon as tracking starts.",
    ],
    since: "1.0.0",
  },
  {
    id: "stop-session",
    kind: "method",
    name: "stopSession()",
    signature: "stopSession(): Promise<SessionSummary>",
    description:
      "Ends the active tracking session, finalizes its analytics, and transitions status back to ready. Use exportSession() afterward if you need the raw or formatted session data.",
    params: [],
    returns: {
      type: "Promise<SessionSummary>",
      description:
        "Resolves with the completed session's duration, activity, and average tracking quality.",
    },
    throws: [
      {
        type: "NoActiveSessionError",
        description: "Thrown if there is no recording or paused session to stop.",
      },
    ],
    examples: [
      {
        language: "typescript",
        filename: "stop-session.ts",
        code: `const summary = await tracker.stopSession();

console.log(\`Tracked \${summary.durationSeconds}s of \${summary.activity}\`);
console.log(\`Average quality: \${summary.averageQuality}\`);
`,
      },
    ],
    since: "1.0.0",
  },
  {
    id: "pause-session",
    kind: "method",
    name: "pauseSession()",
    signature: "pauseSession(): void",
    description:
      "Pauses the active session without ending it — movement data stops accumulating and status becomes paused, but the session id and elapsed duration are preserved. Call resumeSession() to continue.",
    params: [],
    returns: {
      type: "void",
      description: "No return value; check getStatus() to confirm the tracker is now paused.",
    },
    throws: [
      {
        type: "NoActiveSessionError",
        description: "Thrown if there is no recording session to pause.",
      },
    ],
    examples: [
      {
        language: "typescript",
        filename: "pause-session.ts",
        code: `tracker.pauseSession();
console.log(tracker.getStatus()); // "paused"
`,
      },
    ],
    notes: [
      "Unlike stopSession(), pausing does not produce a SessionSummary — the session is still open.",
    ],
    since: "1.0.0",
  },
  {
    id: "resume-session",
    kind: "method",
    name: "resumeSession()",
    signature: "resumeSession(): void",
    description:
      "Resumes a session previously paused with pauseSession(), transitioning status back to tracking and continuing to accumulate movement data on the same session id.",
    params: [],
    returns: {
      type: "void",
      description: "No return value; check getStatus() to confirm the tracker is tracking again.",
    },
    throws: [
      {
        type: "NoActiveSessionError",
        description: "Thrown if there is no paused session to resume.",
      },
    ],
    examples: [
      {
        language: "typescript",
        filename: "resume-session.ts",
        code: `tracker.resumeSession();
console.log(tracker.getStatus()); // "tracking"
`,
      },
    ],
    since: "1.0.0",
  },
  {
    id: "get-status",
    kind: "method",
    name: "getStatus()",
    signature: "getStatus(): TrackerStatus",
    description:
      "Synchronously reads the tracker's current lifecycle status. Useful for guarding calls to session methods or driving UI state without subscribing to events.",
    params: [],
    returns: {
      type: "TrackerStatus",
      description:
        'One of "idle" | "initializing" | "ready" | "tracking" | "paused" | "stopped" | "error".',
    },
    examples: [
      {
        language: "typescript",
        filename: "get-status.ts",
        code: `const status = tracker.getStatus();

if (status === "tracking") {
  console.log("Currently recording a session.");
}
`,
      },
    ],
    since: "1.0.0",
  },
  {
    id: "get-activity",
    kind: "method",
    name: "getActivity()",
    signature: "getActivity(): ActivitySnapshot",
    description:
      "Synchronously reads the most recently detected activity and tracking quality, along with the timestamp since that activity began. Useful for polling in render loops where subscribing to activityChanged would be overkill.",
    params: [],
    returns: {
      type: "ActivitySnapshot",
      description:
        "The current activity, its tracking quality, and an ISO 8601 timestamp for when it started.",
    },
    examples: [
      {
        language: "typescript",
        filename: "get-activity.ts",
        code: `const snapshot = tracker.getActivity();

console.log(\`\${snapshot.activity} (\${snapshot.quality} quality) since \${snapshot.since}\`);
`,
      },
    ],
    notes: [
      'Before the first activity is detected, activity defaults to "idle" and quality to "searching".',
    ],
    since: "1.0.0",
  },
  {
    id: "on",
    kind: "method",
    name: "on()",
    signature: "on(event: TrackerEventName, handler: (payload: unknown) => void): () => void",
    description:
      "Subscribes handler to the given event and returns an unsubscribe function — the preferred way to detach a listener, especially for handlers created inline. See the Events reference for every event name and its payload shape.",
    params: [
      {
        name: "event",
        type: "TrackerEventName",
        required: true,
        description: 'The event to subscribe to, e.g. "activityChanged" or "sessionEnded".',
      },
      {
        name: "handler",
        type: "(payload: unknown) => void",
        required: true,
        description:
          "Called with the event's payload each time it fires. Narrow payload's type per-event using the Events reference.",
      },
    ],
    returns: {
      type: "() => void",
      description:
        "A function that, when called, removes this exact handler from this exact event.",
    },
    examples: [
      {
        language: "typescript",
        filename: "on.ts",
        code: `const unsubscribe = tracker.on("activityChanged", (event) => {
  console.log("Activity changed:", event);
});

// Later, when you no longer need updates:
unsubscribe();
`,
      },
    ],
    notes: [
      "The same handler can be registered for multiple events, and the same event can have multiple handlers — all are called in registration order.",
    ],
    since: "2.0.0",
  },
  {
    id: "off",
    kind: "method",
    name: "off()",
    signature: "off(event: TrackerEventName, handler: (payload: unknown) => void): void",
    description:
      "Removes a previously registered handler from an event. Requires the exact same function reference passed to on() — prefer the unsubscribe function on() returns unless you need to detach a named handler from elsewhere.",
    params: [
      {
        name: "event",
        type: "TrackerEventName",
        required: true,
        description: "The event the handler was registered on.",
      },
      {
        name: "handler",
        type: "(payload: unknown) => void",
        required: true,
        description: "The exact handler reference originally passed to on().",
      },
    ],
    returns: {
      type: "void",
      description:
        "No return value. Calling off() with a handler that isn't registered is a safe no-op.",
    },
    examples: [
      {
        language: "typescript",
        filename: "off.ts",
        code: `function handleQualityChanged(payload: unknown) {
  console.log("Quality changed:", payload);
}

tracker.on("qualityChanged", handleQualityChanged);

// ...later, from anywhere with a reference to the same function:
tracker.off("qualityChanged", handleQualityChanged);
`,
      },
    ],
    since: "2.0.0",
  },
  {
    id: "export-session",
    kind: "method",
    name: "exportSession()",
    signature: 'exportSession(sessionId: string, format: "json" | "csv" | "pdf"): Promise<Blob>',
    description:
      "Generates a downloadable export of a completed session's tracking data in the requested format. json includes the full frame-level movement timeline; csv flattens it into rows suitable for spreadsheets; pdf renders a human-readable summary report.",
    params: [
      {
        name: "sessionId",
        type: "string",
        required: true,
        description:
          "The id of a completed session, as returned by startSession() or stopSession().",
      },
      {
        name: "format",
        type: '"json" | "csv" | "pdf"',
        required: true,
        description: "The export format to generate.",
      },
    ],
    returns: {
      type: "Promise<Blob>",
      description:
        "Resolves with a Blob you can download via a generated object URL or upload elsewhere.",
    },
    throws: [
      {
        type: "SessionNotFoundError",
        description: "Thrown if no session with the given sessionId exists for this API key.",
      },
      {
        type: "UnsupportedFormatError",
        description: 'Thrown if format is not one of "json", "csv", or "pdf".',
      },
    ],
    examples: [
      {
        language: "typescript",
        filename: "export-session.ts",
        code: `const summary = await tracker.stopSession();
const blob = await tracker.exportSession(summary.id, "csv");

const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = \`session-\${summary.id}.csv\`;
link.click();
URL.revokeObjectURL(url);
`,
      },
    ],
    notes: [
      "pdf exports are generated server-side and take noticeably longer to resolve than json or csv.",
    ],
    since: "2.0.0",
  },
  {
    id: "destroy",
    kind: "method",
    name: "destroy()",
    signature: "destroy(): void",
    description:
      "Tears down the tracker: stops any active session without producing a summary, releases the camera stream, unloads the tracking model, and removes all event listeners. Transitions status to stopped.",
    params: [],
    returns: {
      type: "void",
      description: "No return value.",
    },
    examples: [
      {
        language: "typescript",
        filename: "destroy.ts",
        code: `tracker.destroy();
console.log(tracker.getStatus()); // "stopped"
`,
      },
    ],
    notes: [
      "A destroyed instance cannot be reused — construct a new BodyTracker if you need to track again.",
      "Always call destroy() when unmounting the component or page that owns the tracker to release the camera. @bodytracker/react's hooks do this for you automatically.",
    ],
    since: "1.0.0",
  },
];
