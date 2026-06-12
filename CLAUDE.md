# Gym Program — CLAUDE.md

## Project Overview

A client-side React PWA for tracking a structured gym programme. No backend — all data lives in `localStorage`. Deployed to GitHub Pages.

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
│   ├── SessionScreen.jsx   # Active workout UI (exercise cards, set logging, rest timer)
│   ├── Progress.jsx        # Charts and session history log
│   ├── Settings.jsx        # Manual 1RM management
│   ├── Recovery.jsx        # Recovery day checklist
│   └── ProfileSelector.jsx # Multi-user profile selection
├── data/
│   └── workout.js          # All exercise definitions and session structure
├── utils/
│   ├── storage.js          # localStorage API (all reads/writes go here)
│   ├── oneRM.js            # Epley formula, workingWeight(), bestEstimated1RM()
│   └── deload.js           # Deload trigger logic (fatigue, stall, 7-week cap)
├── index.css               # All styles (~600 lines, dark theme, CSS variables)
└── App.jsx                 # Top-level routing and state
```

## Data Model (localStorage)

All keys are namespaced by username:

| Key | Value |
|-----|-------|
| `bjj_users` | `string[]` — list of user names |
| `bjj_1rm_<user>` | `{ [exerciseName]: number }` — estimated 1RMs in kg |
| `bjj_log_<user>` | `SessionLog[]` — full workout history |
| `bjj_block_<user>` | `{ week, startDate, lastDeloadDate }` — block progression |

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
      sets: [{ setNumber, actualWeight, reps, completed }]
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

**TRACKED_LIFTS** (in `workout.js`) are the exercises that get 1RM estimates updated after each session via the Epley formula.

## Key Utilities

- **`storage.getLastSession(username, sessionName)`** — finds the most recent log entry for a given session name, excluding today. Used to show previous weights for `note`-type exercises.
- **`oneRM.workingWeight(rm, pct)`** — returns the working weight for a given 1RM and percentage (rounded to nearest 2.5 kg).
- **`oneRM.bestEstimated1RM(sets)`** — returns the highest Epley-estimated 1RM across all sets (only sets with ≤ 10 reps).
- **`progression.blockPercent(percentRange, week, isDeload)`** — % of 1RM for a given block week: ramps from `percentRange[0]` by +2.5 points every 2 weeks, capped at `percentRange[1]`; always 60 on deload. `progression.blockWeight(rm, range, week, isDeload)` converts that to kg.
- **`progression.trainingWeek(username)`** — the block week used for the ramp and all "Block week N" displays: 1 + distinct *past* calendar weeks (Mon–Sun) with a non-deload session since `block.startDate`. Counts weeks actually trained, so missed weeks don't advance the ramp; the stored `block.week` session counter is legacy.
- **`deload.checkDeload(username)`** — returns `{ triggered, reasons[] }`. Three independent triggers: high fatigue, genuine 1RM decline, 7-week hard cap.

## Deload Logic

Three independent triggers (`src/utils/deload.js`):

1. **Fatigue** — fatigueRating ≥ 4 in 2 of the last 3 non-deload sessions
2. **Stall** — any tracked lift shows a **strictly declining** estimated 1RM across 3 consecutive sessions (`orms[2] < orms[1] < orms[0]`). Flat = compliant training, not stagnation.
3. **Hard cap** — 7 weeks (49 days) since last deload, or block.week ≥ 7

## Testing

```bash
npm test        # run all tests (vitest run)
npm run build   # production build
npm run lint    # ESLint
```

Tests live alongside source files as `*.test.js`. Currently: `src/utils/deload.test.js` (7 tests).

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
