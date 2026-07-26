# Body Tracker — Website ki Poori Jaankari

**Website:** bodytracker.kvlbusinesssolutions.com
**Yeh document kya hai:** Is website me kya-kya bana hai, kya real hai, kya demo/mock hai — sab ek jagah, taaki future me kisi ko bhi (khud ko ya kisi aur ko) poora context mil sake.

**Last updated:** 2026-07-26 — Phase 4 (Enterprise Camera Studio), Phase 5 (AI Model Management + Multi-Camera), Phase 5b (Segmentation + Object Detection), aur Phase 6 (Timeline/Alerts/PDF export) ke baad.

---

## 1. Website Kya Karti Hai (Ek Line Me)

Browser me hi (koi app install kiye bina) camera se **real-time face / hand / body tracking** — jaise: aankh jhapakna (blink), sar ka angle, hath ke gestures, body movement — track karke usse **fitness, posture, attention/focus, aur wellness dashboards** banata hai. Saath hi ek **developer API/SDK** bhi hai jisse doosre developers/businesses yeh tracking apne app me use kar sakte hain.

## 2. Technology (Short Me)

- **Framework:** Next.js 16 (React) — frontend aur backend dono isi ek project me
- **Camera Tracking:** Google MediaPipe (WASM, browser me hi chalta hai — video kabhi server pe nahi jata) — ab tak **5 real-time AI models** ek saath chal sakte hain: Face, Hand, Pose, Segmentation, Object Detection
- **Database:** real Postgres (Neon) — Prisma ORM ke through
- **Hosting:** Hostinger VPS (`187.127.148.237`), Nginx + PM2, domain `bodytracker.kvlbusinesssolutions.com`
- **Auth:** Email/password login, JWT token (browser me localStorage me store hota hai)

## 3. Website Ke Hisse (Pages)

| Section                   | Kya hai                                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                  | Login page (real)                                                                                                                                          |
| `/dashboard`              | Overview dashboard                                                                                                                                         |
| `/camera`                 | **Enterprise-grade Camera Studio** — live preview, tracking overlay, 2-camera support, fullscreen, floating controls (poore details neeche section 4-5 me) |
| `/camera/analytics`       | Us session ki analytics                                                                                                                                    |
| `/sessions`               | Sessions ki list/history — abhi demo data                                                                                                                  |
| `/intelligence/attention` | Focus/attention score, distraction events — **REAL**                                                                                                       |
| `/intelligence/posture`   | Baithne/sar ke angle ka score — **REAL**                                                                                                                   |
| `/intelligence/wellness`  | Thakaan/drowsiness/blink ka score — **REAL**                                                                                                               |
| `/intelligence/movement`  | Gestures, body movement, exercise reps — **REAL**                                                                                                          |
| `/intelligence/forecast`  | Trend prediction — abhi demo data                                                                                                                          |
| `/intelligence/insights`  | Suggestions/recommendations — abhi demo data                                                                                                               |
| `/reports`                | Reports page — abhi demo data (ek real `/api/v1/reports` backend hai, par yeh page abhi usse connect nahi hai — future idea, section 8 dekho)              |
| `/analytics`              | Top-level summary — abhi demo data (hardcoded numbers/names)                                                                                               |
| `/settings/*`             | Profile, camera settings, notifications — UI kaam karta hai par kuch bhi save/backend se connect nahi hai (sirf "saved" toast dikhta hai)                  |
| `/admin/*`                | Team/org/user management — UI real Prisma-backed APIs (`/api/v1/users`, `/api/v1/organizations`) se abhi connect nahi hai, demo data pe hi hai             |
| `/docs/*`                 | Developers ke liye API documentation (jaise ek SDK product)                                                                                                |

## 4. Camera Tracking — Kya-Kya Detect Hota Hai

Ab tracking **5 alag "AI models"** me hai — `/camera` page pe ek naya **"AI Model Management" panel** hai jaha har model ko individually ON/OFF kar sakte ho, aur har model ka apna real confidence/processing-time/status dikhta hai:

1. **Face** (default ON): blink count/rate, smile score, mooh khulna, sar ka angle (pitch/yaw/roll), face size (frame ka kitna % hai), eye contact estimate, looking-away detection, "face lost" timer, multiple-people detection
2. **Hand** (off by default): 7 static gestures — wave, hath uthana, point, thumbs-up, pinch, khula haath, band mutthi — plus finger count, pinch distance, wrist rotation, per-hand (left/right) visibility aur real confidence score
3. **Pose/Body** (off by default): baithe/khade/chal rahe/daud rahe/kood rahe ho — body angles, sway-based balance score, movement speed, plus exercise jaisi repeat-motion (reps + sets count, auto-detect)
4. **Segmentation** (off by default, ab REAL): selfie/background alag karta hai (real MediaPipe `ImageSegmenter` model), asli quality score ke saath
5. **Object Detection** (off by default, ab REAL): frame me jo bhi cheez dikhe usko bounding box + label + real confidence score ke saath detect karta hai (real MediaPipe `ObjectDetector`, EfficientDet model)

**Multi-camera:** ab do cameras ek saath chala sakte ho (agar device me 2 cameras hain) — dono ka live preview dikhta hai, par AI tracking sirf jo camera "active" select ki ho usi pe chalta hai (performance ke liye — ek time pe do cameras pe tracking chalana zaroori nahi hai aur unnecessary heavy hoga).

## 5. Camera Studio — Baaki Professional Features

Phase 4 me poora camera page ek **enterprise-grade layout** me restructure hua: top status bar, floating auto-hide controls video ke upar, bottom control dock, aur right sidebar ab accordion sections me organized hai (General/Video/Audio/Image/AI/Recording/Advanced).

**Real, browser-API-backed controls:**

- Picture-in-Picture, screen Wake Lock (jab tak camera chal raha ho screen sleep nahi hoga)
- Grid overlay (rule-of-thirds/center-crosshair/golden-ratio), aspect ratio switcher (16:9/4:3/1:1/9:16)
- Camera presets — poori settings ko naam de kar save/rename/delete/import/export kar sakte ho
- Keyboard shortcuts: R (record), F (fullscreen), P (PiP), C (camera flip), G (grid)
- Mic level meter (real-time volume), noise suppression / echo cancellation / auto-gain — sab real browser constraints
- White balance / ISO / shutter-speed controls — jab device support kare tabhi dikhte hain (zyada webcams support nahi karte — yeh honest behavior hai, bug nahi)
- Recording: pause/resume, live timer, file size, estimated remaining storage (`navigator.storage.estimate()`)
- Developer Mode me: dropped frames, canvas rendering time, camera transformation matrix (raw MediaPipe 4x4 matrix), FPS graph, raw landmark coordinates, bounding boxes, JS memory usage

**Live Performance Dashboard** (hamesha visible, Developer Mode se alag): FPS, latency, camera resolution, frame count, processing time — sab real numbers, koi bhi fake CPU/GPU % nahi dikhaya jata kyunki koi web API woh expose nahi karta (yeh app kabhi fabricate nahi karta).

**Recording + mic system** — verify kiya gaya hai ki yeh sahi kaam karta hai: real WebM video + Opus audio dono record hote hain (ffprobe/ffmpeg se check kiya, silent nahi — real audio signal hai).

**Resolution system** — pehle se bana hua hai aur verify kiya gaya: jo resolution select karo (480p/720p/1080p/4K), browser usi ke hisaab se camera se negotiate karta hai. Agar device (jaise ek purana webcam) 4K support nahi karta to woh apne max resolution pe girta hai — yeh `getUserMedia` ka honest/correct behavior hai, bug nahi.

**Activity Timeline:** session ke real events log hote hain — blink, smile, thumbs-up, looking-away, exercise started, rep completed (blink har 20-second me ek baar hi log hota hai taaki timeline flood na ho, kyunki insaan bahut baar blink karta hai).

**Smart Alerts:** poor posture, eyes closed, face missing, **low light** (real camera brightness sample karke — Rec.601 luma formula se, 16x16 downscaled canvas se), camera disconnected, multiple people detected.

**AI Analytics Report (PDF export):** ek button se poori session ka PDF ban sakta hai — duration, attention/posture/fatigue scores, face/hand/pose analytics, aur poori activity timeline table — sab real live session data se (koi bhi fabricated number nahi).

## 6. Real vs Demo — Sabse Zaroori Table

Yeh sabse important hissa hai — konsa number **asli camera data** se aata hai, aur konsa abhi **sirf demo/placeholder** hai:

### ✅ REAL (asli camera/session data se banta hai)

- Attention/focus score, distraction events, peak-focus time
- Posture score (sar ke angle se)
- Wellness/fatigue score, microsleep count (aankh band hone se)
- Blink count/rate, smile score, face size %, looking-away, multiple-people detection
- Gestures (wave/point/thumbs-up etc.), finger count, pinch distance, per-hand confidence — sirf jab Hand mode ON ho
- Movement pattern (sitting/standing/walking/running/jumping), body angles, balance score — sirf jab Pose mode ON ho
- Exercise sets/reps — auto-detect hota hai (jab Pose mode ON ho)
- Segmentation quality score, Object Detection labels + confidence (jab kuch detect ho — kuch na ho to honestly "N/A" dikhta hai, 0% nahi)
- Live Performance Dashboard (FPS, latency, processing time, dropped frames, rendering time)
- Low-light alert (real brightness measurement se)
- Camera transformation matrix (Developer Mode)
- Mic level meter, recording video+audio (verify kiya gaya — real signal hai)
- Camera resolution negotiation (jo device support kare)
- AI Analytics Report PDF — poora real session data se banta hai
- Login/session/user account

### ⚠️ Estimate hai, 100% precise nahi (aur kabhi nahi ho sakta camera se)

- Calories burned — ek rough andaza hai
- "Movement set" ka naam — kaunsa exact exercise tha (squat/stretch) yeh camera se pata nahi chal sakta, isliye generic naam ("Movement set") diya hai
- Walking/Running detection — desk pe baithe camera ke saamne yeh kabhi bhi bahut accurate nahi hoga (log chalte nahi camera ke saamne)
- Eye contact — geometric estimate hai (iris eye-socket ke andar kaha hai), asli gaze-tracking hardware nahi hai
- Face confidence — MediaPipe Face model khud koi confidence number deta hi nahi, isliye hamesha honestly "N/A" dikhta hai (fake number kabhi nahi banaya gaya)

### ❌ Abhi bhi DEMO/mock data hai (real nahi)

- Forecast (trend prediction)
- Insights & Recommendations page
- Reports page, Analytics page (top-level) — Reports ka ek real backend API (`/api/v1/reports`) already bana hua hai, bas page abhi usse connect nahi hai
- Sessions list, Settings (koi bhi setting save nahi hoti — bas "saved" toast dikhta hai), Admin panel ki details
- Signup/naya account banane ka page (abhi nahi hai)

## 7. Login Kaise Karein

3 pehle se bane demo accounts (`prisma/seed.ts` se seeded, real DB rows):

- `owner@apex-performance.dev` / `OwnerPass123!`
- `admin@apex-performance.dev` / `AdminPass123!`
- `member@apex-performance.dev` / `MemberPass123!`

Iske alawa, agar kabhi ek naya real account chahiye ho (naya account banane ka koi UI/signup page abhi nahi hai), to `scripts/create-user.ts` se command-line se ek real DB account bana sakte ho:

```bash
npx tsx scripts/create-user.ts <email> <password> <name> [role]
```

## 8. Deploy Kaise Hota Hai

Code GitHub (`kamaralam1984/Body-tracker`) pe hai. Deploy VPS ke Terminal me yeh command se hota hai:

```bash
cd /var/www/body-tracker && git fetch origin main && git reset --hard origin/main && npm ci && npx prisma db push && npx prisma generate && npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && cp .env.local .next/standalone/.env.local && pm2 reload ecosystem.config.js --env production && pm2 save
```

## 9. Aage Kya Kiya Ja Sakta Hai (Future Ideas)

- Naya account banane ka (signup) page
- Forecast/Insights ko bhi real data se jodna
- Calorie estimate ko behtar karne ke liye profile me weight/height option
- `/reports` page ko already-bane hue real `/api/v1/reports` backend se connect karna
- `/analytics`, `/sessions`, `/admin` pages ko real backend se jodna
- Settings pages ko real save/persist banana (abhi sirf UI shell hai)
- Background blur / virtual background / AI auto-framing — yeh ek naya real-time segmentation model chahiye, ek alag bada phase hoga
