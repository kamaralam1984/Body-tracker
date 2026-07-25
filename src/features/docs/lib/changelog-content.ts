/**
 * Release history for `@bodytracker/sdk`, newest first. Dates are spaced
 * realistically working backward from the current release (v3.4.0, the
 * canonical "current version" referenced across the docs portal).
 */

import type { ChangelogEntry } from "../types";

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.4.0",
    date: "2026-07-14",
    changes: [
      {
        kind: "feature",
        description:
          "Added the qualityChanged event, emitted whenever tracking QualityLevel transitions between excellent, good, limited, searching, and offline.",
      },
      {
        kind: "feature",
        description:
          'Added sandbox environment support — set environment: "sandbox" in BodyTrackerConfig to pair with bt_test_ keys during local development and CI.',
      },
      {
        kind: "improvement",
        description:
          "getActivity() now reflects quality-aware confidence scoring, reducing false activityChanged transitions during brief tracking dropouts.",
      },
      {
        kind: "fix",
        description:
          "Fixed a race condition where calling resumeSession() immediately after pauseSession() could leave the tracker stuck in the paused state.",
      },
    ],
  },
  {
    version: "3.2.0",
    date: "2026-04-28",
    changes: [
      {
        kind: "feature",
        description:
          "Added getActivity(), returning a synchronous ActivitySnapshot without requiring a subscription to activityChanged.",
      },
      {
        kind: "improvement",
        description:
          "Reduced worker-thread startup latency during init(), shaving roughly 150ms off time-to-ready on mid-range devices.",
      },
      {
        kind: "fix",
        description:
          "Fixed exportSession() producing malformed CSV output for sessions containing non-ASCII locale strings.",
      },
    ],
  },
  {
    version: "3.0.0",
    date: "2026-02-24",
    changes: [
      {
        kind: "breaking",
        description:
          "Renamed the trackedActivities config field to activityTypes on BodyTrackerConfig. The old field name is no longer read.",
      },
      {
        kind: "breaking",
        description:
          "Split React hooks and components out of the core package into a new @bodytracker/react package. Install it separately if you use React.",
      },
      {
        kind: "improvement",
        description:
          "Reworked the internal pose-estimation pipeline for roughly 20% lower CPU usage during active tracking.",
      },
      {
        kind: "deprecation",
        description:
          "Deprecated the untyped ActivityType string literal fallback in favor of the exported ActivityType union — a future major version will make it required.",
      },
    ],
  },
  {
    version: "2.1.0",
    date: "2025-10-14",
    changes: [
      {
        kind: "feature",
        description:
          "Added the smoothing config ({ enabled, windowSize }) to reduce jitter in movement and activity readings.",
      },
      {
        kind: "improvement",
        description:
          'getStatus() now distinguishes "initializing" from "ready" instead of collapsing both into a single "loading" state.',
      },
      {
        kind: "fix",
        description:
          "Fixed trackingLost firing spuriously on some webcams during brief auto-focus adjustments.",
      },
    ],
  },
  {
    version: "2.0.0",
    date: "2025-08-04",
    changes: [
      {
        kind: "breaking",
        description:
          "Replaced the single onEvent callback prop with a proper on()/off() event API, supporting multiple listeners per event name and returning an unsubscribe function.",
      },
      {
        kind: "feature",
        description:
          "Added exportSession(sessionId, format), exporting a completed session as JSON, CSV, or PDF.",
      },
      {
        kind: "breaking",
        description:
          "TrackerEventName is now a closed string union; previously any string was accepted by onEvent without validation.",
      },
      {
        kind: "improvement",
        description:
          "Session summaries returned from stopSession() now include per-activity duration breakdowns.",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2025-03-12",
    changes: [
      {
        kind: "feature",
        description:
          "Added pauseSession() and resumeSession() for temporarily halting tracking mid-session without ending it.",
      },
      {
        kind: "improvement",
        description:
          "Session duration accounting now excludes paused time from the final SessionSummary.",
      },
      {
        kind: "fix",
        description:
          "Fixed the onEvent callback occasionally firing twice for a single trackingStarted transition.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2025-01-15",
    changes: [
      {
        kind: "feature",
        description:
          "Initial public release of @bodytracker/sdk, including the core BodyTracker class.",
      },
      {
        kind: "feature",
        description:
          "startSession() and stopSession() for managing the lifecycle of a tracking session.",
      },
      {
        kind: "feature",
        description:
          "getStatus() for reading the tracker's current lifecycle state, and an onEvent callback for lifecycle notifications.",
      },
      {
        kind: "improvement",
        description:
          "Published the initial API reference, getting-started guide, and authentication docs.",
      },
    ],
  },
];
