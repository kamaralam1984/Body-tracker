# Camera Studio Upgrade — Phase-by-Phase Roadmap

Is file me woh sab kaam list hai jo user ne 15-section spec me maanga tha (camera controls, AI model controls, live stats, face/hand/pose analytics, timeline, alerts, session summary, recording, developer mode, visualization modes, AI insights, export, premium UI). Har item ka status yahan update hota rahega jaise-jaise kaam poora hota jaye.

**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[skip]` jaanbhoojkar nahi kar rahe (wajah likhi hai)

---

## Phase 1 — High value, kam kaam (data already backend me hai, bas live camera page pe dikhana hai) ✅ DONE

- [x] Live Session Summary card (camera page pe): duration, active/idle time, blink count, gesture count, avg/highest/lowest attention, exercise count, calories estimate — `session-summary-card.tsx`
- [x] Live Timeline (camera page pe): real-time events — gestures, "Left the frame", "Looked away", "Eyes closed", "Exercise started", "Rep completed" — `live-timeline.tsx` (reuses existing `Timeline` UI primitive)
- [x] Smart Alerts banner: No face detected, Eyes closed too long, Poor posture detected, Camera disconnected — `tracking-alerts.tsx`
- [x] Live Face analytics numbers on camera page: head pitch/roll/yaw, blink count/rate, smile, mouth open, looking-away, face-lost timer — `face-analytics-card.tsx`
- [x] Live Hand analytics (jab Hand mode ON ho): left/right hand visibility, current gesture name, gesture count — `hand-analytics-card.tsx` (finger count/pinch distance/wrist rotation/hand speed abhi nahi hain, needed to bad next round agar chahiye)
- [x] Live Pose analytics (jab Pose mode ON ho): sitting/standing/idle (live preview) + current-set reps + exercise set count — `pose-analytics-card.tsx` (walking/running sirf server-side historical `/intelligence/movement` pe hai, live glance me nahi — gait cadence ke liye lamba window chahiye)

## Phase 2 — Value hai, bada kaam (naya build chahiye)

- [ ] AI Insights Panel — live version ("Attention improving", "Blink rate low", jaisa — rule-based, existing insight-engine style se milta-julta)
- [ ] Landmark/Pose/Hand data export — JSON aur CSV (video recording nahi, sirf tracking data)
- [ ] Fake brightness/contrast sliders ko real karna (ya UI se hata dena — abhi placeholder hain, kaam nahi karte)
- [ ] Mobile camera flip button (front/back camera switch — abhi sirf generic device-selector hai)
- [ ] Camera controls gaps: microphone selector, camera-flip button

## Phase 3 — Skip / Deferred (low value ya genuinely browser me possible nahi)

- [skip] CPU/GPU/Memory usage — browser koi real API nahi deta iske liye; fake number dikhana galat hoga (app ka poora principle hi "kabhi fabricate mat karo" raha hai)
- [skip] Zoom / Torch / Auto-exposure / Auto-focus — device/browser-dependent, bahut unreliable, high effort low payoff
- [skip] Developer Mode (raw landmark IDs, camera matrix, bounding boxes, debug logs) — sirf internal debugging ke liye, end-user product ke liye nahi
- [skip] Visualization modes (wireframe/heatmap/landmark-ID overlay) — current premium silhouette look jaanbhoojkar simple rakha gaya hai
- [skip] Multiple-people detection — abhi tracking sirf 1 face ke liye configured hai (`numFaces: 1`), badalna architecture change hai
- [skip] Video recording (raw camera footage save karna) — privacy angle pehle sochna hai (abhi "video kabhi server pe nahi jata" hi selling point hai)
- [skip] Poori "Premium UI" redesign ek saath — zyada tar primitives (progress rings, charts, theme, collapsible panels) already available hain; page-by-page apply karna better hai ek bade redesign project se

---

## Already Done (is spec se pehle hi ban chuka tha)

- [x] Camera selector, Resolution (480p–4K), FPS selector, Mirror mode, Fullscreen, Screenshot
- [x] Session replay + JSON/CSV/PDF export (session-management feature me, alag page pe)
- [x] Real Attention / Posture / Wellness / Movement dashboards (post-session, `/intelligence/*`)
