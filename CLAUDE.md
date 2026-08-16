# Gym Program — CLAUDE.md

## Project Overview

A client-side React PWA for tracking a structured gym programme. No backend — all data lives in `localStorage`. Deployed to GitHub Pages.

The app runs a **17-week Hyrox Doubles plan** (Base → Build → Peak → Taper) layered on top of the original BJJ strength programme. The strength lifts, 1RM tracking, progress charts, deload logic and Recovery tab are unchanged; the weekly schedule is now phase-driven rather than fixed.

## Tech Stack

- **React 19** + **Vite 8** (no TypeScript)
- **Chart.js** / **react-chartjs-2** for progress charts
- **Vitest** for unit tests
- **ESLint** for linting

## Branch & Deploy Flow

```
feature branch → claude/create-readme-j9a9O → main → GitHub Pages
```

- The deploy workflow (`.github/workflows/deploy.yml`) only triggers on pushes to **`main`**
- All feature PRs merge into `claude/create-readme-j9a9O` first, then that branch is merged to `main` to deploy
- GitHub Pages URL: `https://j2p-start.github.io/Gym-program/`
- After merging to `main`, Pages updates within ~1–2 minutes — a normal tab reload is enough (no cache clear needed, as that would wipe localStorage data)

## Project Structure

```
src/
├── components/
│   ├── Home.jsx            # Weekly schedule, session picker, deload banner
│   ├── SessionScreen.jsx   # Active workout UI (warm-up, collapsible cards, set logging)
│   ├── Progress.jsx        # Hyrox metrics, lift charts, session history
│   ├── SessionDetail.jsx   # Read-only view of one logged session
│   ├── Settings.jsx        # Manual 1RM management
│   ├── Recovery.jsx        # Recovery day checklist
│   └── ProfileSelector.jsx # First-run name setup (single athlete)
├── data/
│   ├── workout.js          # Strength lifts, TRACKED_LIFTS, legacy BJJ sessions
│   ├── hyrox.js            # Phases, stations, Hyrox sessions, weekly templates
│   └── sessions.js         # getSessionById() — every session, keyed by id
├── utils/
│   ├── storage.js          # localStorage API (all reads/writes go here)
│   ├── oneRM.js            # Epley formula, workingWeight(), bestEstimated1RM()
│   ├── deload.js           # Deload trigger logic (fatigue, stall, 7-week cap)
│   ├── hyroxPhase.js       # Date → plan week → phase
│   ├── hyroxStats.js       # Run pace/volume + station rates, read back from logs
│   └── time.js             # parseTime()/formatTime() for mm:ss durations
├── index.css               # All styles (~600 lines, dark theme, CSS variables)
└── App.jsx                 # Top-level routing and state
```

## Data Model (localStorage)

All keys are namespaced by username:

| Key | Value |
|-----|-------|
| `bjj_users` | `string[]` — the first entry is the active (only) athlete; extra entries are legacy |
| `bjj_1rm_<user>` | `{ [exerciseName]: number }` — estimated 1RMs in kg |
| `bjj_log_<user>` | `SessionLog[]` — full workout history |
| `bjj_block_<user>` | `{ week, startDate, lastDeloadDate }` — block progression |
| `bjj_hyrox_<user>` | `{ planStartDate, raceDate, weekOverride }` — Hyrox plan config |

**SessionLog entry shape:**
```js
{
  user: string,
  date: "YYYY-MM-DD",
  session: "Monday — Push & Legs",   // matches `${session.day} — ${session.name}`
  fatigueRating: 1–5,
  blockWeek: number,
  isDeload: boolean,
  exercises: [
    {
      name: string,
      estimatedOneRM: number | null,  // null for non-tracked lifts
      // distanceM / timeSec are added only for exercises that track them.
      // actualWeight and reps are always written, so every existing reader
      // (charts, 1RM estimation, deload) works against one unchanged shape.
      sets: [{ setNumber, actualWeight, reps, completed, distanceM?, timeSec? }]
    }
  ]
}
```

## Exercise Load Types

Defined in `src/data/workout.js`. Each exercise has a `loadType`:

| loadType | Behaviour | Weight input |
|----------|-----------|--------------|
| `'percent'` | Weight from 1RM × ramped % — `blockPercent()` ramps from percentRange low to high (+2.5 pts every 2 block weeks) | Auto-filled from 1RM |
| `'bodyweight'` | Displays "Bodyweight" | No weight tracking |
| `'note'` | Displays guidance text (e.g. "Moderate-heavy") | Manual entry; shows "Last: X kg" hint from previous session |
| `'added'` | For weighted accessories (e.g. "+10–20 kg added") | Manual entry |
| `'fixed'` | Race-spec load (e.g. 152 kg sled) — shown, not entered | None; `fixedWeight` is logged automatically |

**Optional exercise fields** (absent = original behaviour):

| Field | Purpose |
|-------|---------|
| `track` | Which set-logger columns to show. Defaults to `['weight','reps']`. Options: `'weight' \| 'reps' \| 'distance' \| 'time'` |
| `defaults` | Starting values per tracked field, e.g. `{ distance: 500 }` |
| `effort` | Pacing guidance shown under the load label |
| `id` | Stable key, so a station can appear more than once in a session |

**TRACKED_LIFTS** (in `workout.js`) are the exercises that get 1RM estimates updated after each session via the Epley formula.

## Key Utilities

- **`storage.getLastSession(username, sessionName)`** — finds the most recent log entry for a given session name, excluding today. Used to show previous weights for `note`-type exercises.
- **`oneRM.workingWeight(rm, pct)`** — returns the working weight for a given 1RM and percentage (rounded to nearest 2.5 kg).
- **`oneRM.bestEstimated1RM(sets)`** — returns the highest Epley-estimated 1RM across all sets (only sets with ≤ 10 reps).
- **`progression.blockPercent(percentRange, week, isDeload)`** — % of 1RM for a given block week: ramps from `percentRange[0]` by +2.5 points every 2 weeks, capped at `percentRange[1]`; always 60 on deload. `progression.blockWeight(rm, range, week, isDeload)` converts that to kg.
- **`progression.trainingWeek(username)`** — the block week used for the ramp and all "Block week N" displays: 1 + distinct *past* calendar weeks (Mon–Sun) with a non-deload session since `block.startDate`. Counts weeks actually trained, so missed weeks don't advance the ramp; the stored `block.week` session counter is legacy.
- **`deload.checkDeload(username)`** — returns `{ triggered, reasons[] }`. Three independent triggers: high fatigue, genuine 1RM decline, 7-week hard cap.
- **`warmup.warmupSets(workingWeight)`** — barbell ramp-up sets (bar ×10, then 40/60/80% with falling reps, deduped and clamped). Shown on `percent` exercise cards. Each session in `workout.js` also has a `warmup: [{ name, detail }]` array rendered as a checklist at the top of the session.

## Hyrox Plan Structure

- **Phases** — Base (weeks 1–6), Build (7–12), Peak (13–15), Taper (16–17). Defined in `hyrox.js`.
- **`getWeekTemplate(week)`** — returns the 7 days for a plan week. It's a function rather than a static lookup because details vary *within* a phase: fortnightly interval Wednesdays in Base, the every-third-week long simulation in Build, and race week in Taper.
- **`currentPlanWeek(config)`** — derives the week from the calendar unless `weekOverride` is set in Settings.
- **Sessions are looked up by id**, via `getSessionById()`. The legacy BJJ sessions stay in the registry so old logs resolve.
- **Pacing language** — the plan targets a comfortable, sustainable race. Session copy uses controlled-effort framing, never max-effort. `src/data/hyrox.test.js` enforces this.

## Hyrox Metrics

Run and station exercises carry `metric: 'run'` / `metric: 'station'` (plus `stationKey`). Logs only store exercise *names*, so `hyrox.js` exports `RUN_EXERCISE_NAMES` and `STATION_NAME_TO_KEY`, derived from those tags, and `utils/hyroxStats.js` uses them to classify logged exercises without string heuristics.

- **`weeklyRunVolume(logs)`** — km per Mon–Sun week. Counts `metric: 'run'` only, so SkiErg/row metres never inflate running volume.
- **`runSessions(logs)`** — distance and average pace per session. Pace averages only over sets with a time, so an untimed leg can't skew it.
- **`stationSummary(logs)`** — per-station session count, latest volume, and best rate. Normalised as sec/100 m for distance stations (lower is better) and reps/min for rep stations (higher is better), so sessions of different volumes compare.
- Phases carry `runTargetKm: [low, high]`, drawn as a band on the volume chart. **These are derived from what the weekly templates actually prescribe, not from the plan document's headline figures** (12–15 km Base, 15–25 km Build), which its own sessions never reach. A test in `data/hyrox.test.js` fails if the prescribed distance for any week falls outside its phase band, so the two can't drift apart.
- Time-based runs ("30–40 min easy", "4 × 6 min") carry a pre-filled `defaults.distance` estimated at conversational (~5:30/km) or threshold (~5:00/km) pace, so logging them is one tap. The Sunday Zone 2 block is deliberately left blank: it may be a bike or a row, and only a run should count toward running volume.

The Progress tab splits into **Hyrox** (volume, pace, stations) and **Strength** (the unchanged 1RM charts). Session history entries are buttons that open `SessionDetail`.

## Deload Logic

Three independent triggers (`src/utils/deload.js`):

1. **Fatigue** — fatigueRating ≥ 4 in 2 of the last 3 non-deload sessions
2. **Stall** — any tracked lift shows a **strictly declining** estimated 1RM across 3 consecutive sessions (`orms[2] < orms[1] < orms[0]`). Flat = compliant training, not stagnation.
3. **Hard cap** — 7 weeks (49 days) since last deload, or block.week ≥ 7

The fatigue trigger reads *all* logged sessions, so running and station work feed it automatically — no change was needed for the Hyrox sessions. The stall trigger stays lift-only by design: it's built on 1RM estimates, which are meaningless for a run or a wall-ball set. The banner is suppressed during the Taper phase (a planned deload already); `deload.js` itself is unchanged.

## Testing

```bash
npm test        # run all tests (vitest run)
npm run build   # production build
npm run lint    # ESLint
```

Tests live alongside source files as `*.test.js`: `deload.test.js`, `oneRM.test.js`, `storage.test.js`, `time.test.js`, `hyroxPhase.test.js`, and `data/hyrox.test.js` (plan integrity — template shape, station coverage, exercise shape, pacing language).

## CSS Conventions

All styles in `src/index.css`. Dark near-black theme with pale "light surface" accents (dribbble-style): accent elements are light cards/pills with dark text (`--on-accent`), not coloured text on dark. Font is Poppins (Google Fonts link in `index.html`). CSS custom properties defined on `:root`:
- `--bg`, `--bg2`, `--bg3` — background layers (near-black → panel → input)
- `--text`, `--text2` — primary / muted text
- `--accent`, `--accent2` — pale ice-blue highlight surface (+ pressed state)
- `--lavender` — pale lavender secondary surface
- `--on-accent` — dark text used on the light accent surfaces
- `--danger` — red
- `--warn` — amber
- `--radius`, `--radius-sm`, `--pill` — 24px cards, 14px inputs, fully-rounded pills
