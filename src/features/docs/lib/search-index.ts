import { DOCS_NAV } from "./docs-nav";
import type { SearchIndexEntry } from "../types";

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/docs": "What @kvl/sdk is, what it wraps, and where to start.",
  "/docs/getting-started": "Requirements, quick start, and your first tracking session.",
  "/docs/installation": "Install via npm, yarn, pnpm, bun, or the CDN build.",
  "/docs/authentication": "API keys, user sessions, OAuth2, and automatic token refresh.",
  "/docs/sdk-reference":
    "KvlClient construction, configuration, resource namespaces, errors, and retry behavior.",
  "/docs/api-reference": "Every method on the KvlClient class, fully documented.",
  "/docs/hooks": "React hooks for auth, data-fetching, real-time, and file uploads.",
  "/docs/events": "Every event the client emits, with payload shapes and examples.",
  "/docs/examples": "Copy-paste integration examples across frameworks.",
  "/docs/tutorials": "Guided walkthroughs from beginner to production deployment.",
  "/docs/playground": "Configure the SDK interactively and see the generated code.",
  "/docs/faq": "Answers to the most common installation, auth, and performance questions.",
  "/docs/changelog": "Every SDK release, what changed, and why.",
  "/docs/migration-guide": "Upgrading between major versions without breaking your integration.",
  "/docs/status": "Live status of the SDK, API, and release infrastructure.",
};

/** Static page-level search entries built from the nav tree — every entry in `DOCS_NAV` gets one, so this index can never drift out of sync with the sidebar. */
export function buildSearchIndex(): SearchIndexEntry[] {
  return DOCS_NAV.flatMap((section) =>
    section.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: PAGE_DESCRIPTIONS[item.href] ?? "",
      section: section.title,
      url: item.href,
      keywords: [section.title, item.title],
    })),
  );
}

function score(entry: SearchIndexEntry, query: string): number {
  const q = query.toLowerCase();
  const title = entry.title.toLowerCase();
  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  if (entry.description.toLowerCase().includes(q)) return 30;
  if (entry.keywords.some((k) => k.toLowerCase().includes(q))) return 20;
  return 0;
}

/** Simple relevance-scored substring search — no fuzzy-edit-distance matching, but genuinely ranked (title-prefix beats description-mention), not just a filter. */
export function searchDocs(query: string, index: SearchIndexEntry[]): SearchIndexEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return index
    .map((entry) => ({ entry, s: score(entry, trimmed) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ entry }) => entry);
}
