/**
 * Structured reference content for `@bodytracker/react`'s hooks — one
 * `HookDoc` per hook. Every hook wraps a shared `BodyTracker` instance
 * provided further up the tree (typically via a `<BodyTrackerProvider>`),
 * so components can read tracker state reactively instead of polling the
 * imperative methods documented in the SDK Reference / API Reference pages.
 *
 * Rendered by `src/app/docs/hooks/page.tsx` via `<HookCard doc={...} />`.
 */

import type { HookDoc } from "../types";

export const SDK_HOOKS: HookDoc[] = [
  {
    id: "use-tracking",
    name: "useTracking()",
    signature: "function useTracking(): UseTrackingResult",
    description:
      "The primitive hook for driving the tracker's lifecycle from a component: exposes the current status, start/stop callbacks that wrap init() and startSession()/stopSession(), and any error thrown along the way. Most other hooks build on the same underlying tracker instance this hook reads from.",
    params: [],
    returns: {
      type: "UseTrackingResult",
      description: "An object with the tracker's status plus imperative start and stop callbacks.",
      fields: [
        {
          name: "status",
          type: "TrackerStatus",
          required: true,
          description:
            "The tracker's current lifecycle status, re-rendering the component on every change.",
        },
        {
          name: "start",
          type: "() => Promise<void>",
          required: true,
          description:
            "Initializes the tracker (if needed) and starts a session with default options.",
        },
        {
          name: "stop",
          type: "() => Promise<void>",
          required: true,
          description: "Stops the active session.",
        },
        {
          name: "error",
          type: "Error | null",
          required: true,
          description:
            "The most recent error thrown by start() or stop(), or null if there wasn't one.",
        },
      ],
    },
    example: {
      language: "tsx",
      filename: "TrackingButton.tsx",
      code: `import { useTracking } from "@bodytracker/react";

export function TrackingButton() {
  const { status, start, stop, error } = useTracking();

  return (
    <div>
      <button
        onClick={status === "tracking" ? stop : start}
        disabled={status === "initializing"}
      >
        {status === "tracking" ? "Stop tracking" : "Start tracking"}
      </button>
      {error && <p role="alert">{error.message}</p>}
    </div>
  );
}
`,
    },
    since: "1.0.0",
  },
  {
    id: "use-session",
    name: "useSession()",
    signature: "function useSession(): UseSessionResult",
    description:
      "Reads the currently active tracking session, if any, and exposes callbacks to start and stop one with full StartSessionOptions control (activity type, label) — a more configurable alternative to useTracking()'s bare start()/stop().",
    params: [],
    returns: {
      type: "UseSessionResult",
      description: "The active session (or null), session controls, and a recording flag.",
      fields: [
        {
          name: "session",
          type: "Session | null",
          required: true,
          description: "The current session, or null if none is active.",
        },
        {
          name: "startSession",
          type: "(options?: StartSessionOptions) => Promise<Session>",
          required: true,
          description: "Starts a new session with the given activity and label.",
        },
        {
          name: "stopSession",
          type: "() => Promise<SessionSummary>",
          required: true,
          description: "Stops the active session and resolves with its summary.",
        },
        {
          name: "isRecording",
          type: "boolean",
          required: true,
          description: 'true when session.status === "recording".',
        },
      ],
    },
    example: {
      language: "tsx",
      filename: "SessionRecorder.tsx",
      code: `import { useSession } from "@bodytracker/react";

export function SessionRecorder() {
  const { session, startSession, stopSession, isRecording } = useSession();

  return (
    <div>
      <button
        onClick={() =>
          isRecording ? stopSession() : startSession({ activity: "walking", label: "Evening walk" })
        }
      >
        {isRecording ? "End session" : "Start session"}
      </button>
      {session && <p>Session {session.id} — {session.status}</p>}
    </div>
  );
}
`,
    },
    since: "1.0.0",
  },
  {
    id: "use-camera",
    name: "useCamera()",
    signature: "function useCamera(): UseCameraResult",
    description:
      "Exposes the raw camera stream backing the tracker along with the list of available video input devices, so you can render a live preview or build a device picker without touching getUserMedia directly.",
    params: [],
    returns: {
      type: "UseCameraResult",
      description: "The active MediaStream, available devices, and controls for selecting one.",
      fields: [
        {
          name: "stream",
          type: "MediaStream | null",
          required: true,
          description: "The tracker's active camera stream, or null before init() resolves.",
        },
        {
          name: "devices",
          type: "MediaDeviceInfo[]",
          required: true,
          description: "All video input devices available to the browser.",
        },
        {
          name: "selectedDeviceId",
          type: "string | null",
          required: true,
          description:
            "The deviceId currently in use, matching BodyTrackerConfig.cameraDeviceId if one was set.",
        },
        {
          name: "selectDevice",
          type: "(deviceId: string) => void",
          required: true,
          description: "Switches the active camera to the given device id.",
        },
        {
          name: "permission",
          type: '"granted" | "denied" | "prompt"',
          required: true,
          description: "The current camera permission state reported by the browser.",
        },
      ],
    },
    example: {
      language: "tsx",
      filename: "CameraPreview.tsx",
      code: `import { useRef, useEffect } from "react";
import { useCamera } from "@bodytracker/react";

export function CameraPreview() {
  const { stream, devices, selectedDeviceId, selectDevice, permission } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  if (permission === "denied") return <p>Camera access is required to track movement.</p>;

  return (
    <div>
      <video ref={videoRef} autoPlay muted playsInline />
      <select value={selectedDeviceId ?? ""} onChange={(e) => selectDevice(e.target.value)}>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || "Camera"}
          </option>
        ))}
      </select>
    </div>
  );
}
`,
    },
    since: "1.2.0",
  },
  {
    id: "use-activity",
    name: "useActivity()",
    signature: "function useActivity(): UseActivityResult",
    description:
      "Subscribes to activityChanged and qualityChanged internally and exposes the current activity, current tracking quality, and a rolling history of recent activity snapshots — the reactive counterpart to calling getActivity() imperatively.",
    params: [],
    returns: {
      type: "UseActivityResult",
      description: "The current activity, its quality, and a short history of recent snapshots.",
      fields: [
        {
          name: "currentActivity",
          type: "ActivityType",
          required: true,
          description: "The most recently detected activity.",
        },
        {
          name: "quality",
          type: "QualityLevel",
          required: true,
          description: "The current tracking quality for the active camera view.",
        },
        {
          name: "history",
          type: "ActivitySnapshot[]",
          required: true,
          description:
            "The most recent activity snapshots, oldest first, capped to a fixed rolling window.",
        },
      ],
    },
    example: {
      language: "tsx",
      filename: "ActivityBadge.tsx",
      code: `import { useActivity } from "@bodytracker/react";

export function ActivityBadge() {
  const { currentActivity, quality, history } = useActivity();

  return (
    <div>
      <span>{currentActivity}</span>
      <span data-quality={quality}>{quality}</span>
      <small>{history.length} recent samples</small>
    </div>
  );
}
`,
    },
    since: "1.2.0",
  },
  {
    id: "use-events",
    name: "useEvents()",
    signature:
      "function useEvents<T = unknown>(event: TrackerEventName, handler: (payload: T) => void): void",
    description:
      "Subscribes handler to a tracker event for the lifetime of the component, calling tracker.on() on mount and the returned unsubscribe function automatically on unmount or whenever event/handler change. Use this instead of calling tracker.on()/off() directly inside useEffect.",
    params: [
      {
        name: "event",
        type: "TrackerEventName",
        required: true,
        description: "The event name to subscribe to.",
      },
      {
        name: "handler",
        type: "(payload: T) => void",
        required: true,
        description:
          "Called with the event's payload. Pass a type parameter to useEvents<T> to type it precisely.",
      },
    ],
    returns: {
      type: "void",
      description: "This hook has no return value — its effect is the subscription itself.",
    },
    example: {
      language: "tsx",
      filename: "MovementLogger.tsx",
      code: `import { useState } from "react";
import { useEvents } from "@bodytracker/react";

interface ActivityChangedPayload {
  from: string;
  to: string;
  timestamp: string;
}

export function MovementLogger() {
  const [log, setLog] = useState<string[]>([]);

  useEvents<ActivityChangedPayload>("activityChanged", (payload) => {
    setLog((prev) => [...prev, \`\${payload.from} -> \${payload.to}\`]);
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
    since: "2.0.0",
  },
  {
    id: "use-analytics",
    name: "useAnalytics()",
    signature: "function useAnalytics(): UseAnalyticsResult",
    description:
      "Aggregates historical session data for the current API key into summary analytics — total sessions, total tracked minutes, the most frequent activity, and an overall average quality — useful for dashboards and progress views.",
    params: [],
    returns: {
      type: "UseAnalyticsResult",
      description: "Aggregate stats computed from all sessions recorded under the current API key.",
      fields: [
        {
          name: "totalSessions",
          type: "number",
          required: true,
          description: "The total number of completed sessions.",
        },
        {
          name: "totalMinutes",
          type: "number",
          required: true,
          description: "The sum of every completed session's duration, in minutes.",
        },
        {
          name: "mostFrequentActivity",
          type: "ActivityType | null",
          required: true,
          description:
            "The activity recorded most often, or null if no sessions have completed yet.",
        },
        {
          name: "averageQuality",
          type: "QualityLevel",
          required: true,
          description: "The average tracking quality across all completed sessions.",
        },
      ],
    },
    example: {
      language: "tsx",
      filename: "AnalyticsSummary.tsx",
      code: `import { useAnalytics } from "@bodytracker/react";

export function AnalyticsSummary() {
  const { totalSessions, totalMinutes, mostFrequentActivity, averageQuality } = useAnalytics();

  return (
    <dl>
      <dt>Sessions</dt>
      <dd>{totalSessions}</dd>
      <dt>Total time tracked</dt>
      <dd>{totalMinutes} min</dd>
      <dt>Most frequent activity</dt>
      <dd>{mostFrequentActivity ?? "—"}</dd>
      <dt>Average quality</dt>
      <dd>{averageQuality}</dd>
    </dl>
  );
}
`,
    },
    since: "3.0.0",
  },
];
