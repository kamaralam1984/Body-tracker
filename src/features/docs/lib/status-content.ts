/**
 * Static status-page content. This is illustrative, not a live feed — see
 * the note rendered on `src/app/docs/status/page.tsx`. The overall banner on
 * that page is computed from `STATUS_COMPONENTS` rather than hardcoded, so
 * changing a status here changes the banner automatically.
 */

import type { StatusComponentDoc } from "../types";

export const STATUS_COMPONENTS: StatusComponentDoc[] = [
  {
    name: "Tracking API",
    status: "operational",
    description: "Session lifecycle, event delivery, and real-time activity classification.",
  },
  {
    name: "Session Storage",
    status: "operational",
    description: "Persistence for session summaries and exportable session records.",
  },
  {
    name: "Analytics Pipeline",
    status: "degraded",
    description: "Elevated latency in the EU region, actively investigating.",
  },
  {
    name: "Dashboard",
    status: "operational",
    description: "Account dashboard, API key management, and usage reporting.",
  },
  {
    name: "Documentation Site",
    status: "operational",
    description: "This documentation portal, including search and versioned guides.",
  },
  {
    name: "Webhook Delivery",
    status: "operational",
    description: "Outbound webhook delivery for session and account events.",
  },
];

/** A single resolved incident shown in the status page's "Recent history" timeline. */
export interface StatusIncident {
  title: string;
  date: string;
  description: string;
}

export const RECENT_INCIDENTS: StatusIncident[] = [
  {
    title: "Elevated API error rates — resolved",
    date: "2026-07-02",
    description:
      "A backend deployment introduced a regression causing intermittent 500 responses from the Tracking API for roughly 40 minutes. Rolled back and root-caused to a misconfigured connection pool limit.",
  },
  {
    title: "Delayed webhook delivery — resolved",
    date: "2026-05-21",
    description:
      "Webhook delivery lagged by up to 15 minutes during a queue backlog following a traffic spike. Delivery caught up automatically once autoscaling kicked in; no events were lost.",
  },
  {
    title: "Dashboard login errors — resolved",
    date: "2026-03-30",
    description:
      "A session-token validation bug briefly caused login failures for a subset of dashboard users. Fixed and deployed within 25 minutes of detection.",
  },
  {
    title: "Session Storage degraded performance — resolved",
    date: "2026-02-11",
    description:
      "Read latency on session summary lookups increased during scheduled database maintenance. Performance returned to baseline once the maintenance window completed.",
  },
  {
    title: "Documentation search unavailable — resolved",
    date: "2025-12-18",
    description:
      "The docs portal's search index failed to rebuild after a content deploy, temporarily disabling search. Reverted to the previous index and shipped a fix for the rebuild step.",
  },
];
