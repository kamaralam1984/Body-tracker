/**
 * Builds the "AI Analytics Report" PDF document model for the current live
 * camera session — reuses the same `PdfReportDocument` shape and
 * `generateReportPdf()` engine already proven elsewhere in the app
 * (`@/features/report-center/lib/pdf-engine.ts`), rather than building a
 * second PDF pipeline from scratch. Every value here comes straight from
 * `LiveTrackingStats` — nothing is computed fresh or estimated here beyond
 * what that type's own doc comments already disclose (e.g. calories is
 * already labeled a rough live preview upstream).
 */

import type { PdfReportDocument } from "@/features/report-center/lib/pdf-engine";
import type { LiveTrackingStats } from "../hooks/use-tracking-session-sync";

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function scoreOrDash(value: number | null): string {
  return value !== null ? String(Math.round(value)) : "—";
}

export function buildSessionReportDocument(
  live: LiveTrackingStats,
  generatedByName: string,
): PdfReportDocument {
  const generatedAtLabel = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return {
    title: "AI Analytics Report",
    subtitle: "Live camera session summary",
    templateLabel: "Camera Session",
    generatedByName,
    generatedAtLabel,
    orientation: "portrait",
    sections: [
      {
        heading: "Session overview",
        kpis: [
          { label: "Duration", value: formatDuration(live.elapsedSeconds) },
          { label: "Active time", value: formatDuration(live.activeSeconds) },
          { label: "Idle time", value: formatDuration(live.idleSeconds) },
          { label: "Attention (avg)", value: scoreOrDash(live.attentionAvg) },
          {
            label: "Attention (high/low)",
            value: `${scoreOrDash(live.attentionHigh)} / ${scoreOrDash(live.attentionLow)}`,
          },
          { label: "Posture (live)", value: scoreOrDash(live.postureScoreLive) },
          { label: "Fatigue (live)", value: scoreOrDash(live.fatigueScoreLive) },
          {
            label: "Calories (rough estimate)",
            value: `~${Math.round(live.caloriesEstimateLive)}`,
          },
        ],
      },
      {
        heading: "Face analytics",
        paragraphs: !live.faceDetected
          ? ["No face was detected in the most recent frame at export time."]
          : undefined,
        kpis: [
          { label: "Blink count", value: String(live.blinkCountTotal) },
          {
            label: "Smile score",
            value: live.smileScore !== null ? `${Math.round(live.smileScore)}%` : "—",
          },
          {
            label: "Eye contact",
            value: live.eyeContact === null ? "—" : live.eyeContact ? "Yes" : "No",
          },
          { label: "Looking away", value: live.lookingAway ? "Yes" : "No" },
          {
            label: "Face size",
            value:
              live.faceSizePercent !== null ? `${Math.round(live.faceSizePercent)}% of frame` : "—",
          },
          {
            label: "Multiple people seen",
            value: live.faceCount > 1 ? `Yes (${live.faceCount})` : "No",
          },
        ],
      },
      {
        heading: "Hand & gesture analytics",
        paragraphs:
          live.gestureCountTotal === 0 && !live.handVisible.left && !live.handVisible.right
            ? ["Hand tracking wasn't turned on, or no hand was visible, during this session."]
            : undefined,
        kpis: [
          { label: "Gesture count", value: String(live.gestureCountTotal) },
          { label: "Current gesture", value: live.currentGesture ?? "None" },
          {
            label: "Left hand visible",
            value: live.handVisible.left ? "Yes" : "No",
          },
          {
            label: "Right hand visible",
            value: live.handVisible.right ? "Yes" : "No",
          },
        ],
      },
      {
        heading: "Movement & pose",
        paragraphs:
          live.currentMovementState === null
            ? ["Pose tracking wasn't turned on during this session."]
            : undefined,
        kpis: [
          { label: "Movement state", value: live.currentMovementState ?? "—" },
          { label: "Exercise sets", value: String(live.exerciseSetCountTotal) },
          { label: "Current set reps", value: String(live.currentSetReps) },
          {
            label: "Balance (sway-based estimate)",
            value: live.poseBalanceScore !== null ? `${live.poseBalanceScore}%` : "—",
          },
        ],
      },
      {
        heading: "Activity timeline",
        paragraphs:
          live.timeline.length === 0
            ? ["No timeline events were recorded this session."]
            : undefined,
        tables:
          live.timeline.length > 0
            ? [
                {
                  headers: ["Time", "Event"],
                  rows: live.timeline
                    .slice()
                    .reverse()
                    .map((entry) => [
                      new Date(entry.time).toLocaleTimeString("en-US"),
                      entry.label,
                    ]),
                },
              ]
            : undefined,
      },
    ],
  };
}
