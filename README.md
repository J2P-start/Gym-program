# BJJ Gym Tracker

A mobile-first React web app for two users to track a shared 3-day-per-week gym programme designed to supplement BJJ training. Each user has their own profile, 1RM records, session logs, and progress charts — all stored locally in the browser.

---

## Features

- **Two-user profiles** — simple name-based switching, no passwords
- **Fixed weekly programme** — Push & Legs, Pull & Posterior Chain, Athletic & Power
- **Auto-calculated working weights** — derived from each user's individual 1RMs using the Epley formula
- **Passive 1RM estimation** — no dedicated testing week; 1RMs update automatically from logged sets
- **Session logging** — log weight and reps per set, with a built-in rest timer
- **Fatigue tracking** — rate each session 1–5 at the end
- **Progress charts** — per-lift estimated 1RM trends over time (Chart.js)
- **Autoregulated deloads** — app monitors stalls and fatigue and recommends a deload when needed; no fixed deload schedule
- **Fully client-side** — no backend, no login, no database; all data in localStorage

---

## Weekly Schedule

| Day | Type | Session |
|---|---|---|
| Monday | Gym | Push & Legs |
| Tuesday | BJJ | — |
| Wednesday | Gym | Pull & Posterior Chain |
| Thursday | BJJ | — |
| Friday | Gym | Athletic & Power |
| Saturday | BJJ | — |
| Sunday | Recovery | Sauna + mobility |

---

## Workout Plan

### Monday — Push & Legs (~60 min)
*Low grip fatigue before Tuesday BJJ.*

| Exercise | Sets | Reps | Load |
|---|---|---|---|
| Back squat | 4 | 4 | 80–85% 1RM |
| Romanian deadlift | 3 | 8 | 70% 1RM |
| Barbell bench press | 4 | 5 | 75–80% 1RM |
| Landmine press | 3 | 10 each side | Moderate-heavy |
| Ab wheel rollout | 3 | 10 | Bodyweight |
| Pallof press | 3 | 12 each side | Light-moderate |

### Wednesday — Pull & Posterior Chain (~65 min)
*Most BJJ-relevant session — grip strength, pulling power, posterior chain.*

| Exercise | Sets | Reps | Load |
|---|---|---|---|
| Trap bar deadlift | 4 | 4 | 80–85% 1RM |
| Weighted pull-ups | 4 | 5–6 | +10–20 kg (log added weight) |
| Chest-supported DB row | 3 | 10 each side | Moderate-heavy |
| Barbell hip thrust | 3 | 8 | 75% 1RM |
| Gi / towel pull-up | 3 | Max (aim 6–10) | Bodyweight |
| Dead hang | 3 | 30–45 sec hold | Bodyweight |

### Friday — Athletic & Power (~55 min)
*Explosive and short — don't bury yourself before Saturday BJJ.*

| Exercise | Sets | Reps | Load |
|---|---|---|---|
| Power clean / hang clean | 4 | 3 | 70% 1RM |
| Box jump | 3 | 5 | Bodyweight |
| Farmers carry | 4 | 40 m | Heavy (log weight used) |
| Single-leg RDL | 3 | 8 each side | Moderate |
| Battle rope / rowing 500m | 4 | 30 sec on / 30 sec off | Max effort |
| Dragon flag / L-sit | 3 | Max hold or 5 reps | Bodyweight |

### Sunday — Recovery
Active recovery guide (not a logged session):
- Mobility flow: Hip 90/90, World's greatest stretch, Thoracic rotations, Shoulder CARs, Couch stretch
- Sauna: 2–3 rounds of 7–10 min, 3–5 min cool-down between (target 80–90°C)
- Cold exposure (optional): 3–5 min cold shower or plunge post-sauna
- Nutrition: high protein, carbs to replenish glycogen, electrolytes, magnesium glycinate in the evening

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

**Progression:** Add 2.5 kg (upper body) or 5 kg (lower body) when the top of the rep range is hit cleanly across all sets for two consecutive sessions.

**Deload triggers (app monitors automatically):**
- Same lift stalls for 3 consecutive sessions
- Fatigue rated 4 or 5 on 2 of the last 3 sessions
- 7 consecutive weeks without a deload (hard cap fallback)

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

---

## Out of Scope (v1)

- Cloud sync / multi-device
- Custom exercise editing
- Scheduled deload weeks
- BJJ session logging
- Social / sharing features
