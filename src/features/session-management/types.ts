/**
 * Public contract for the session management feature — a library/browser of
 * past and live tracking sessions (Dropbox/Loom-style), distinct from
 * `@/features/session-analytics` (live single-session control center) and
 * `@/features/reporting` (aggregate historical analytics). Reuses their
 * shared vocabulary (ActivityType, QualityLevel) rather than redefining it.
 */

import type { ActivityType, QualityLevel } from "@/features/session-analytics";

export type { ActivityType, QualityLevel };

export type SessionStatus =
  | "live"
  | "recording"
  | "paused"
  | "completed"
  | "archived"
  | "processing"
  | "uploading"
  | "failed"
  | "deleted";

/** Which collection(s) a session shows up in — independent of its lifecycle `status`. */
export type SessionCategory =
  "recorded" | "archived" | "draft" | "shared" | "starred" | "recent" | "live";

export type SessionTimelineEventType =
  | "session-started"
  | "tracking-started"
  | "tracking-lost"
  | "tracking-restored"
  | "paused"
  | "resumed"
  | "session-ended"
  | "exported"
  | "shared";

export interface SessionTimelineEvent {
  id: string;
  type: SessionTimelineEventType;
  /** Seconds from session start — drives both the history list and the playback scrubber's markers. */
  offsetSeconds: number;
  label: string;
  description?: string;
}

export interface SessionUser {
  name: string;
  avatarSrc?: string;
}

export interface SessionRecord {
  id: string;
  name: string;
  user: SessionUser;
  organization: string;
  camera: string;
  device: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  quality: QualityLevel;
  activity: ActivityType;
  movementSummary: string;
  status: SessionStatus;
  categories: SessionCategory[];
  createdAt: string;
  updatedAt: string;
  fileSizeMb: number;
  storageLocation: string;
  tags: string[];
  starred: boolean;
  notes: string;
}

export interface SessionComment {
  id: string;
  author: SessionUser;
  body: string;
  createdAt: string;
}

export interface SessionFilters {
  search: string;
  status: SessionStatus | "all";
  quality: QualityLevel | "all";
  activity: ActivityType | "all";
  datePreset: "today" | "yesterday" | "7d" | "30d" | "all";
}

export const DEFAULT_SESSION_FILTERS: SessionFilters = {
  search: "",
  status: "all",
  quality: "all",
  activity: "all",
  datePreset: "all",
};

export type SessionSortField =
  "newest" | "oldest" | "duration" | "name" | "status" | "quality" | "user";

export interface SessionStats {
  total: number;
  live: number;
  recorded: number;
  archived: number;
  starred: number;
  totalDurationMinutes: number;
}

export type SessionViewMode = "grid" | "table";

export type SessionTabValue = "all" | "live" | "recorded" | "archived" | "starred" | "recent";
