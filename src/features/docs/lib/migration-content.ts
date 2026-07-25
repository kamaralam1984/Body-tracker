/**
 * Step-by-step guides for crossing the two breaking-change boundaries in the
 * SDK's version history: the v2.0.0 event-API rewrite and the v3.0.0
 * activityTypes rename + React-bindings package split.
 */

import type { MigrationGuideDoc } from "../types";

export const MIGRATION_GUIDES: MigrationGuideDoc[] = [
  {
    fromVersion: "1.x",
    toVersion: "2.0",
    breakingChanges: [
      "The onEvent callback field on BodyTrackerConfig has been removed.",
      "Event handling now goes through on(event, handler) / off(event, handler), which support multiple listeners per event and return an unsubscribe function.",
      "TrackerEventName is now a closed string union — unrecognized event names are rejected instead of silently no-op'd.",
    ],
    steps: [
      {
        title: "Remove onEvent from your config",
        description:
          "In v1.x, BodyTrackerConfig accepted a single onEvent callback that received every lifecycle event through one function, and you switched on the payload yourself to figure out what happened. That field no longer exists in v2.0.0 — passing it is simply ignored, so upgrading without migrating means you silently stop receiving events. Construct the tracker without it, then attach listeners separately with on().",
        code: {
          language: "typescript",
          filename: "tracker.ts",
          code: `import { BodyTracker } from "@bodytracker/sdk";

const tracker = new BodyTracker({
  apiKey: "bt_live_9Fk2q...redacted",
});

const unsubscribeStarted = tracker.on("trackingStarted", () => {
  console.log("Tracking started");
});

const unsubscribeMovement = tracker.on("movementChanged", (payload) => {
  console.log("Movement changed", payload);
});
`,
          highlightLines: [7, 8, 9, 11, 12, 13],
        },
      },
      {
        title: "Subscribe to each event you previously handled in the onEvent switch",
        description:
          "Rather than one dispatcher function, attach a handler per event name you actually care about. Each event now carries its own specific payload shape instead of a shared discriminated union, so downstream handler code gets simpler and better typed.",
        code: {
          language: "typescript",
          filename: "listeners.ts",
          code: `tracker.on("trackingStarted", () => setIsTracking(true));
tracker.on("trackingStopped", () => setIsTracking(false));
tracker.on("error", (payload) => reportError(payload));
`,
          highlightLines: [1, 2, 3],
        },
      },
      {
        title: "Unsubscribe using the function on() returns, or off()",
        description:
          "on() returns an unsubscribe function — call it in cleanup (e.g. a React effect's cleanup, or before destroying the tracker) instead of leaking listeners. You can also unsubscribe explicitly with off(event, handler) if you kept a reference to the original handler.",
        code: {
          language: "typescript",
          filename: "cleanup.ts",
          code: `useEffect(() => {
  const unsubscribe = tracker.on("movementChanged", handleMovementChange);
  return () => unsubscribe();
}, [tracker]);
`,
          highlightLines: [2, 3],
        },
      },
    ],
  },
  {
    fromVersion: "2.x",
    toVersion: "3.0",
    breakingChanges: [
      "BodyTrackerConfig's trackedActivities field has been renamed to activityTypes.",
      "React hooks (useTracking, useSession, useCamera, useActivity, useEvents, useAnalytics) have moved out of @bodytracker/sdk into a new @bodytracker/react package.",
      "Importing React bindings from @bodytracker/sdk will fail to resolve after upgrading — install @bodytracker/react and update your import paths.",
    ],
    steps: [
      {
        title: "Rename trackedActivities to activityTypes",
        description:
          "The config field was renamed for clarity — the value shape is unchanged, still an array of ActivityType strings. Search your codebase for trackedActivities and rename it wherever BodyTrackerConfig is constructed.",
        code: {
          language: "typescript",
          filename: "tracker.ts",
          code: `const tracker = new BodyTracker({
  apiKey: "bt_live_9Fk2q...redacted",
  activityTypes: ["standing", "walking", "running"],
});
`,
          highlightLines: [3],
        },
      },
      {
        title: "Install @bodytracker/react",
        description:
          "React hooks and components no longer ship inside the core package. Add the new package alongside @bodytracker/sdk before touching any imports, or your build will start failing the moment you update the SDK version.",
        code: {
          language: "bash",
          code: "npm install @bodytracker/react",
        },
      },
      {
        title: "Update your React imports to the new package",
        description:
          "Keep BodyTracker and other core exports imported from @bodytracker/sdk, but move every hook import — useTracking, useSession, useCamera, useActivity, useEvents, useAnalytics — over to @bodytracker/react.",
        code: {
          language: "tsx",
          filename: "TrackingPanel.tsx",
          code: `import { BodyTracker } from "@bodytracker/sdk";
import { useTracking, useSession } from "@bodytracker/react";

function TrackingPanel() {
  const { status } = useTracking();
  const { session } = useSession();
  return <div>{status}</div>;
}
`,
          highlightLines: [1, 2],
        },
      },
    ],
  },
];
