/**
 * Public contract for the docs feature — a hand-authored developer portal
 * documenting the fictional `@bodytracker/sdk` (and its React bindings,
 * `@bodytracker/react`). The SDK's own vocabulary deliberately mirrors this
 * app's real features (camera, tracking, sessions, activity, quality) for
 * authenticity, but this feature has zero runtime dependency on any other
 * feature — it's pure documentation content + reusable doc components.
 */

import type { LucideIcon } from "lucide-react";

export interface DocNavItem {
  id: string;
  title: string;
  href: string;
  badge?: "new" | "beta" | "deprecated";
}

export interface DocNavSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: DocNavItem[];
}

export interface SearchIndexEntry {
  id: string;
  title: string;
  description: string;
  section: string;
  url: string;
  keywords: string[];
}

export type CodeLanguage =
  "bash" | "javascript" | "typescript" | "tsx" | "jsx" | "json" | "python" | "http";

export interface CodeExample {
  language: CodeLanguage;
  label?: string;
  filename?: string;
  code: string;
  highlightLines?: number[];
}

export interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export type HttpMethodOrKind = "constructor" | "method" | "property" | "static";

export interface ApiMethodDoc {
  id: string;
  kind: HttpMethodOrKind;
  name: string;
  signature: string;
  description: string;
  params: ApiParam[];
  returns: { type: string; description: string };
  throws?: { type: string; description: string }[];
  examples: CodeExample[];
  notes?: string[];
  since: string;
}

export interface HookDoc {
  id: string;
  name: string;
  signature: string;
  description: string;
  params: ApiParam[];
  returns: { type: string; description: string; fields?: ApiParam[] };
  example: CodeExample;
  since: string;
}

export type EventCategory = "lifecycle" | "tracking" | "session" | "error";

export interface EventDoc {
  id: string;
  name: string;
  category: EventCategory;
  payloadType: string;
  payloadFields: ApiParam[];
  description: string;
  example: CodeExample;
}

export type ChangeKind = "feature" | "fix" | "breaking" | "improvement" | "deprecation";

export interface ChangelogChange {
  kind: ChangeKind;
  description: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: ChangelogChange[];
}

export type FaqCategory =
  | "installation"
  | "authentication"
  | "permissions"
  | "performance"
  | "troubleshooting"
  | "browser-support";

export interface FaqEntry {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export type TutorialLevel =
  "beginner" | "intermediate" | "advanced" | "enterprise" | "production" | "best-practices";

export interface TutorialSection {
  heading: string;
  body: string;
  code?: CodeExample;
}

export interface TutorialDoc {
  id: string;
  level: TutorialLevel;
  title: string;
  description: string;
  durationMinutes: number;
  sections: TutorialSection[];
}

export type ExampleFramework =
  "javascript" | "typescript" | "react" | "nextjs" | "vue" | "angular" | "node" | "python";

export interface ExampleDoc {
  id: string;
  title: string;
  description: string;
  framework: ExampleFramework;
  tags: string[];
  code: CodeExample;
}

export interface MigrationStepDoc {
  title: string;
  description: string;
  code?: CodeExample;
}

export interface MigrationGuideDoc {
  fromVersion: string;
  toVersion: string;
  breakingChanges: string[];
  steps: MigrationStepDoc[];
}

export type StatusLevel = "operational" | "degraded" | "outage" | "maintenance";

export interface StatusComponentDoc {
  name: string;
  status: StatusLevel;
  description: string;
}

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export interface TocHeading {
  id: string;
  text: string;
  depth: 2 | 3;
}
