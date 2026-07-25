/**
 * FAQ content — grouped by `FaqCategory`. Rendered by `src/app/docs/faq/page.tsx`
 * as a searchable accordion, one section per category.
 */

import type { FaqEntry } from "../types";

export const FAQ_ENTRIES: FaqEntry[] = [
  // Installation
  {
    id: "installation-package-manager",
    category: "installation",
    question: "Which package manager should I use?",
    answer:
      "Any of them — npm, yarn, pnpm, or bun all work identically since the core package has zero runtime dependencies. Run <code>npm install @bodytracker/sdk</code> (or the equivalent add command for your tool of choice) and you're done. If you're using React, install <code>@bodytracker/react</code> alongside it.",
  },
  {
    id: "installation-cdn",
    category: "installation",
    question: "Does this work with a CDN-only setup, no build step?",
    answer:
      'Yes. Import it as an ES module directly from a CDN, for example <code>import { BodyTracker } from "https://unpkg.com/@bodytracker/sdk@3.4.0/dist/index.js"</code> inside a <code>&lt;script type="module"&gt;</code> tag. This is the same package that npm installs — no bundler, transpiler, or build step required.',
  },
  {
    id: "installation-react-separate-package",
    category: "installation",
    question: "Do I need to install @bodytracker/react separately?",
    answer:
      "Yes, as of v3.0.0. React hooks and components used to ship inside the core package, but they were split out into their own <code>@bodytracker/react</code> package so non-React consumers aren't shipping React-aware code they'll never use. If you're on React, install both packages.",
  },
  {
    id: "installation-node-version",
    category: "installation",
    question: "What's the minimum Node.js version for the build tooling?",
    answer:
      "Node.js 18 or later for your build tooling (bundler, type checker, test runner). The SDK itself runs entirely in the browser at runtime — Node's version only matters for whatever compiles and bundles your app.",
  },
  // Authentication
  {
    id: "authentication-get-api-key",
    category: "authentication",
    question: "Where do I get an API key?",
    answer:
      "Generate one from the account dashboard under API Keys. New accounts get a sandbox key (<code>bt_test_...</code>) immediately; production keys (<code>bt_live_...</code>) require a verified project.",
  },
  {
    id: "authentication-no-backend",
    category: "authentication",
    question: "Can I use the SDK without a backend?",
    answer:
      "For prototyping and sandbox use, yes — a <code>bt_test_</code> key works fine directly in client-side code. For production, we recommend proxying the initial handshake through your own backend so your <code>bt_live_</code> key never ships in a public bundle; hand the browser a short-lived scoped token instead.",
  },
  {
    id: "authentication-live-vs-test-keys",
    category: "authentication",
    question: "What's the difference between bt_live_ and bt_test_ keys?",
    answer:
      '<code>bt_live_</code> keys talk to the production environment, track real sessions, and count against your plan\'s usage. <code>bt_test_</code> keys are scoped to the sandbox environment — safe for local development and CI, and sessions created with them are never billed or persisted long-term. Set <code>environment: "sandbox"</code> in <code>BodyTrackerConfig</code> when using a test key.',
  },
  {
    id: "authentication-key-scope",
    category: "authentication",
    question: "Can one API key be used across multiple environments?",
    answer:
      'No — a key\'s environment is fixed at creation. Pairing a <code>bt_test_</code> key with <code>environment: "production"</code> (or vice versa) causes <code>init()</code> to reject with an authentication error. Generate a separate key per environment.',
  },
  // Permissions
  {
    id: "permissions-why-camera",
    category: "permissions",
    question: "Why does the browser ask for camera access?",
    answer:
      "Body Tracker performs on-device pose and movement estimation from the camera feed — no video is ever uploaded, only derived activity data. The browser's native camera permission prompt appears the first time <code>init()</code> or <code>startSession()</code> requests the media stream.",
  },
  {
    id: "permissions-denied",
    category: "permissions",
    question: "What happens if the user denies camera permission?",
    answer:
      '<code>init()</code> rejects with an error and <code>getStatus()</code> reports <code>"error"</code>. The tracker never retries automatically — catch the rejection and show your own UI prompting the user to grant access via their browser\'s site settings, then let them retry.',
  },
  {
    id: "permissions-request-before-init",
    category: "permissions",
    question: "Can I request permission before calling init()?",
    answer:
      "Yes — call <code>navigator.mediaDevices.getUserMedia({ video: true })</code> yourself ahead of time to trigger the browser prompt on your own terms (e.g. behind an explanatory onboarding screen), then close that stream before calling <code>init()</code>. The SDK will reuse the now-granted permission without prompting again.",
  },
  {
    id: "permissions-camera-switch",
    category: "permissions",
    question: "Can I switch cameras mid-session?",
    answer:
      "Not on an active session — the <code>cameraDeviceId</code> config field is read once at <code>init()</code> time. To switch devices, call <code>stopSession()</code>, <code>destroy()</code> the tracker instance, and construct a new one with the desired <code>cameraDeviceId</code>.",
  },
  // Performance
  {
    id: "performance-impact",
    category: "performance",
    question: "Does tracking impact page performance?",
    answer:
      "Pose estimation runs on a dedicated worker thread, so it doesn't block your main thread or UI rendering. Expect a modest, steady CPU footprint while a session is active (comparable to a video call) and effectively none while idle or paused.",
  },
  {
    id: "performance-smoothing",
    category: "performance",
    question: "What does the smoothing config actually do?",
    answer:
      "<code>smoothing: { enabled, windowSize }</code> applies a moving average over the raw frame-by-frame movement signal before it's exposed via events and <code>getActivity()</code>. A larger <code>windowSize</code> trades a bit of latency for noticeably steadier readings — useful if your UI is jittery with smoothing off.",
  },
  {
    id: "performance-bandwidth-cpu",
    category: "performance",
    question: "How much bandwidth/CPU does this use?",
    answer:
      "Video is processed entirely on-device and never uploaded, so bandwidth use is minimal — only small JSON payloads (activity snapshots, session summaries) go over the network. CPU usage scales with camera resolution and frame rate, and drops to near zero once you call <code>pauseSession()</code>.",
  },
  {
    id: "performance-narrow-activity-types",
    category: "performance",
    question: "Is there a recommended activityTypes list for lower overhead?",
    answer:
      'Yes — restricting <code>activityTypes</code> in <code>BodyTrackerConfig</code> to only the activities your app cares about (e.g. just <code>["walking", "running"]</code>) skips the classification work for everything else, which measurably reduces per-frame CPU cost versus tracking all activity types.',
  },
  // Troubleshooting
  {
    id: "troubleshooting-init-never-resolves",
    category: "troubleshooting",
    question: "init() never resolves — what's wrong?",
    answer:
      "The most common cause is a pending or ignored camera permission prompt — check whether the browser is silently waiting on user input (some browsers suppress the prompt UI if it's not triggered from a user gesture). Also verify your API key's environment matches the <code>environment</code> config field, since a mismatch causes a rejection rather than a hang in most cases, but can appear to stall behind a slow network handshake.",
  },
  {
    id: "troubleshooting-no-movement-events",
    category: "troubleshooting",
    question: "I'm not receiving movementChanged events",
    answer:
      'Confirm a session is actually active — events only fire between <code>startSession()</code> and <code>stopSession()</code>/<code>pauseSession()</code>. Also double check you passed the handler to <code>on("movementChanged", handler)</code> (not the legacy <code>onEvent</code> prop, which was removed in v2.0.0) and that you\'re not accidentally unsubscribing via the returned cleanup function right after subscribing.',
  },
  {
    id: "troubleshooting-typescript-types",
    category: "troubleshooting",
    question: "TypeScript can't find the module types",
    answer:
      'Both <code>@bodytracker/sdk</code> and <code>@bodytracker/react</code> ship their own <code>.d.ts</code> files — no <code>@types</code> package needed. If TypeScript still can\'t resolve them, confirm your <code>moduleResolution</code> is set to <code>"bundler"</code> or <code>"node16"</code>/<code>"nodenext"</code> in <code>tsconfig.json</code>, and that you\'re on a version that actually includes the package (reinstalling after a lockfile mismatch usually fixes stale type resolution).',
  },
  {
    id: "troubleshooting-getstatus-error",
    category: "troubleshooting",
    question: "getStatus() returns 'error' — how do I debug it?",
    answer:
      'Subscribe to the <code>"error"</code> event via <code>on("error", handler)</code> before calling <code>init()</code> — the payload includes the underlying cause (permission denial, environment/key mismatch, unsupported browser, or a lost camera device). <code>getStatus()</code> alone only tells you tracking failed, not why.',
  },
  {
    id: "troubleshooting-export-session-not-found",
    category: "troubleshooting",
    question: "exportSession() rejects with a 'session not found' error",
    answer:
      "<code>exportSession(sessionId, format)</code> looks up a completed session by the ID returned from <code>stopSession()</code>'s <code>SessionSummary</code>, not the live <code>Session</code> object from <code>startSession()</code>. Make sure you're passing the summary's ID, and that the session actually finished (an in-progress session isn't exportable yet).",
  },
  // Browser support
  {
    id: "browser-support-which-browsers",
    category: "browser-support",
    question: "Which browsers are supported?",
    answer:
      "The latest two versions of Chrome, Edge, Firefox, and Safari on desktop, plus their mobile equivalents where the platform allows camera access from a web page. All of them need WebRTC's <code>getUserMedia</code> and a WebAssembly runtime, which every supported browser ships today.",
  },
  {
    id: "browser-support-mobile-safari",
    category: "browser-support",
    question: "Does this work on mobile Safari?",
    answer:
      "Yes, with one caveat: iOS Safari requires camera access to be initiated from a direct user gesture (a tap), so call <code>init()</code> or <code>startSession()</code> from inside a click handler rather than automatically on page load, or the permission prompt won't appear.",
  },
  {
    id: "browser-support-fallback",
    category: "browser-support",
    question: "Is there a fallback for unsupported browsers?",
    answer:
      "The SDK doesn't degrade tracking on unsupported browsers — <code>init()</code> rejects immediately with a clear \"unsupported\" error instead of attempting a broken session. We recommend feature-detecting with a quick capability check and showing a fallback UI (e.g. manual entry) for the small slice of browsers that don't qualify.",
  },
  {
    id: "browser-support-iframe",
    category: "browser-support",
    question: "Does the SDK work inside an iframe?",
    answer:
      'Yes, as long as the iframe has the <code>camera</code> Permissions Policy explicitly allowed by its parent (<code>&lt;iframe allow="camera"&gt;</code>) and is served over HTTPS. Third-party iframes without that allowance will see camera access silently blocked by the browser, independent of anything the SDK does.',
  },
];
