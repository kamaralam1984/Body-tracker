# Body Tracker — Website ki Poori Jaankari

**Website:** bodytracker.kvlbusinesssolutions.com
**Yeh document kya hai:** Is website me kya-kya bana hai, kya real hai, kya demo/mock hai — sab ek jagah, taaki future me kisi ko bhi (khud ko ya kisi aur ko) poora context mil sake.

---

## 1. Website Kya Karti Hai (Ek Line Me)

Browser me hi (koi app install kiye bina) camera se **real-time face / hand / body tracking** — jaise: aankh jhapakna (blink), sar ka angle, hath ke gestures, body movement — track karke usse **fitness, posture, attention/focus, aur wellness dashboards** banata hai. Saath hi ek **developer API/SDK** bhi hai jisse doosre developers/businesses yeh tracking apne app me use kar sakte hain.

## 2. Technology (Short Me)

- **Framework:** Next.js 16 (React) — frontend aur backend dono isi ek project me
- **Camera Tracking:** Google MediaPipe (WASM, browser me hi chalta hai — video kabhi server pe nahi jata)
- **Database:** real Postgres (Neon) — Prisma ORM ke through
- **Hosting:** Hostinger VPS (`187.127.148.237`), Nginx + PM2, domain `bodytracker.kvlbusinesssolutions.com`
- **Auth:** Email/password login, JWT token (browser me localStorage me store hota hai)

## 3. Website Ke Hisse (Pages)

| Section                   | Kya hai                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `/login`                  | Login page (real)                                                 |
| `/dashboard`              | Overview dashboard                                                |
| `/camera`                 | Live camera preview + tracking overlay (fullscreen support)       |
| `/camera/analytics`       | Us session ki analytics                                           |
| `/sessions`               | Sessions ki list/history                                          |
| `/intelligence/attention` | Focus/attention score, distraction events — **REAL**              |
| `/intelligence/posture`   | Baithne/sar ke angle ka score — **REAL**                          |
| `/intelligence/wellness`  | Thakaan/drowsiness/blink ka score — **REAL**                      |
| `/intelligence/movement`  | Gestures, body movement, exercise reps — **REAL**                 |
| `/intelligence/forecast`  | Trend prediction — abhi demo data                                 |
| `/intelligence/insights`  | Suggestions/recommendations — abhi demo data                      |
| `/reports`, `/analytics`  | Reports aur summary — abhi demo data                              |
| `/settings/*`             | Profile, camera settings, notifications waghera                   |
| `/admin/*`                | Team/org/user management (backend real hai, UI abhi demo data pe) |
| `/docs/*`                 | Developers ke liye API documentation (jaise ek SDK product)       |

## 4. Camera Tracking — Kya-Kya Detect Hota Hai

Tracking teen alag "modes" me hai, **Face mode hi default ON hai**, baaki do off hain (aap `/camera` page pe toggle kar sakte ho):

1. **Face** (default ON): blink, smile, mooh khulna, sar ka angle (pitch/yaw/roll)
2. **Hand** (off by default): 7 gestures — wave, hath uthana, point, thumbs-up, pinch, khula haath, band mutthi
3. **Pose/Body** (off by default): baithe/khade/chal rahe ho — plus exercise jaisi repeat-motion (reps count)

## 5. Real vs Demo — Sabse Zaroori Table

Yeh sabse important hissa hai — konsa number **asli camera data** se aata hai, aur konsa abhi **sirf demo/placeholder** hai:

### ✅ REAL (asli camera data se banta hai)

- Attention/focus score, distraction events, peak-focus time
- Posture score (sar ke angle se)
- Wellness/fatigue score, microsleep count (aankh band hone se)
- Gestures (wave/point/thumbs-up etc.) — sirf jab Hand mode ON ho
- Movement pattern (sitting/standing/walking) — sirf jab Pose mode ON ho
- Exercise sets/reps — auto-detect hota hai (jab Pose mode ON ho)
- Login/session/user account

### ⚠️ Estimate hai, 100% precise nahi (aur kabhi nahi ho sakta camera se)

- Calories burned — ek rough andaza hai
- "Movement set" ka naam — kaunsa exact exercise tha (squat/stretch) yeh camera se pata nahi chal sakta, isliye generic naam ("Movement set") diya hai
- Walking/Running detection — desk pe baithe camera ke saamne yeh kabhi bhi bahut accurate nahi hoga (log chalte nahi camera ke saamne)

### ❌ Abhi bhi DEMO/mock data hai (real nahi)

- Forecast (trend prediction)
- Insights & Recommendations page
- Reports page, Analytics page (top-level)
- Sessions list, Settings, Admin panel ki details
- Signup/naya account banane ka page (abhi nahi hai — sirf pehle se bane 3 test accounts se login hota hai)

## 6. Login Kaise Karein

Abhi sirf 3 pehle se bane demo accounts hain (naya account banane ka page abhi nahi hai):

- `owner@apex-performance.dev` / `OwnerPass123!`
- `admin@apex-performance.dev` / `AdminPass123!`
- `member@apex-performance.dev` / `MemberPass123!`

## 7. Deploy Kaise Hota Hai

Code GitHub (`kamaralam1984/Body-tracker`) pe hai. Deploy VPS ke Terminal me yeh command se hota hai:

```bash
cd /var/www/body-tracker && git fetch origin main && git reset --hard origin/main && npm ci && npx prisma db push && npx prisma generate && npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && cp .env.local .next/standalone/.env.local && pm2 reload ecosystem.config.js --env production && pm2 save
```

## 8. Aage Kya Kiya Ja Sakta Hai (Future Ideas)

- Naya account banane ka (signup) page
- Forecast/Insights ko bhi real data se jodna
- Calorie estimate ko behtar karne ke liye profile me weight/height option
- Reports/Analytics/Admin pages ko real backend se jodna
