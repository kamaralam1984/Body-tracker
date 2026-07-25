/**
 * Structured reference content for every `TrackerEventName` the SDK emits.
 * Subscribe with `tracker.on(event, handler)` (returns an unsubscribe
 * function) or, in React, `useEvents(event, handler)`. Grouped by
 * `category` — lifecycle, tracking, session, error — and rendered by
 * `src/app/docs/events/page.tsx`.
 */

import type { EventDoc } from "../types";

export const SDK_EVENTS: EventDoc[] = [
  {
    id: "ready",
    name: "ready",
    category: "lifecycle",
    payloadType: "ReadyEventPayload",
    payloadFields: [
      {
        name: "timestamp",
        type: "string",
        required: true,
        description: "ISO 8601 timestamp of when the tracker finished initializing.",
      },
    ],
    description:
      "Fires once, after init() completes successfully and the tracker's status becomes ready. Equivalent to awaiting init(), but useful when init() is called somewhere you don't control, e.g. inside a provider.",
    example: {
      language: "typescript",
      filename: "ready.ts",
      code: `tracker.on("ready", ({ timestamp }) => {
  console.log(\`Tracker ready at \${timestamp}\`);
});

await tracker.init();
`,
    },
  },
  {
    id: "tracking-started",
    name: "trackingStarted",
    category: "tracking",
    payloadType: "TrackingStartedEventPayload",
    payloadFields: [
      {
        name: "sessionId",
        type: "string",
        required: true,
        description: "The id of the session that began tracking.",
      },
      {
        name: "activity",
        type: "ActivityType",
        required: true,
        description: "The activity the session started under.",
      },
    ],
    description:
      "Fires when frame-by-frame movement tracking actually begins for a session — after startSession() resolves and the first camera frame has been processed. Distinct from sessionStarted, which fires immediately when the session is created.",
    example: {
      language: "typescript",
      filename: "tracking-started.ts",
      code: `tracker.on("trackingStarted", ({ sessionId, activity }) => {
  console.log(\`Tracking \${activity} for session \${sessionId}\`);
});
`,
    },
  },
  {
    id: "tracking-stopped",
    name: "trackingStopped",
    category: "tracking",
    payloadType: "TrackingStoppedEventPayload",
    payloadFields: [
      {
        name: "sessionId",
        type: "string",
        required: true,
        description: "The id of the session that stopped tracking.",
      },
      {
        name: "reason",
        type: '"stopped" | "paused" | "lost"',
        required: true,
        description: "Why tracking stopped for this session.",
      },
    ],
    description:
      "Fires whenever the tracker stops processing camera frames for the active session — including pauseSession(), stopSession(), and the tracker losing the subject unexpectedly.",
    example: {
      language: "typescript",
      filename: "tracking-stopped.ts",
      code: `tracker.on("trackingStopped", ({ sessionId, reason }) => {
  console.log(\`Session \${sessionId} stopped tracking: \${reason}\`);
});
`,
    },
  },
  {
    id: "tracking-lost",
    name: "trackingLost",
    category: "tracking",
    payloadType: "TrackingLostEventPayload",
    payloadFields: [
      {
        name: "reason",
        type: "string",
        required: true,
        description: 'A short machine-readable reason, e.g. "subject_out_of_frame" or "low_light".',
      },
      {
        name: "since",
        type: "string",
        required: true,
        description: "ISO 8601 timestamp of when tracking was lost.",
      },
    ],
    description:
      "Fires mid-session when the tracker can no longer confidently detect the subject — poor lighting, the subject leaving the frame, or camera obstruction. The session stays active; tracking resumes automatically once conditions improve, firing trackingRestored.",
    example: {
      language: "typescript",
      filename: "tracking-lost.ts",
      code: `tracker.on("trackingLost", ({ reason, since }) => {
  showBanner(\`Lost tracking (\${reason}) at \${since}\`);
});
`,
    },
  },
  {
    id: "tracking-restored",
    name: "trackingRestored",
    category: "tracking",
    payloadType: "TrackingRestoredEventPayload",
    payloadFields: [
      {
        name: "timestamp",
        type: "string",
        required: true,
        description: "ISO 8601 timestamp of when tracking resumed.",
      },
      {
        name: "downtimeMs",
        type: "number",
        required: true,
        description: "How long tracking was lost for, in milliseconds.",
      },
    ],
    description:
      "Fires after a trackingLost event once the tracker successfully re-detects the subject and resumes producing movement data for the active session.",
    example: {
      language: "typescript",
      filename: "tracking-restored.ts",
      code: `tracker.on("trackingRestored", ({ downtimeMs }) => {
  hideBanner();
  console.log(\`Tracking restored after \${downtimeMs}ms\`);
});
`,
    },
  },
  {
    id: "session-started",
    name: "sessionStarted",
    category: "session",
    payloadType: "Session",
    payloadFields: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "The unique id of the new session.",
      },
      {
        name: "startedAt",
        type: "string",
        required: true,
        description: "ISO 8601 timestamp of when the session was created.",
      },
      {
        name: "activity",
        type: "ActivityType",
        required: true,
        description: "The activity the session was started under.",
      },
      {
        name: "status",
        type: '"recording" | "paused"',
        required: true,
        description: 'The session\'s status — always "recording" at creation.',
      },
    ],
    description:
      "Fires immediately when startSession() creates a new session, with the same Session object startSession()'s promise resolves with. Useful for reacting to session creation from a listener registered elsewhere in the app, without awaiting the call yourself.",
    example: {
      language: "typescript",
      filename: "session-started.ts",
      code: `tracker.on("sessionStarted", (session) => {
  console.log("Session started:", session.id, session.activity);
});
`,
    },
  },
  {
    id: "session-ended",
    name: "sessionEnded",
    category: "session",
    payloadType: "SessionSummary",
    payloadFields: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "The id of the session that ended.",
      },
      {
        name: "durationSeconds",
        type: "number",
        required: true,
        description: "Total recorded duration, excluding paused time.",
      },
      {
        name: "activity",
        type: "ActivityType",
        required: true,
        description: "The session's primary activity.",
      },
      {
        name: "averageQuality",
        type: "QualityLevel",
        required: true,
        description: "The average tracking quality across the whole session.",
      },
    ],
    description:
      "Fires when stopSession() finalizes a session, with the same SessionSummary its promise resolves with. Good place to trigger persistence or analytics without threading the summary through the call site.",
    example: {
      language: "typescript",
      filename: "session-ended.ts",
      code: `tracker.on("sessionEnded", (summary) => {
  saveSessionToServer(summary);
});
`,
    },
  },
  {
    id: "movement-changed",
    name: "movementChanged",
    category: "tracking",
    payloadType: "MovementChangedEventPayload",
    payloadFields: [
      {
        name: "isMoving",
        type: "boolean",
        required: true,
        description: "Whether the subject is currently in motion.",
      },
      {
        name: "timestamp",
        type: "string",
        required: true,
        description: "ISO 8601 timestamp of the transition.",
      },
    ],
    description:
      'Fires whenever the subject transitions between moving and stationary, independent of which specific activity is detected. Fires far more frequently than activityChanged and is best suited to lightweight UI like a "live" indicator rather than analytics.',
    example: {
      language: "typescript",
      filename: "movement-changed.ts",
      code: `tracker.on("movementChanged", ({ isMoving }) => {
  liveIndicator.classList.toggle("active", isMoving);
});
`,
    },
  },
  {
    id: "activity-changed",
    name: "activityChanged",
    category: "tracking",
    payloadType: "ActivityChangedEventPayload",
    payloadFields: [
      {
        name: "from",
        type: "ActivityType",
        required: true,
        description: "The previously detected activity.",
      },
      {
        name: "to",
        type: "ActivityType",
        required: true,
        description: "The newly detected activity.",
      },
      {
        name: "timestamp",
        type: "string",
        required: true,
        description: "ISO 8601 timestamp of the transition.",
      },
    ],
    description:
      "Fires whenever the tracker's detected activity type changes for the active session, e.g. walking to running. The most commonly used tracking event for driving activity-aware UI.",
    example: {
      language: "typescript",
      filename: "activity-changed.ts",
      code: `tracker.on("activityChanged", ({ from, to, timestamp }) => {
  console.log(\`\${from} -> \${to} at \${timestamp}\`);
});
`,
    },
  },
  {
    id: "quality-changed",
    name: "qualityChanged",
    category: "tracking",
    payloadType: "QualityChangedEventPayload",
    payloadFields: [
      {
        name: "from",
        type: "QualityLevel",
        required: true,
        description: "The previous tracking quality.",
      },
      {
        name: "to",
        type: "QualityLevel",
        required: true,
        description: "The new tracking quality.",
      },
      {
        name: "timestamp",
        type: "string",
        required: true,
        description: "ISO 8601 timestamp of the transition.",
      },
    ],
    description:
      'Fires whenever the tracker\'s confidence in its own readings changes — driven by lighting, camera angle, and subject distance. Use it to prompt users to reposition when quality drops to "limited" or "searching".',
    example: {
      language: "typescript",
      filename: "quality-changed.ts",
      code: `tracker.on("qualityChanged", ({ to }) => {
  if (to === "limited" || to === "searching") {
    showRepositionHint();
  }
});
`,
    },
  },
  {
    id: "error",
    name: "error",
    category: "error",
    payloadType: "TrackerErrorEventPayload",
    payloadFields: [
      {
        name: "message",
        type: "string",
        required: true,
        description: "A human-readable description of what went wrong.",
      },
      {
        name: "code",
        type: "string",
        required: true,
        description: 'A stable machine-readable error code, e.g. "camera_disconnected".',
      },
      {
        name: "recoverable",
        type: "boolean",
        required: false,
        description: "Whether the tracker can recover on its own without calling init() again.",
      },
    ],
    description:
      "Fires whenever the tracker encounters a runtime error outside a specific method call's promise — e.g. the camera device is unplugged mid-session. Always keep an error listener attached in production; unhandled tracker errors otherwise fail silently.",
    example: {
      language: "typescript",
      filename: "error.ts",
      code: `tracker.on("error", ({ message, code, recoverable }) => {
  console.error(\`[\${code}] \${message}\`);
  if (!recoverable) {
    tracker.destroy();
  }
});
`,
    },
  },
];
