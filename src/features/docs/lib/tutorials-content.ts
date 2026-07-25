/**
 * Long-form, step-by-step tutorials for the `/docs/tutorials` page — one
 * entry per `TutorialLevel`, each with several `TutorialSection`s of real
 * prose and (where useful) a runnable code sample.
 */

import type { TutorialDoc } from "../types";

export const TUTORIALS: TutorialDoc[] = [
  {
    id: "your-first-tracking-app",
    level: "beginner",
    title: "Your First Tracking App",
    description:
      "Install the SDK, initialize a tracker, start a session, and read live activity data — the shortest path from zero to a working integration.",
    durationMinutes: 15,
    sections: [
      {
        heading: "What you'll build",
        body: "By the end of this tutorial you'll have a small script that opens the camera, starts a tracking session, prints the detected activity to the console every time it changes, and stops cleanly. It's deliberately minimal — no framework, no UI — so you can see exactly what the SDK does without anything else in the way.",
      },
      {
        heading: "Install the SDK",
        body: "Add @bodytracker/sdk to your project with your package manager of choice. The core package has zero runtime dependencies, so this is the only install step you need for a plain JavaScript or TypeScript project.",
        code: {
          language: "bash",
          label: "npm",
          code: "npm install @bodytracker/sdk",
        },
      },
      {
        heading: "Create and initialize a tracker",
        body: "Every integration starts the same way: construct a BodyTracker with your API key, then call init(). init() is asynchronous because it requests camera permission from the browser and loads the tracking model — both can take a moment, and both can fail, so always await it.",
        code: {
          language: "typescript",
          filename: "app.ts",
          code: `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({
  apiKey: "bt_test_3Lw8p...redacted",
  environment: "sandbox",
});

await tracker.init();
console.log(tracker.getStatus()); // "ready"
`,
        },
      },
      {
        heading: "Start a session and read activity",
        body: "A session is a continuous tracking window — start one with startSession(), optionally telling the SDK what activity to expect and giving it a human-readable label. Once tracking is underway, getActivity() returns a snapshot of the current activity type and tracking quality at any point.",
        code: {
          language: "typescript",
          filename: "app.ts",
          code: `const session = await tracker.startSession({
  activity: "walking",
  label: "First test walk",
});

const snapshot = tracker.getActivity();
console.log(\`Detected: \${snapshot.activity} (quality: \${snapshot.quality})\`);
`,
        },
      },
      {
        heading: "Stop the session and clean up",
        body: "When you're done, stopSession() ends the current session and resolves with a summary (duration, detected activity, and more). Always call destroy() once you're finished with the tracker entirely — it releases the camera stream and removes internal listeners, and skipping it is a common source of the camera staying \"on\" after your app stops using it.",
        code: {
          language: "typescript",
          filename: "app.ts",
          code: `const summary = await tracker.stopSession();
console.log(\`Session lasted \${summary.durationSeconds}s\`);

tracker.destroy();
`,
        },
      },
    ],
  },
  {
    id: "building-a-session-dashboard",
    level: "intermediate",
    title: "Building a Session Dashboard",
    description:
      "Combine useSession(), useAnalytics(), and raw event listeners into a small live dashboard that shows the current session state plus rolling stats.",
    durationMinutes: 25,
    sections: [
      {
        heading: "What you'll build",
        body: "A dashboard component that shows whether a session is currently recording, live activity updates as they happen, and summary analytics (total sessions, total minutes, most frequent activity) — the kind of view you'd put on a coach's or clinician's screen while a client trains.",
      },
      {
        heading: "Start with session state",
        body: "useSession() from @bodytracker/react gives you the current session object, an isRecording flag, and the startSession/stopSession functions — everything needed to render a record/stop control without touching the underlying BodyTracker instance directly.",
        code: {
          language: "tsx",
          filename: "Dashboard.tsx",
          code: `import { useSession } from "@bodytracker/react";

export function Dashboard() {
  const { session, startSession, stopSession, isRecording } = useSession();

  return (
    <section>
      <h2>{isRecording ? "Recording…" : "Idle"}</h2>
      {session && <p>Session: {session.label ?? session.id}</p>}
      <button onClick={() => (isRecording ? stopSession() : startSession({ activity: "walking" }))}>
        {isRecording ? "Stop" : "Start"}
      </button>
    </section>
  );
}
`,
        },
      },
      {
        heading: "Layer in live events",
        body: "Session state alone doesn't tell you what's happening moment to moment. useEvents(event, handler) subscribes to a single named SDK event for the lifetime of the component and automatically unsubscribes on unmount, which is exactly what you want for a dashboard that reacts to movementChanged and activityChanged without you managing on()/off() by hand.",
        code: {
          language: "tsx",
          filename: "Dashboard.tsx",
          code: `import { useState } from "react";
import { useEvents } from "@bodytracker/react";

function ActivityFeed() {
  const [log, setLog] = useState<string[]>([]);

  useEvents("activityChanged", (payload) => {
    setLog((prev) => [\`Activity changed: \${JSON.stringify(payload)}\`, ...prev].slice(0, 20));
  });

  return (
    <ul>
      {log.map((entry, i) => (
        <li key={i}>{entry}</li>
      ))}
    </ul>
  );
}
`,
        },
      },
      {
        heading: "Add rolling analytics",
        body: "useAnalytics() aggregates data across sessions rather than within one — total sessions recorded, total minutes tracked, the most frequent activity type, and average tracking quality. Drop it in alongside the session controls for an at-a-glance summary that updates as new sessions complete.",
        code: {
          language: "tsx",
          filename: "Dashboard.tsx",
          code: `import { useAnalytics } from "@bodytracker/react";

function AnalyticsSummary() {
  const { totalSessions, totalMinutes, mostFrequentActivity, averageQuality } = useAnalytics();

  return (
    <dl>
      <dt>Sessions</dt>
      <dd>{totalSessions}</dd>
      <dt>Minutes</dt>
      <dd>{totalMinutes}</dd>
      <dt>Top activity</dt>
      <dd>{mostFrequentActivity ?? "—"}</dd>
      <dt>Avg. quality</dt>
      <dd>{averageQuality ?? "—"}</dd>
    </dl>
  );
}
`,
        },
      },
      {
        heading: "Compose the dashboard",
        body: "Put the three pieces together under a single parent — since all three hooks read from the same underlying tracker context, they stay in sync automatically: starting a session in the controls immediately reflects in isRecording, and stopping one eventually rolls into the analytics totals with no manual wiring between components.",
      },
    ],
  },
  {
    id: "custom-activity-pipelines",
    level: "advanced",
    title: "Custom Activity Pipelines",
    description:
      "Tune smoothing for your use case, surface live tracking-quality feedback to users, and handle trackingLost/trackingRestored gracefully instead of letting a flaky signal look like a bug.",
    durationMinutes: 35,
    sections: [
      {
        heading: "Why smoothing matters",
        body: 'Raw per-frame activity classification is noisy — a person standing still for a moment mid-walk can register as a brief "standing" blip. The smoothing config option runs detected activity through a rolling window before it\'s reported, trading a small amount of latency for a much more stable signal. windowSize controls how many frames that window covers; higher values are smoother but slower to reflect real activity changes.',
        code: {
          language: "typescript",
          filename: "pipeline.ts",
          code: `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({
  apiKey: "bt_live_7QxNm...redacted",
  smoothing: { enabled: true, windowSize: 8 },
});

await tracker.init();
`,
        },
      },
      {
        heading: "Surface tracking quality",
        body: 'Tracking quality — excellent, good, limited, searching, or offline — reflects how confident the SDK is in what it\'s seeing, driven by things like lighting, framing, and occlusion. Rather than letting users guess why detection feels unreliable, listen for qualityChanged and show it directly, so a "limited" reading becomes an actionable prompt ("move into better light") instead of a silent failure.',
        code: {
          language: "typescript",
          filename: "pipeline.ts",
          code: `tracker.on("qualityChanged", (payload) => {
  const quality = (payload as { quality: string }).quality;
  if (quality === "limited" || quality === "searching") {
    showHint("Move into better lighting and stay fully in frame.");
  } else {
    hideHint();
  }
});
`,
        },
      },
      {
        heading: "Handle lost and restored tracking",
        body: "trackingLost fires when the SDK can no longer confidently track the subject (they've stepped out of frame, the camera was covered, and so on) — trackingRestored fires when tracking resumes. Treat these as expected, recoverable states rather than errors: pause any UI that assumes continuous data, and resume it cleanly when tracking comes back, without ending the underlying session.",
        code: {
          language: "typescript",
          filename: "pipeline.ts",
          code: `tracker.on("trackingLost", () => {
  setTrackingPaused(true);
});

tracker.on("trackingRestored", () => {
  setTrackingPaused(false);
});
`,
        },
      },
      {
        heading: "Distinguish quality issues from hard errors",
        body: 'The error event is reserved for genuine failures — camera disconnected, permission revoked mid-session, model failed to load — not for a temporarily low-quality signal. Keep your error handler focused on things that require the user (or your app) to take corrective action, and let qualityChanged/trackingLost handle the rest; conflating the two tends to produce alarming error UI for what\'s really just "the lighting is bad right now."',
        code: {
          language: "typescript",
          filename: "pipeline.ts",
          code: `tracker.on("error", (payload) => {
  const err = payload as { message: string };
  console.error("Unrecoverable tracker error:", err.message);
  showFatalErrorBanner(err.message);
});
`,
        },
      },
      {
        heading: "Putting it together",
        body: "A robust pipeline configures smoothing up front, shows live quality feedback so users can self-correct their framing or lighting, treats lost/restored tracking as a normal pause/resume cycle, and reserves hard error UI for genuine failures. Together these four pieces turn a noisy camera signal into something a real product can build reliable UX on top of.",
      },
    ],
  },
  {
    id: "enterprise-integration-patterns",
    level: "enterprise",
    title: "Enterprise Integration Patterns",
    description:
      "Manage API keys per tenant through a backend proxy instead of shipping raw keys to the client, and add rate-limit-aware retry logic for high-volume usage.",
    durationMinutes: 30,
    sections: [
      {
        heading: "Don't ship long-lived keys to every tenant's client",
        body: "In a multi-tenant product, embedding one shared API key in client bundles means every tenant can see (and potentially abuse) it, and revoking access for one tenant means rotating a key for everyone. Instead, mint short-lived, scoped credentials server-side per tenant/session and hand only those to the browser.",
      },
      {
        heading: "Proxy key issuance through your backend",
        body: "Have your backend hold the real API key and expose an authenticated endpoint that returns a tenant-scoped key (or a signed short-lived token, depending on what your BodyTracker account plan supports) for the current user. The client never sees the underlying long-lived key — only ever the narrow, revocable credential your backend issued for that session.",
        code: {
          language: "typescript",
          filename: "getScopedKey.ts",
          code: `async function getScopedApiKey(tenantId: string): Promise<string> {
  const res = await fetch("/api/bodytracker/issue-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId }),
  });
  if (!res.ok) throw new Error("Failed to issue tracker key");
  const { apiKey } = await res.json();
  return apiKey as string;
}
`,
        },
      },
      {
        heading: "Initialize per tenant",
        body: "Fetch the scoped key before constructing the tracker for that tenant's session, and treat it as short-lived — request a fresh one for each new session rather than caching it indefinitely on the client.",
        code: {
          language: "typescript",
          filename: "initForTenant.ts",
          code: `import { BodyTracker } from "@bodytracker/sdk";

async function initTrackerForTenant(tenantId: string) {
  const apiKey = await getScopedApiKey(tenantId);
  const tracker = new BodyTracker({ apiKey, environment: "production" });
  await tracker.init();
  return tracker;
}
`,
        },
      },
      {
        heading: "Add rate-limit-aware retries",
        body: "At enterprise volume, calls like exportSession can occasionally hit rate limits. Wrap them in a retry helper that backs off exponentially and gives up after a fixed number of attempts, rather than retrying immediately in a tight loop (which just makes rate limiting worse) or failing on the first hiccup.",
        code: {
          language: "typescript",
          filename: "retry.ts",
          code: `async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts) throw err;
      const backoffMs = 2 ** attempt * 250;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

// Usage:
const blob = await withRetry(() => tracker.exportSession(session.id, "json"));
`,
        },
      },
      {
        heading: "Isolate tenants at teardown too",
        body: "When a tenant's session in your app ends (they log out, switch orgs, close the panel), call destroy() on their tracker instance and discard the scoped key. Never reuse a BodyTracker instance across tenants — always construct a fresh one with a freshly issued key, so a bug can't leak one tenant's session or key material into another's.",
      },
    ],
  },
  {
    id: "production-deployment-checklist",
    level: "production",
    title: "Production Deployment Checklist",
    description:
      "The environment config, error boundaries, monitoring, and camera-permission UX worth double-checking before you ship a BodyTracker integration to real users.",
    durationMinutes: 20,
    sections: [
      {
        heading: "Set environment explicitly",
        body: 'Always pass environment explicitly rather than relying on a default — "sandbox" for staging/preview deployments and "production" for the real thing. Wiring this to a build-time environment variable means a misconfigured deploy fails loudly instead of quietly hitting the wrong backend.',
        code: {
          language: "typescript",
          filename: "tracker-config.ts",
          code: `const tracker = new BodyTracker({
  apiKey: process.env.NEXT_PUBLIC_BODYTRACKER_KEY!,
  environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});
`,
        },
      },
      {
        heading: "Wrap initialization in an error boundary",
        body: "init() can reject for reasons entirely outside your control — camera permission denied, no camera present, device already in use by another app. Wrap the component that owns your tracker in a React error boundary (or an equivalent try/catch at the call site) so a failed initialization degrades to a clear message instead of crashing the page.",
        code: {
          language: "tsx",
          filename: "TrackerBoundary.tsx",
          code: `"use client";

import { useEffect, useState } from "react";
import { BodyTracker } from "@bodytracker/sdk";

export function TrackerBoundary({ apiKey }: { apiKey: string }) {
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const tracker = new BodyTracker({ apiKey });
    tracker.init().catch((err) => setInitError(err.message ?? "Failed to start tracker"));
    return () => tracker.destroy();
  }, [apiKey]);

  if (initError) {
    return <p role="alert">Couldn&apos;t start tracking: {initError}</p>;
  }
  return null;
}
`,
        },
      },
      {
        heading: "Monitor the error event in production",
        body: "Beyond the initial init() call, the error event can fire any time during a live session. Forward these to your monitoring/logging pipeline (Sentry, Datadog, or your own backend) so you have visibility into real-world tracking failures instead of only hearing about them from support tickets.",
        code: {
          language: "typescript",
          filename: "monitoring.ts",
          code: `tracker.on("error", (payload) => {
  const err = payload as { message: string; code?: string };
  reportToMonitoring("bodytracker_error", { message: err.message, code: err.code });
});
`,
        },
      },
      {
        heading: "Design camera-permission UX up front",
        body: "Browsers only show the permission prompt once per origin (until the user resets it), and a denial means every future init() call will reject until they manually re-enable it in browser settings. Explain why you need the camera before triggering init() — a short piece of UI copy shown ahead of the native prompt measurably improves grant rates — and provide clear recovery instructions for users who've already denied it.",
      },
      {
        heading: "Final checklist",
        body: "Before shipping: environment is set from a build-time variable, not hardcoded; init() failures are caught and shown to the user, not left to crash; the error event is wired to your monitoring stack; camera permission has explanatory UI before the prompt and recovery guidance after a denial; and every tracker instance you construct has a matching destroy() call on unmount or teardown.",
      },
    ],
  },
  {
    id: "sdk-best-practices",
    level: "best-practices",
    title: "SDK Best Practices",
    description:
      "Small habits that prevent the most common BodyTracker bugs: always destroy() on unmount, debounce noisy movementChanged handlers, and don't leak listeners you never removed.",
    durationMinutes: 15,
    sections: [
      {
        heading: "Always destroy() on unmount",
        body: "A BodyTracker instance holds an open camera stream and internal listeners for as long as it's alive. If a component that owns one unmounts without calling destroy(), the camera can stay active in the background — a real privacy and battery problem, not just a memory leak. In React, the fix is always the same: construct and destroy() inside the same useEffect.",
        code: {
          language: "tsx",
          filename: "useTrackerLifecycle.tsx",
          code: `useEffect(() => {
  const tracker = new BodyTracker({ apiKey });
  tracker.init();

  return () => {
    tracker.destroy(); // runs on unmount and on every dependency change
  };
}, [apiKey]);
`,
        },
      },
      {
        heading: "Debounce high-frequency events",
        body: "movementChanged can fire many times per second during active tracking. If your handler triggers a re-render, a network call, or anything non-trivial, debounce or throttle it — otherwise you'll churn through renders or requests far faster than any UI actually needs to update.",
        code: {
          language: "typescript",
          filename: "debounce.ts",
          code: `function debounce<T extends (...args: unknown[]) => void>(fn: T, waitMs: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), waitMs);
  };
}

const handleMovement = debounce((payload: unknown) => {
  updateMovementUi(payload);
}, 150);

tracker.on("movementChanged", handleMovement);
`,
        },
      },
      {
        heading: "Never leave listeners unremoved",
        body: "Every call to on() returns an unsubscribe function — keep it, and call it when the listener is no longer needed (component unmount, feature toggled off, tracker about to be destroyed). Registering listeners inside a loop, a re-render, or an effect without a cleanup function is the most common way integrations end up with duplicate handlers firing multiple times per event.",
        code: {
          language: "typescript",
          filename: "listeners.ts",
          code: `const unsubscribe = tracker.on("activityChanged", handleActivityChanged);

// later, when you no longer need it:
unsubscribe();

// equivalent, if you kept a reference to the handler instead:
tracker.off("activityChanged", handleActivityChanged);
`,
        },
      },
      {
        heading: "One tracker instance per concern",
        body: "Resist the temptation to share a single BodyTracker across unrelated parts of your app (e.g. a global singleton used by both a live coaching view and a background analytics widget) — their lifecycles rarely match, and destroying it for one consumer breaks the other. Prefer one instance per logical feature, each with its own clear init/destroy lifecycle.",
      },
    ],
  },
];
