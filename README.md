# BJJ Gym Tracker

A mobile-first React web app for tracking training. 1RM records, session logs, and progress charts are all stored locally in the browser.

It currently runs a **17-week Hyrox Doubles plan** (Base → Build → Peak → Taper) built on top of the original BJJ strength programme: the same lifts, the same 1RM tracking and the same charts, with the weekly schedule now driven by whichever phase you're in.

---

## Features

- **Phase-driven weekly schedule** — the 17-week Hyrox plan; each week's template comes from its phase
- **Hyrox station work** — all 8 race stations at Men's Open Doubles specs, with distance and time logging
- **Running sessions** — compromised intervals, pure runs and doubles simulations, logged as distance + time
- **Auto-calculated working weights** — derived from your 1RMs using the Epley formula
- **Passive 1RM estimation** — no dedicated testing week; 1RMs update automatically from logged sets
- **Session logging** — weight/reps for lifts, distance/time for runs and stations; sets can be un-ticked to correct a typo
- **Fatigue tracking** — rate each session 1–5 at the end
- **Progress charts** — per-lift estimated 1RM trends over time (Chart.js)
- **Autoregulated deloads** — app monitors stalls and fatigue and recommends a deload when needed; no fixed deload schedule
- **Fully client-side** — no backend, no login, no database; all data in localStorage

---

## The 17-Week Plan

Race day: **Sunday 6 December 2026**. Plan week 1 begins **Monday 10 August 2026**.

| Phase | Weeks | BJJ | Focus |
|---|---|---|---|
| **Base** | 1–6 | 3× (Tue/Thu/Sat) | Aerobic engine, strength maintained, station technique learned |
| **Build** | 7–12 | 3× (Tue/Thu/Sat) | Compromised running, station volume up, doubles pacing |
| **Peak** | 13–15 | 2× (Tue/Sat) | Doubles simulations, split strategy, weak-point drilling |
| **Taper** | 16–17 | 1–2×, light | Volume down 40–60%, sharpness up, race week |

The current week is derived from the calendar, and can be overridden from Settings when life shifts the plan around.

### Pacing philosophy

This plan targets a **comfortable, sustainable race**, not a maximal one. Every run is prescribed at conversational or controlled effort, and "race intensity" throughout means *steady enough to hold for all 8 rounds*. The UI copy follows that deliberately — there is a test in `src/data/hyrox.test.js` that fails if max-effort framing creeps back into session guidance.

### Weekly templates

| Day | Base | Build | Peak | Taper (wk 16) |
|---|---|---|---|---|
| Mon | Strength — Lower & Hips | Strength — Squat, Hips & Lunge | Strength — Light & Fast | Strength — Short & Light |
| Tue | BJJ | BJJ | BJJ | BJJ light |
| Wed | Hyrox technique circuit* | Doubles simulation (partial)† | Doubles simulation (half/full) | Sharpener |
| Thu | BJJ | BJJ + easy–moderate run | Compromised intervals + weak point | Easy run |
| Fri | Strength — Pull & Power | Station strength-endurance | Rest / mobility | Rest / mobility |
| Sat | BJJ | BJJ | BJJ | BJJ light |
| Sun | Recovery + weekly run‡ | Recovery + Zone 2 | Recovery | Recovery |

\* Weeks 3 and 5 swap in controlled 400 m repeats.
† Weeks 9 and 12 extend to 7 legs. Station set alternates weekly so all 8 are covered each fortnight.
‡ Week 1 is a 3 km baseline time trial; every week after that is an easy run. Sunday is recovery-first — after a heavy Saturday, take the sauna and leave the run.

Race week (week 17) runs technique touches Mon/Tue, a short opener Wed, rest Thu–Sat with an optional shakeout, and the race on Sunday.

### The 8 stations (Men's Open Doubles)

| Station | Race spec |
|---|---|
| SkiErg | 1000 m |
| Sled push | 152 kg, 50 m |
| Sled pull | 103 kg, 50 m |
| Burpee broad jumps | 80 m |
| Row | 1000 m |
| Farmers carry | 2 × 24 kg, 200 m |
| Weighted lunge (sandbag substitute) | 20 kg, 100 m |
| Wall balls | 6 kg to 10 ft, 100 reps shared |

Runs are covered together; station reps and distance are split between partners however you choose.

### Sunday — Recovery

Active recovery guide (not a logged session), unchanged:
- Mobility flow: Hip 90/90, World's greatest stretch, Thoracic rotations, Shoulder CARs, Couch stretch
- Sauna: 2–3 rounds of 7–10 min, 3–5 min cool-down between (target 80–90°C)
- Cold exposure (optional): 3–5 min cold shower or plunge post-sauna
- Nutrition: high protein, carbs to replenish glycogen, electrolytes, magnesium glycinate in the evening

A 10-minute mobility/prehab block (ankle, hip flexor, thoracic) is tagged onto strength days from the Build phase onward, rather than given its own session.

---

## Legacy BJJ Programme

The original fixed Mon/Wed/Fri programme — Push & Legs, Pull & Posterior Chain, Athletic & Power — is no longer on the weekly schedule. Its session definitions remain in `src/data/workout.js` so historical log entries and progress charts still resolve correctly.

---

## 1RM System

Working weights are calculated automatically using the **Epley formula**:

```
estimated 1RM = weight × (1 + reps / 30)
```

- After each set, an estimated 1RM is calculated silently in the background
- The stored 1RM updates if the new estimate exceeds the previous one (never auto-decreases)
- Working weights are rounded to the nearest 2.5 kg and displayed as e.g. `80% → 100 kg`
- Users can manually set or override any 1RM from the Settings screen

**Tracked 1RM lifts:** Back squat · Romanian deadlift · Barbell bench press · Trap bar deadlift · Barbell hip thrust · Power clean / hang clean

---

## Progressive Overload & Deloads

**Progression (automatic):** For percent-based lifts, the working percentage ramps across the training block — starting at the low end of the exercise's range and rising **+2.5 percentage points every 2 trained weeks**, capped at the high end (e.g. back squat `80–85%`: weeks 1–2 at 80%, weeks 3–4 at 82.5%, week 5+ at 85%). The week counter only counts calendar weeks you actually trained in, so missed weeks never advance the ramp. A deload resets the block to week 1, restarting the wave from the low end — ideally with a higher estimated 1RM underneath. Manual rule for accessories: add 2.5 kg (upper body) or 5 kg (lower body) when the top of the rep range is hit cleanly across all sets for two consecutive sessions.

**Deload triggers (app monitors automatically):**
- Same lift shows a strictly declining estimated 1RM across 3 consecutive sessions
- Fatigue rated 4 or 5 on 2 of the last 3 sessions — this counts *all* sessions, including running and station work
- 7 consecutive weeks (49 days) without a deload (hard cap fallback)

The stall trigger deliberately stays lift-only: it is built on 1RM estimates, which have no meaning for a run or a wall-ball set. The banner is suppressed during the Taper phase, which is already a planned deload.

When triggered, the app shows a banner recommending a deload. Deload format: drop one set per exercise, reduce load to 60% 1RM, keep all movements the same.

---

## Tech Stack

- **React** — UI
- **localStorage** — all data persistence (keyed by username)
- **Chart.js** — progress charts
- No backend, no server, no database

---

## Data Storage (localStorage)

| Key | Contents |
|---|---|
| `bjj_users` | Array of user names |
| `bjj_1rm_{username}` | Lift name → current estimated 1RM (kg) |
| `bjj_log_{username}` | Array of session log entries |
| `bjj_block_{username}` | Current block week number and start date |
| `bjj_hyrox_{username}` | Race date and optional manual week override (plan week 1 is derived from the race date) |

---

## Out of Scope (v1)

- Cloud sync / multi-device
- Custom exercise editing
- Scheduled deload weeks
- BJJ session logging
- Social / sharing features
