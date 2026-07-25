/**
 * Placeholder session library data — no backend exists yet. Deterministic
 * (seeded) generation so the dataset is stable across reloads, with the same
 * artificial-latency Promise convention used by every other mock service in
 * this app, so React Query genuinely exercises loading states.
 */

import type {
  ActivityType,
  QualityLevel,
  SessionCategory,
  SessionComment,
  SessionRecord,
  SessionStatus,
  SessionTimelineEvent,
} from "../types";

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seededRandom(seed) * items.length) % items.length];
}

const USERS = [
  "Sarah Chen",
  "Marcus Webb",
  "Priya Nair",
  "Diego Alvarez",
  "Elena Kowalski",
  "Jordan Rivera",
  "Alex Kim",
  "Nadia Hassan",
];
const ORGANIZATIONS = ["Performance Lab", "North Studio", "Remote Team", "Client Site A"];
const CAMERAS = ["Default camera", "Studio Cam 1", "Studio Cam 2", "Laptop webcam"];
const DEVICES = ["MacBook Pro", "iPad Pro", "Windows Desktop", "Chromebook"];
const QUALITIES: QualityLevel[] = [
  "excellent",
  "good",
  "good",
  "limited",
  "excellent",
  "searching",
];
const ACTIVITIES: ActivityType[] = ["standing", "walking", "running", "sitting", "idle"];
const STATUSES: SessionStatus[] = [
  "completed",
  "completed",
  "completed",
  "archived",
  "processing",
  "failed",
  "completed",
];
const STORAGE = ["us-east-1 / hot", "us-east-1 / cold", "eu-west-1 / hot"];
const TAG_POOL = ["baseline", "follow-up", "client-review", "research", "onboarding", "flagged"];
const MOVEMENT_SUMMARIES = [
  "Mostly stationary with a brief walk",
  "Consistent standing posture throughout",
  "Active session with frequent movement",
  "Primarily seated, minimal motion",
  "Short burst of running mid-session",
];

const NAME_TEMPLATES = [
  "Morning mobility check",
  "Weekly baseline",
  "Client onboarding",
  "Posture assessment",
  "Follow-up session",
  "Standing desk trial",
  "Recovery check-in",
  "Team demo run",
];

const TOTAL_SESSIONS = 84;

function buildTimeline(
  seed: number,
  durationSeconds: number,
  status: SessionStatus,
): SessionTimelineEvent[] {
  const events: SessionTimelineEvent[] = [
    { id: `${seed}-1`, type: "session-started", offsetSeconds: 0, label: "Session started" },
    { id: `${seed}-2`, type: "tracking-started", offsetSeconds: 3, label: "Tracking started" },
  ];
  if (seededRandom(seed + 1) > 0.6) {
    const lostAt = Math.round(durationSeconds * 0.3);
    events.push({
      id: `${seed}-3`,
      type: "tracking-lost",
      offsetSeconds: lostAt,
      label: "Tracking lost",
      description: "Subject left the frame",
    });
    events.push({
      id: `${seed}-4`,
      type: "tracking-restored",
      offsetSeconds: lostAt + 8,
      label: "Tracking restored",
    });
  }
  if (seededRandom(seed + 2) > 0.75) {
    const pausedAt = Math.round(durationSeconds * 0.55);
    events.push({
      id: `${seed}-5`,
      type: "paused",
      offsetSeconds: pausedAt,
      label: "Session paused",
    });
    events.push({
      id: `${seed}-6`,
      type: "resumed",
      offsetSeconds: pausedAt + 20,
      label: "Session resumed",
    });
  }
  if (status === "completed" || status === "archived") {
    events.push({
      id: `${seed}-7`,
      type: "session-ended",
      offsetSeconds: durationSeconds,
      label: "Session ended",
    });
    if (seededRandom(seed + 3) > 0.7) {
      events.push({
        id: `${seed}-8`,
        type: "exported",
        offsetSeconds: durationSeconds + 30,
        label: "Exported as PDF report",
      });
    }
    if (seededRandom(seed + 4) > 0.85) {
      events.push({
        id: `${seed}-9`,
        type: "shared",
        offsetSeconds: durationSeconds + 60,
        label: "Shared with team",
      });
    }
  }
  return events;
}

const SESSIONS: SessionRecord[] = Array.from({ length: TOTAL_SESSIONS }, (_, i) => {
  const seed = i * 13 + 7;
  const daysAgo = Math.floor(i / 3);
  const start = new Date(Date.now() - daysAgo * 86_400_000 - (i % 24) * 3_600_000);
  const durationSeconds = 300 + Math.floor(seededRandom(seed) * 3300);
  const isLive = i === 0;
  const status: SessionStatus = isLive ? "live" : pick(STATUSES, seed + 10);
  const end = status === "live" ? null : new Date(start.getTime() + durationSeconds * 1000);
  const starred = seededRandom(seed + 5) > 0.82;

  const categories: SessionCategory[] = [];
  if (status === "live") categories.push("live");
  if (status === "archived") categories.push("archived");
  if (status !== "archived" && status !== "live") categories.push("recorded");
  if (starred) categories.push("starred");
  if (daysAgo <= 2) categories.push("recent");
  if (seededRandom(seed + 6) > 0.88) categories.push("shared");
  if (status === "processing" || status === "uploading") categories.push("draft");

  const tagCount = Math.floor(seededRandom(seed + 7) * 3);
  const tags = Array.from(
    new Set(Array.from({ length: tagCount }, (_, t) => pick(TAG_POOL, seed + 8 + t))),
  );

  return {
    id: `SESSION-${2000 + i}`,
    name: `${pick(NAME_TEMPLATES, seed + 9)} #${i + 1}`,
    user: { name: pick(USERS, seed + 11) },
    organization: pick(ORGANIZATIONS, seed + 12),
    camera: pick(CAMERAS, seed + 13),
    device: pick(DEVICES, seed + 14),
    startTime: start.toISOString(),
    endTime: end ? end.toISOString() : null,
    durationSeconds,
    quality: isLive ? "good" : pick(QUALITIES, seed + 15),
    activity: pick(ACTIVITIES, seed + 16),
    movementSummary: pick(MOVEMENT_SUMMARIES, seed + 17),
    status,
    categories,
    createdAt: start.toISOString(),
    updatedAt: (end ?? new Date()).toISOString(),
    fileSizeMb: Math.round((durationSeconds / 60) * 4.2 * 10) / 10,
    storageLocation: pick(STORAGE, seed + 18),
    tags,
    starred,
    notes: "",
  } satisfies SessionRecord;
});

const TIMELINES = new Map<string, SessionTimelineEvent[]>(
  SESSIONS.map((s, i) => [s.id, buildTimeline(i * 13 + 7, s.durationSeconds, s.status)]),
);

const COMMENTS = new Map<string, SessionComment[]>(
  SESSIONS.filter((_, i) => i % 7 === 0).map((s, idx) => [
    s.id,
    [
      {
        id: `${s.id}-c1`,
        author: { name: pick(USERS, idx + 1) },
        body: "Quality looked great throughout — good one to use as a reference session.",
        createdAt: s.updatedAt,
      },
    ],
  ]),
);

export function fetchSessions(): Promise<SessionRecord[]> {
  return delay(SESSIONS, 550);
}

export function fetchSessionById(id: string): Promise<SessionRecord | null> {
  return delay(SESSIONS.find((s) => s.id === id) ?? null, 350);
}

export function fetchSessionTimeline(id: string): Promise<SessionTimelineEvent[]> {
  return delay(TIMELINES.get(id) ?? [], 350);
}

export function fetchSessionComments(id: string): Promise<SessionComment[]> {
  return delay(COMMENTS.get(id) ?? [], 300);
}

export function computeSessionStats(sessions: SessionRecord[]): {
  total: number;
  live: number;
  recorded: number;
  archived: number;
  starred: number;
  totalDurationMinutes: number;
} {
  return {
    total: sessions.length,
    live: sessions.filter((s) => s.status === "live").length,
    recorded: sessions.filter((s) => s.categories.includes("recorded")).length,
    archived: sessions.filter((s) => s.status === "archived").length,
    starred: sessions.filter((s) => s.starred).length,
    totalDurationMinutes: Math.round(sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60),
  };
}
