// Hyrox Doubles — 17-week periodised plan (Men's Open Doubles).
//
// Sessions here use exactly the same shape as the strength sessions in
// workout.js, with three optional additions so running and station work fit the
// existing exercise model rather than sitting beside it:
//
//   track    — which columns the set logger shows. Defaults to ['weight','reps']
//              when absent, so every existing exercise behaves as it always has.
//              Available: 'weight' | 'reps' | 'distance' | 'time'
//   defaults — starting values per tracked field, e.g. { distance: 500 }
//   effort   — pacing guidance shown under the load label
//
// plus one new loadType, 'fixed', for race-spec loads that aren't 1RM-derived
// and aren't manually entered (the sled is 152 kg whether you like it or not).
//
// percentRange follows the same [low, high] ramp as the strength sessions (see
// utils/progression.js): the working percentage climbs from low toward high
// across the block. Base and Build carry a small ramp; Peak and Taper are
// deliberately flat, because both phases are explicitly about maintaining
// rather than chasing new numbers this close to race day.

export const DEFAULT_HYROX = {
  planStartDate: '2026-08-10', // Monday of plan week 1
  raceDate: '2026-12-06',      // Sunday — race day
  weekOverride: null,          // null = derive the week from today's date
};

export const TOTAL_WEEKS = 17;

export const PHASES = [
  {
    key: 'base',
    name: 'Base',
    firstWeek: 1,
    lastWeek: 6,
    bjj: '3× — Tue / Thu / Sat',
    runTargetKm: [9, 13],
    focus: 'Aerobic engine, strength held at maintenance, station technique grooved.',
  },
  {
    key: 'build',
    name: 'Build',
    firstWeek: 7,
    lastWeek: 12,
    bjj: '3× — Tue / Thu / Sat',
    runTargetKm: [15, 19],
    focus: 'Compromised running becomes the centrepiece. Station volume up, doubles pacing introduced.',
  },
  {
    key: 'peak',
    name: 'Peak',
    firstWeek: 13,
    lastWeek: 15,
    bjj: '2× — Tue / Sat',
    runTargetKm: [7, 11],
    focus: 'Doubles simulations with your partner, split strategy settled, weak points drilled.',
  },
  {
    key: 'taper',
    name: 'Taper',
    firstWeek: 16,
    lastWeek: 17,
    bjj: '1–2×, light',
    runTargetKm: [4, 6],
    focus: 'Volume down 40–60%, sharpness up. Arrive fresh, not fit-but-flat.',
  },
];

// Pacing language for this plan is deliberately controlled-effort, never
// max-effort. "Race intensity" here means sustainable for all 8 rounds.
export const EFFORT = {
  conversational: 'Conversational — you should be able to hold a conversation',
  easy: 'Genuinely easy — resist the urge to push',
  steady: 'Steady and sustainable — holdable for all 8 rounds',
  controlled: 'Controlled effort, not maximal',
  comfortablyHard: 'Comfortably hard — broken conversation only',
  technique: 'Technique pace — smooth and unhurried, no clock',
  brisk: 'Brisk but repeatable — you should finish wanting one more',
};

// Men's Open Doubles race specs. Runs are covered together; station reps and
// distance are split between partners however you choose.
export const STATIONS = [
  { key: 'ski',      name: 'SkiErg',                  raceSpec: '1000 m',                track: ['distance', 'time'] },
  { key: 'sledpush', name: 'Sled push',               raceSpec: '152 kg, 50 m',          track: ['distance', 'time'], fixedLabel: '152 kg total', fixedWeight: 152 },
  { key: 'sledpull', name: 'Sled pull',               raceSpec: '103 kg, 50 m',          track: ['distance', 'time'], fixedLabel: '103 kg',       fixedWeight: 103 },
  { key: 'burpee',   name: 'Burpee broad jumps',      raceSpec: '80 m',                  track: ['distance', 'time'] },
  { key: 'row',      name: 'Row',                     raceSpec: '1000 m',                track: ['distance', 'time'] },
  { key: 'farmers',  name: 'Farmers carry',           raceSpec: '2 × 24 kg, 200 m',      track: ['distance', 'time'], fixedLabel: '2 × 24 kg',    fixedWeight: 48 },
  { key: 'lunge',    name: 'Weighted lunge',          raceSpec: '20 kg, 100 m',          track: ['distance', 'time'], fixedLabel: '20 kg — sandbag substitute', fixedWeight: 20 },
  { key: 'wallball', name: 'Wall balls',              raceSpec: '6 kg to 10 ft, 100 reps shared', track: ['reps', 'time'], fixedLabel: '6 kg to 10 ft', fixedWeight: 6 },
];

const stationByKey = Object.fromEntries(STATIONS.map((s) => [s.key, s]));

/* ------------------------------------------------------------------ */
/* Exercise builders                                                    */
/* ------------------------------------------------------------------ */

/** A running block: N sets of a given distance, logged as distance + time. */
function run({ id, name, sets, meters, effort, rest = 0, repLabel }) {
  return {
    id,
    name,
    sets,
    reps: null,
    repLabel: repLabel ?? `${meters} m`,
    loadType: 'note',
    note: effort,
    metric: 'run',
    track: ['distance', 'time'],
    defaults: { distance: meters },
    restSeconds: rest,
  };
}

/** A time-only piece — erg finishers, Zone 2, mobility holds. */
function timed({ id, name, sets = 1, label, effort, rest = 0 }) {
  return {
    id,
    name,
    sets,
    reps: null,
    repLabel: label,
    loadType: 'note',
    note: effort,
    track: ['time'],
    restSeconds: rest,
  };
}

/** One of the 8 race stations, at whatever volume the session calls for. */
function station(key, { sets = 1, reps = null, repLabel, meters, effort = EFFORT.controlled, rest = 90, id, track }) {
  const s = stationByKey[key];
  return {
    id: id ?? `st-${key}`,
    name: s.name,
    sets,
    reps,
    repLabel,
    loadType: s.fixedLabel ? 'fixed' : 'note',
    fixedLabel: s.fixedLabel,
    fixedWeight: s.fixedWeight,
    raceSpec: s.raceSpec,
    metric: 'station',
    stationKey: key,
    note: s.fixedLabel ? undefined : effort,
    effort,
    track: track ?? s.track,
    defaults: meters ? { distance: meters } : undefined,
    restSeconds: rest,
  };
}

/**
 * 10 minutes of prehab, tagged onto the end of a strength day rather than
 * given its own session. Targets the three things that break down first under
 * Hyrox running + lunge + SkiErg volume.
 */
const MOBILITY = [
  { id: 'mob-ankle', name: 'Ankle dorsiflexion + calf raises', sets: 2, reps: 15, repLabel: '15 each side', loadType: 'bodyweight', track: ['reps'], effort: 'Protects against running volume and the wall-ball catch', restSeconds: 30 },
  { id: 'mob-hip',   name: 'Hip flexor stretch',               sets: 2, reps: null, repLabel: '45 sec each side', loadType: 'bodyweight', track: ['time'], effort: 'Sled and lunge work tightens these fast', restSeconds: 0 },
  { id: 'mob-tspine', name: 'Thoracic rotation + extension',   sets: 2, reps: 10, repLabel: '10 each side', loadType: 'bodyweight', track: ['reps'], effort: 'Opens up the SkiErg pull pattern', restSeconds: 0 },
];

/* ------------------------------------------------------------------ */
/* Sessions                                                             */
/* ------------------------------------------------------------------ */

const S = {};
const define = (session) => { S[session.id] = session; return session; };

/* ---- BASE (weeks 1–6) ---- */

define({
  id: 'base-strength-a',
  day: 'Monday',
  name: 'Strength — Lower & Hips',
  duration: '~55 min',
  kind: 'strength',
  note: 'Maintenance load, not a push for new numbers. You already have the strength Hyrox needs — this is about keeping it while the running volume goes up.',
  exercises: [
    { name: 'Back squat',        sets: 3, reps: 5, repLabel: '5', loadType: 'percent', percentRange: [75, 78], restSeconds: 180, isLower: true },
    { name: 'Barbell hip thrust', sets: 3, reps: 8, repLabel: '8', loadType: 'percent', percentRange: [75, 78], restSeconds: 120, isLower: true, effort: 'Hip extension power — drives both running speed and sled push' },
    { name: 'Ab wheel rollout',  sets: 3, reps: 10, repLabel: '10', loadType: 'bodyweight', restSeconds: 60 },
    { name: 'Pallof press',      sets: 3, reps: 12, repLabel: '12 each side', loadType: 'note', note: 'Light–moderate', restSeconds: 60 },
    timed({ id: 'fin-ski', name: 'SkiErg or row finisher', label: '10 min', effort: EFFORT.easy }),
  ],
});

define({
  id: 'base-technique',
  day: 'Wednesday',
  name: 'Hyrox Technique Circuit',
  duration: '~70 min',
  kind: 'hyrox',
  note: 'Alternate run leg → station → run leg → station, working through all 8 stations. Every movement pattern gets grooved before any intensity is added. Log the run legs as one block below.',
  exercises: [
    run({ id: 'run-legs', name: 'Run legs', sets: 8, meters: 300, effort: EFFORT.conversational }),
    station('ski',      { repLabel: '250 m', meters: 250, effort: EFFORT.technique }),
    station('sledpush', { repLabel: '50 m',  meters: 50,  effort: EFFORT.technique }),
    station('sledpull', { repLabel: '50 m',  meters: 50,  effort: EFFORT.technique }),
    station('burpee',   { repLabel: '20 m',  meters: 20,  effort: EFFORT.technique }),
    station('row',      { repLabel: '250 m', meters: 250, effort: EFFORT.technique }),
    station('farmers',  { repLabel: '100 m', meters: 100, effort: EFFORT.technique }),
    station('lunge',    { repLabel: '50 m',  meters: 50,  effort: EFFORT.technique }),
    station('wallball', { reps: 25, repLabel: '25 reps', effort: EFFORT.technique }),
  ],
});

define({
  id: 'base-intervals',
  day: 'Wednesday',
  name: 'Controlled 400s + Stations',
  duration: '~65 min',
  kind: 'run',
  note: 'Fortnightly variation on the technique circuit. Steady controlled pace on the 400s — this is not a time trial. Stations still follow, so no Base week goes by barely touching the race movements.',
  exercises: [
    run({ id: 'run-400s', name: '400 m repeats', sets: 6, meters: 400, effort: EFFORT.controlled, rest: 90 }),
    station('ski',      { repLabel: '500 m', meters: 500, effort: EFFORT.steady }),
    station('sledpush', { repLabel: '50 m',  meters: 50,  effort: EFFORT.steady }),
    station('burpee',   { repLabel: '20 m',  meters: 20,  effort: EFFORT.steady }),
    station('farmers',  { repLabel: '100 m', meters: 100, effort: EFFORT.steady }),
    station('wallball', { reps: 25, repLabel: '25 reps', effort: EFFORT.steady }),
  ],
});

define({
  id: 'base-strength-b',
  day: 'Friday',
  name: 'Strength — Pull & Power',
  duration: '~65 min',
  kind: 'strength',
  note: "Trap bar keeps the pull heavy without the lower-back cost of a conventional deadlift — which matters when you're stacking it against running volume. The finisher is an easy run rather than an erg — it is your third running exposure of the week, and only running builds the tendon and economy adaptations that running needs. Keep it genuinely easy; Saturday BJJ still has to happen.",
  exercises: [
    { name: 'Trap bar deadlift',        sets: 3, reps: 5, repLabel: '5', loadType: 'percent', percentRange: [75, 78], restSeconds: 180, isLower: true },
    { name: 'Power clean / hang clean', sets: 3, reps: 3, repLabel: '3', loadType: 'percent', percentRange: [75, 75], restSeconds: 150, isLower: false, effort: 'Speed off the floor — bar velocity over load' },
    { id: 'carry-farmers-grip', name: 'Farmers carry', sets: 3, reps: null, repLabel: '40 m', loadType: 'note', note: 'Heavy — log the weight used', track: ['weight', 'distance'], defaults: { distance: 40 }, restSeconds: 90 },
    { name: 'Dead hang', sets: 3, reps: null, repLabel: '30–45 sec hold', loadType: 'bodyweight', track: ['time'], restSeconds: 60 },
    run({ id: 'fin-run', name: 'Easy run finisher', sets: 1, meters: 4000, repLabel: '20–25 min', effort: EFFORT.conversational }),
  ],
});

define({
  id: 'base-run-baseline',
  day: 'Sunday',
  name: '3 km Baseline Time Trial',
  duration: '~25 min',
  kind: 'run',
  note: 'Flat, fresh legs, one honest effort. This sets your target Hyrox km split — expect race splits about 15–25 sec/km slower than this once station fatigue is in play.',
  exercises: [
    run({ id: 'run-tt', name: '3 km time trial', sets: 1, meters: 3000, effort: 'One steady honest effort — even pacing beats a fast start' }),
  ],
});

define({
  id: 'base-run-easy',
  day: 'Sunday',
  name: 'Easy Run',
  duration: '30–40 min',
  kind: 'run',
  note: 'Your third run of the week and the one that builds the aerobic engine. Recovery comes first here: if Saturday rolls were heavy or the legs feel beaten up, take the sauna and leave the run — that is a judgement call, not a missed session. When you do run it, keep it genuinely easy.',
  exercises: [
    run({ id: 'run-easy', name: 'Easy run', sets: 1, meters: 6500, repLabel: '30–40 min', effort: EFFORT.conversational }),
  ],
});

// No longer scheduled: threshold work belongs on Wednesday, not on the
// recovery day. Kept defined so previously logged sessions still resolve.
define({
  id: 'base-run-threshold',
  day: 'Sunday',
  name: 'Threshold Run',
  duration: '~45 min',
  kind: 'run',
  note: 'Comfortably hard, not hard. If the last rep is falling apart, the first two were too quick.',
  exercises: [
    run({ id: 'run-threshold', name: '6 min efforts', sets: 4, meters: 1200, repLabel: '6 min', effort: EFFORT.comfortablyHard, rest: 90 }),
  ],
});

/* ---- BUILD (weeks 7–12) ---- */

define({
  id: 'build-strength',
  day: 'Monday',
  name: 'Strength — Squat, Hips & Lunge',
  duration: '~60 min',
  kind: 'strength',
  note: 'The loaded lunge pattern here is your sandbag-lunge substitute. Build it now so race day is not the first time your legs meet 100 m of it.',
  exercises: [
    { name: 'Back squat',         sets: 3, reps: 4, repLabel: '4', loadType: 'percent', percentRange: [80, 82], restSeconds: 180, isLower: true },
    { name: 'Barbell hip thrust', sets: 3, reps: 6, repLabel: '6', loadType: 'percent', percentRange: [78, 80], restSeconds: 120, isLower: true },
    { id: 'lunge-loaded', name: 'Weighted lunge / step-up', sets: 3, reps: 14, repLabel: '12–15 each leg', loadType: 'note', note: 'Loaded to feel demanding at 12–15 reps per leg', effort: 'Goblet DB or weighted vest — the sandbag-lunge pattern', restSeconds: 90 },
    ...MOBILITY,
  ],
});

define({
  id: 'build-sim-a',
  day: 'Wednesday',
  name: 'Doubles Simulation (Partial)',
  duration: '~65 min',
  kind: 'sim',
  note: 'Run leg → station, six times through. Controlled sustainable effort, not maximal — the point is stringing legs together without technique falling apart. Stations rotate fortnightly so all 8 get covered.',
  exercises: [
    run({ id: 'run-legs', name: 'Run legs', sets: 6, meters: 800, effort: EFFORT.steady }),
    station('ski',      { repLabel: '500 m',   meters: 500, effort: EFFORT.steady }),
    station('sledpush', { repLabel: '50 m',    meters: 50,  effort: EFFORT.steady }),
    station('burpee',   { repLabel: '40 m',    meters: 40,  effort: EFFORT.steady }),
    station('farmers',  { repLabel: '150 m',   meters: 150, effort: EFFORT.steady }),
    station('wallball', { reps: 40, repLabel: '40 reps', effort: EFFORT.steady }),
    station('row',      { repLabel: '500 m',   meters: 500, effort: EFFORT.steady }),
  ],
});

define({
  id: 'build-sim-b',
  day: 'Wednesday',
  name: 'Doubles Simulation (Partial)',
  duration: '~65 min',
  kind: 'sim',
  note: 'Alternate week station set — sled pull, lunge and row get their turn. Same controlled sustainable effort throughout.',
  exercises: [
    run({ id: 'run-legs', name: 'Run legs', sets: 6, meters: 800, effort: EFFORT.steady }),
    station('row',      { repLabel: '500 m', meters: 500, effort: EFFORT.steady }),
    station('sledpull', { repLabel: '50 m',  meters: 50,  effort: EFFORT.steady }),
    station('wallball', { reps: 40, repLabel: '40 reps', effort: EFFORT.steady }),
    station('lunge',    { repLabel: '100 m', meters: 100, effort: EFFORT.steady }),
    station('burpee',   { repLabel: '40 m',  meters: 40,  effort: EFFORT.steady }),
    station('ski',      { repLabel: '500 m', meters: 500, effort: EFFORT.steady }),
  ],
});

define({
  id: 'build-sim-long',
  day: 'Wednesday',
  name: 'Doubles Simulation (Extended)',
  duration: '~80 min',
  kind: 'sim',
  note: 'Every third week the legs go to full race distance — 6 × 1 km. Effort stays controlled; it is the leg length that is progressing, not the pace. A 1 km leg punishes a fast start in a way a 500 m leg does not, which is exactly the pacing you need to rehearse.',
  exercises: [
    run({ id: 'run-legs', name: 'Run legs', sets: 6, meters: 1000, effort: EFFORT.steady }),
    station('ski',      { repLabel: '500 m', meters: 500, effort: EFFORT.steady }),
    station('sledpush', { repLabel: '50 m',  meters: 50,  effort: EFFORT.steady }),
    station('sledpull', { repLabel: '50 m',  meters: 50,  effort: EFFORT.steady }),
    station('burpee',   { repLabel: '40 m',  meters: 40,  effort: EFFORT.steady }),
    station('row',      { repLabel: '500 m', meters: 500, effort: EFFORT.steady }),
    station('farmers',  { repLabel: '150 m', meters: 150, effort: EFFORT.steady }),
    station('wallball', { reps: 50, repLabel: '50 reps', effort: EFFORT.steady }),
  ],
});

define({
  id: 'build-run-tempo',
  day: 'Thursday',
  name: 'Easy Run',
  duration: '30–40 min',
  kind: 'run',
  note: 'Tagged onto your BJJ day, and deliberately easy rather than threshold — Wednesday already supplies the hard running, and a second quality session in a week carrying three BJJ sessions buys fatigue rather than fitness. If the week already feels heavy, drop this one.',
  exercises: [
    run({ id: 'run-easy', name: 'Easy run', sets: 1, meters: 6000, repLabel: '30–40 min', effort: EFFORT.conversational }),
  ],
});

define({
  id: 'build-station-endurance',
  day: 'Friday',
  name: 'Station Strength-Endurance',
  duration: '~65 min',
  kind: 'hyrox',
  note: 'Muscular endurance at moderate loads is your real limiter, not max strength. This is the session that addresses it. Burpees go last, deliberately under fatigue.',
  exercises: [
    station('sledpush', { sets: 3, repLabel: '50 m', meters: 50, effort: EFFORT.brisk, rest: 120 }),
    station('sledpull', { sets: 3, repLabel: '50 m', meters: 50, effort: EFFORT.brisk, rest: 120 }),
    station('wallball', { sets: 3, reps: 22, repLabel: '20–25 reps', effort: EFFORT.steady, rest: 90 }),
    station('row',      { sets: 4, repLabel: '500 m', meters: 500, effort: EFFORT.steady, rest: 90 }),
    station('lunge',    { sets: 3, repLabel: '50 m', meters: 50, effort: EFFORT.steady, rest: 90 }),
    station('burpee',   { sets: 3, reps: 15, repLabel: '15 reps', track: ['reps', 'time'], effort: 'Under fatigue — steady rhythm beats fast then stalling', rest: 90 }),
    ...MOBILITY,
  ],
});

define({
  id: 'build-zone2-short',
  day: 'Sunday',
  name: 'Zone 2 — 25–30 min',
  duration: '25–30 min',
  kind: 'run',
  note: 'Shorter for the first two weeks of Build while the weekly running load steps up. Same rules as the full version: run it by preference, keep it genuinely easy, and let recovery come first — after a heavy Saturday, bike it or skip it and sauna.',
  exercises: [
    run({ id: 'z2', name: 'Zone 2 easy run', sets: 1, meters: 4500, repLabel: '25–30 min', effort: EFFORT.easy }),
  ],
});

define({
  id: 'build-zone2',
  day: 'Sunday',
  name: 'Zone 2 — 35–45 min',
  duration: '35–45 min',
  kind: 'run',
  note: 'Run this one by preference — cycling builds the aerobic engine but not the tendon and running-economy adaptations that running needs, and this is your third running exposure of the week. It sits alongside your usual sauna protocol, not instead of it, and recovery comes first: after a heavy Saturday, bike it, row it, or skip it and sauna. If you do not run it, clear the distance so it does not count as running volume.',
  exercises: [
    run({ id: 'z2', name: 'Zone 2 easy run', sets: 1, meters: 6500, repLabel: '35–45 min', effort: EFFORT.easy }),
  ],
});

/* ---- PEAK (weeks 13–15) ---- */

define({
  id: 'peak-strength',
  day: 'Monday',
  name: 'Strength — Light & Fast',
  duration: '~40 min',
  kind: 'strength',
  note: 'Maintain, do not chase new numbers this close to race day. Bar speed is the target on every rep.',
  exercises: [
    { name: 'Back squat',               sets: 2, reps: 3, repLabel: '3', loadType: 'percent', percentRange: [65, 65], restSeconds: 180, isLower: true, effort: 'Focus on bar speed, not load' },
    { name: 'Power clean / hang clean', sets: 3, reps: 2, repLabel: '2', loadType: 'percent', percentRange: [78, 78], restSeconds: 150, isLower: false, effort: 'Crisp and fast — stop the moment speed drops' },
    { name: 'Barbell hip thrust',       sets: 2, reps: 5, repLabel: '5', loadType: 'percent', percentRange: [65, 65], restSeconds: 120, isLower: true },
    ...MOBILITY,
  ],
});

define({
  id: 'peak-sim-half',
  day: 'Wednesday',
  name: 'Doubles Simulation — Half Race',
  duration: '~55 min',
  kind: 'sim',
  note: 'Four full legs with your partner at the effort you actually intend to race at. Rehearse your station splits, not just the movements — the best split is found through practice, not assumed. Wall balls and burpees are in deliberately: they are your muscular-endurance limiters and this is no week to skip them. Sled pull gets its turn in the full simulations.',
  exercises: [
    run({ id: 'run-legs', name: 'Run legs (together)', sets: 4, meters: 1000, effort: EFFORT.steady }),
    station('ski',      { repLabel: 'Your share of 1000 m', meters: 500, effort: EFFORT.steady }),
    station('sledpush', { repLabel: 'Your share of 50 m',   meters: 25,  effort: EFFORT.steady }),
    station('wallball', { reps: 50, repLabel: 'Your share of 100 reps', effort: EFFORT.steady }),
    station('burpee',   { repLabel: 'Your share of 80 m',   meters: 40,  effort: EFFORT.steady }),
  ],
});

define({
  id: 'peak-sim-full',
  day: 'Wednesday',
  name: 'Doubles Simulation — Full Race',
  duration: '~100 min',
  kind: 'sim',
  note: 'All 8 legs and all 8 stations at your intended race effort. This is your best chance to rehearse feeling good the whole way through, not to fitness-test yourself. Lean on your partner while they work — that recovery is part of the strategy.',
  exercises: [
    run({ id: 'run-legs', name: 'Run legs (together)', sets: 8, meters: 1000, effort: EFFORT.steady }),
    station('ski',      { repLabel: 'Your share of 1000 m',  meters: 500, effort: EFFORT.steady }),
    station('sledpush', { repLabel: 'Your share of 50 m',    meters: 25,  effort: EFFORT.steady }),
    station('sledpull', { repLabel: 'Your share of 50 m',    meters: 25,  effort: EFFORT.steady }),
    station('burpee',   { repLabel: 'Your share of 80 m',    meters: 40,  effort: EFFORT.steady }),
    station('row',      { repLabel: 'Your share of 1000 m',  meters: 500, effort: EFFORT.steady }),
    station('farmers',  { repLabel: 'Your share of 200 m',   meters: 100, effort: EFFORT.steady }),
    station('lunge',    { repLabel: 'Your share of 100 m',   meters: 50,  effort: EFFORT.steady }),
    station('wallball', { reps: 50, repLabel: 'Your share of 100 reps', effort: EFFORT.steady }),
  ],
});

define({
  id: 'peak-compromised',
  day: 'Thursday',
  name: 'Compromised Intervals + Weak Point',
  duration: '~50 min',
  kind: 'run',
  note: 'Thursday is free now BJJ has dropped to twice a week. Pick whichever station is slowest or roughest for you and drill it fatigued.',
  exercises: [
    run({ id: 'run-600s', name: '600 m repeats', sets: 5, meters: 600, effort: EFFORT.controlled, rest: 90 }),
    { id: 'weak-point', name: 'Weak-point station', sets: 3, reps: null, repLabel: 'Your choice — drill it fatigued', loadType: 'note', note: 'Whichever station is slowest or technically worst', effort: EFFORT.controlled, track: ['distance', 'time'], restSeconds: 120 },
  ],
});

define({
  id: 'mobility-only',
  day: 'Friday',
  name: 'Mobility Only',
  duration: '~15 min',
  kind: 'mobility',
  note: 'Light movement, nothing that costs you anything. Friday is a rest day in this block.',
  exercises: [...MOBILITY],
});

/* ---- TAPER (weeks 16–17) ---- */

define({
  id: 'taper-strength',
  day: 'Monday',
  name: 'Strength — Short & Light',
  duration: '~30 min',
  kind: 'strength',
  note: 'Enough to keep the pattern, nowhere near enough to cost you anything. In and out.',
  exercises: [
    { name: 'Back squat',         sets: 2, reps: 3, repLabel: '3', loadType: 'percent', percentRange: [60, 60], restSeconds: 150, isLower: true, effort: 'Light and fast' },
    { name: 'Barbell hip thrust', sets: 2, reps: 5, repLabel: '5', loadType: 'percent', percentRange: [60, 60], restSeconds: 120, isLower: true },
    ...MOBILITY,
  ],
});

define({
  id: 'taper-sharpener',
  day: 'Wednesday',
  name: 'Sharpener',
  duration: '~20 min',
  kind: 'sim',
  note: 'One short touch at your controlled race effort, then stop. Volume is down roughly 40% this week — resist the urge to add to it.',
  exercises: [
    run({ id: 'run-leg', name: 'Run leg', sets: 1, meters: 500, effort: EFFORT.steady }),
    station('ski', { repLabel: '500 m', meters: 500, effort: EFFORT.steady }),
  ],
});

define({
  id: 'taper-run-easy',
  day: 'Thursday',
  name: 'Easy Run',
  duration: '20–25 min',
  kind: 'run',
  note: 'Short and conversational. Nothing to prove here.',
  exercises: [
    run({ id: 'run-easy', name: 'Easy run', sets: 1, meters: 4000, repLabel: '20–25 min', effort: EFFORT.conversational }),
  ],
});

define({
  id: 'race-week-technique',
  day: 'Monday',
  name: 'Technique Touch',
  duration: '~25 min',
  kind: 'hyrox',
  note: 'Race week. Low volume, technique only — you are reminding your body of the patterns, not training them.',
  exercises: [
    run({ id: 'run-short', name: 'Short easy run', sets: 1, meters: 1000, effort: EFFORT.easy }),
    station('wallball', { reps: 15, repLabel: '15 reps', effort: EFFORT.technique }),
    station('ski',      { repLabel: '250 m', meters: 250, effort: EFFORT.technique }),
  ],
});

define({
  id: 'race-week-technique-2',
  day: 'Tuesday',
  name: 'Technique Touch',
  duration: '~20 min',
  kind: 'hyrox',
  note: 'Same again, even shorter. Sled and lunge feel, nothing more.',
  exercises: [
    station('sledpush', { repLabel: '25 m', meters: 25, effort: EFFORT.technique }),
    station('lunge',    { repLabel: '50 m', meters: 50, effort: EFFORT.technique }),
    run({ id: 'run-short', name: 'Short easy run', sets: 1, meters: 800, effort: EFFORT.easy }),
  ],
});

define({
  id: 'race-week-opener',
  day: 'Wednesday',
  name: 'Race Opener',
  duration: '~20 min',
  kind: 'sim',
  note: 'Two brief touches at the controlled pace you will actually race at, then done. This should feel comfortable — if it feels like a test, you have gone too hard.',
  exercises: [
    run({ id: 'run-opener', name: 'Run legs', sets: 2, meters: 300, effort: EFFORT.steady }),
    station('ski',      { repLabel: '250 m — half a station', meters: 250, effort: EFFORT.steady }),
    station('wallball', { reps: 15, repLabel: '15 reps — half a station', effort: EFFORT.steady }),
  ],
});

define({
  id: 'race-week-shakeout',
  day: 'Saturday',
  name: 'Shakeout',
  duration: '10–15 min',
  kind: 'run',
  note: 'Optional. Only if sitting still feels worse than moving. Walk or very easy jog.',
  exercises: [
    run({ id: 'run-shakeout', name: 'Shakeout walk / jog', sets: 1, meters: 2000, repLabel: '10–15 min', effort: EFFORT.easy }),
  ],
});

export const HYROX_SESSIONS = S;

// Logs store exercise names, not definitions, so these let the stats layer
// classify a logged exercise without resorting to string heuristics.
export const RUN_EXERCISE_NAMES = new Set(
  Object.values(S).flatMap((sess) => sess.exercises.filter((e) => e.metric === 'run').map((e) => e.name))
);

export const STATION_NAME_TO_KEY = new Map(
  Object.values(S).flatMap((sess) =>
    sess.exercises.filter((e) => e.metric === 'station').map((e) => [e.name, e.stationKey])
  )
);

/* ------------------------------------------------------------------ */
/* Weekly templates                                                     */
/* ------------------------------------------------------------------ */

const BJJ = (day, label = 'BJJ', attachedId = null) => ({ day, type: 'bjj', label, sessionId: null, attachedId });
const REST = (day, label = 'Rest', attachedId = null) => ({ day, type: 'rest', label, sessionId: null, attachedId });
const RECOVERY = (day, attachedId = null, label = 'Rec') => ({ day, type: 'recovery', label, sessionId: null, attachedId });
const DO = (day, sessionId, label) => ({ day, type: S[sessionId].kind === 'strength' ? 'gym' : S[sessionId].kind, label, sessionId, attachedId: null });

/**
 * The seven days for a given plan week. Templates vary by phase, and a few
 * details vary within a phase (fortnightly interval Wednesdays in Base, the
 * every-third-week long simulation in Build, race week in Taper), so this is a
 * function rather than a static lookup.
 */
export function getWeekTemplate(week) {
  // BASE — weeks 1–6
  if (week <= 6) {
    // Weeks 3 and 5 swap the technique circuit for controlled 400s.
    const wednesday = week === 3 || week === 5 ? 'base-intervals' : 'base-technique';
    // One pure running session a week, always easy — Wednesday already
    // carries the week's quality running, and a base phase should be
    // overwhelmingly easy. Week 1 sets the baseline instead.
    const sundayRun = week === 1 ? 'base-run-baseline' : 'base-run-easy';
    return [
      DO('Monday', 'base-strength-a', 'Lift'),
      BJJ('Tuesday'),
      DO('Wednesday', wednesday, week === 3 || week === 5 ? '400s' : 'Circuit'),
      BJJ('Thursday'),
      DO('Friday', 'base-strength-b', 'Lift'),
      BJJ('Saturday'),
      RECOVERY('Sunday', sundayRun, 'Rec+run'),
    ];
  }

  // BUILD — weeks 7–12
  if (week <= 12) {
    // Every third week extends toward race volume; otherwise the station set
    // alternates so all 8 get hit across the fortnight.
    const wednesday = week === 9 || week === 12
      ? 'build-sim-long'
      : week % 2 === 1 ? 'build-sim-a' : 'build-sim-b';
    return [
      DO('Monday', 'build-strength', 'Lift'),
      BJJ('Tuesday'),
      DO('Wednesday', wednesday, week === 9 || week === 12 ? 'Sim+' : 'Sim'),
      BJJ('Thursday', 'BJJ+run', 'build-run-tempo'),
      DO('Friday', 'build-station-endurance', 'Stns'),
      BJJ('Saturday'),
      RECOVERY('Sunday', week <= 8 ? 'build-zone2-short' : 'build-zone2', 'Rec+Z2'),
    ];
  }

  // PEAK — weeks 13–15. BJJ drops to Tue/Sat, freeing Thursday.
  if (week <= 15) {
    const wednesday = week === 13 ? 'peak-sim-half' : 'peak-sim-full';
    return [
      DO('Monday', 'peak-strength', 'Lift'),
      BJJ('Tuesday'),
      DO('Wednesday', wednesday, week === 13 ? 'Sim ×4' : 'Sim ×8'),
      DO('Thursday', 'peak-compromised', 'Int'),
      REST('Friday', 'Rest', 'mobility-only'),
      BJJ('Saturday'),
      RECOVERY('Sunday', null, 'Rec'),
    ];
  }

  // TAPER week 16 — volume down ~40%.
  if (week === 16) {
    return [
      DO('Monday', 'taper-strength', 'Lift'),
      BJJ('Tuesday', 'BJJ light'),
      DO('Wednesday', 'taper-sharpener', 'Sharp'),
      DO('Thursday', 'taper-run-easy', 'Run'),
      REST('Friday', 'Rest', 'mobility-only'),
      BJJ('Saturday', 'BJJ light'),
      RECOVERY('Sunday', null, 'Rec'),
    ];
  }

  // TAPER week 17 — race week.
  return [
    DO('Monday', 'race-week-technique', 'Tech'),
    DO('Tuesday', 'race-week-technique-2', 'Tech'),
    DO('Wednesday', 'race-week-opener', 'Open'),
    REST('Thursday', 'Rest', 'mobility-only'),
    REST('Friday', 'Rest'),
    REST('Saturday', 'Rest', 'race-week-shakeout'),
    { day: 'Sunday', type: 'race', label: 'RACE', sessionId: null, attachedId: null },
  ];
}

/** Copy for the non-session day cards, so Home stays presentational. */
export const DAY_CARD_COPY = {
  bjj: { title: 'BJJ day', body: 'Technique focus. Your BJJ is part of the engine for this plan, not a competing demand.' },
  rest: { title: 'Rest day', body: 'Genuinely rest. Light mobility only if you want it.' },
  recovery: { title: 'Recovery day', body: 'Mobility + sauna as usual — see the Recovery tab.' },
  race: { title: 'Race day', body: 'Eight rounds, controlled and sustainable throughout. Use your partner, split sensibly, and enjoy it.' },
};
