# Camera Studio Upgrade — Phase-by-Phase Roadmap

Is file me woh sab kaam list hai jo user ne 15-section spec me maanga tha (camera controls, AI model controls, live stats, face/hand/pose analytics, timeline, alerts, session summary, recording, developer mode, visualization modes, AI insights, export, premium UI). Har item ka status yahan update hota rahega jaise-jaise kaam poora hota jaye.

**Status legend:** `[ ]` pending · `[x]` done · `[skip]` jaanbhoojkar nahi kar rahe (wajah likhi hai)

---

## Phase 1 — Live camera-page panels ✅ DONE

- [x] Live Session Summary card — `session-summary-card.tsx`
- [x] Live Timeline — `live-timeline.tsx`
- [x] Smart Alerts (no face / eyes closed / poor posture / camera disconnected) — `tracking-alerts.tsx`
- [x] Live Face analytics — `face-analytics-card.tsx`
- [x] Live Hand analytics — `hand-analytics-card.tsx`
- [x] Live Pose analytics — `pose-analytics-card.tsx`

## Phase 2 — Camera hardware, export, live insights ✅ DONE

- [x] Brightness/contrast/saturation are now REAL (CSS `filter` on the preview `<video>`, `camera-preview.tsx`) — removed the 4th fake "noise reduction" slider (no honest equivalent exists)
- [x] Zoom / Torch / Auto-exposure / Auto-focus — real `track.getCapabilities()`/`applyConstraints()`, each control only appears if the active device actually reports support — `camera-advanced-controls.tsx`
- [x] Camera flip (front/back) — `camera-flip-button.tsx`, `facingMode` constraint
- [x] Video recording (local `.webm` download, never uploaded) + optional microphone — `use-session-recording.ts`, `recording-export-panel.tsx`
- [x] JSON/CSV export of session summary + timeline, capped opt-in raw-landmark sample log — same panel
- [x] Shared `src/lib/download-file.ts` (deduped 3 of the 4 places that reimplemented blob-download)
- [x] Live AI Insights panel — same rule-based algorithm as the server's `analytics-service.ts`, reimplemented client-side over this session's live scores — `build-live-insights.ts`, `live-insights-panel.tsx`

## Phase 3 — Visualization modes, Developer Mode, multi-person ✅ DONE (scoped, see notes)

- [x] Visualization modes: Camera only, Skeleton (default), Wireframe, Landmark IDs, Bounding boxes, Confidence overlay — `render-modes.ts`, switcher in `render-mode-selector.tsx`. "Transparent" = Camera-only (same thing); "Heatmap" = folded into Confidence overlay (only pose has real per-point confidence to color by — face/hand don't, documented in code).
- [x] Developer Mode panel (off by default) — FPS graph, real processing-time/frame, raw coordinates, bounding boxes, recent-events log — `developer-mode-panel.tsx`
- [x] Honest system stats — processing time, detection FPS, CPU core count, JS heap memory (Chrome-only) — same panel. **No fabricated CPU%/GPU%** — no browser API provides that; showing one would mean making up a number, which this app never does.
- [x] Multiple-people detection — scoped to a **count + alert**, not independent per-person dashboards (that would redefine this single-subject product) — `faceCount` on `TrackingFrame`, "Multiple people detected" alert.

---

## Honest final gap-check against the original 15-section spec

Everything above is genuinely working, not a placeholder. These are the specific items from the original spec that are **still missing** — listed plainly rather than silently dropped:

- [ ] **Segmentation / Object Detection** models — different MediaPipe tasks entirely, not wired up at all
- [ ] Per-model **Confidence** numbers and **Model Version** display — deliberately not shown (this app's whole design principle is never surfacing raw confidence as a false-precision number); version could be a simple label if wanted
- [ ] **Face distance/size**, **Eye contact** (vs. looking-away), **Wrist rotation**, **Hand speed**, **Finger count**/**Pinch distance** as displayed numbers (used internally for gestures, not surfaced), **Body angle**, **Balance score**, **Movement speed** as a number — all would need new computer-vision math not built yet
- [ ] **Low light detected**, **Face too close**, **Face too far** alerts — need new brightness/face-size heuristics
- [ ] **Camera matrix** raw display in Developer Mode (the underlying data exists, just not surfaced)
- [ ] **PDF report** / **"AI Analytics Report"** export specifically for a live camera session (PDF export exists elsewhere in the app for other data, not wired here; JSON export already covers the same analytics data)
- [ ] Floating quick-actions, animated progress rings / gradient charts applied to the _new_ cards specifically, new keyboard shortcuts for recording, collapsible new panels — visual polish items, functional versions already exist

None of these are silently faked — they're either real future work or a deliberate honesty-driven decision (documented above). Tell me if you want any of these picked up next.
