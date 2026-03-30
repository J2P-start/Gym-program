export const TRACKED_LIFTS = [
  'Back squat',
  'Romanian deadlift',
  'Barbell bench press',
  'Trap bar deadlift',
  'Barbell hip thrust',
  'Power clean / hang clean',
];

// loadType: 'percent' | 'bodyweight' | 'note'
// percentRange: [low, high] — working weight uses low end; high shown for context
// isLower: used for progression increment (5kg lower, 2.5kg upper)

export const SESSIONS = [
  {
    day: 'Monday',
    name: 'Push & Legs',
    duration: '~60 min',
    note: 'Low grip fatigue before Tuesday BJJ. Leg drive for takedowns and hip escapes.',
    exercises: [
      { name: 'Back squat',          sets: 4, reps: 4,          repLabel: '4',           loadType: 'percent', percentRange: [80, 85], restSeconds: 180, isLower: true },
      { name: 'Romanian deadlift',   sets: 3, reps: 8,          repLabel: '8',           loadType: 'percent', percentRange: [70, 70], restSeconds: 120, isLower: true },
      { name: 'Barbell bench press', sets: 4, reps: 5,          repLabel: '5',           loadType: 'percent', percentRange: [75, 80], restSeconds: 150, isLower: false },
      { name: 'Landmine press',      sets: 3, reps: 10,         repLabel: '10 each side', loadType: 'note',    note: 'Moderate-heavy',       restSeconds: 90,  isLower: false },
      { name: 'Ab wheel rollout',    sets: 3, reps: 10,         repLabel: '10',           loadType: 'bodyweight',                              restSeconds: 60 },
      { name: 'Pallof press',        sets: 3, reps: 12,         repLabel: '12 each side', loadType: 'note',    note: 'Light-moderate',       restSeconds: 60 },
    ],
  },
  {
    day: 'Wednesday',
    name: 'Pull & Posterior Chain',
    duration: '~65 min',
    note: 'Most BJJ-relevant session. Grip strength, pulling power, posterior chain.',
    exercises: [
      { name: 'Trap bar deadlift',        sets: 4, reps: 4,  repLabel: '4',           loadType: 'percent',    percentRange: [80, 85], restSeconds: 180, isLower: true },
      { name: 'Weighted pull-ups',        sets: 4, reps: 6,  repLabel: '5–6',          loadType: 'added',      addedNote: '+10–20 kg added weight', restSeconds: 150 },
      { name: 'Chest-supported DB row',   sets: 3, reps: 10, repLabel: '10 each side', loadType: 'note',       note: 'Moderate-heavy', restSeconds: 90 },
      { name: 'Barbell hip thrust',       sets: 3, reps: 8,  repLabel: '8',            loadType: 'percent',    percentRange: [75, 75], restSeconds: 120, isLower: true },
      { name: 'Gi / towel pull-up',       sets: 3, reps: null, repLabel: 'Max (aim 6–10)', loadType: 'bodyweight',                        restSeconds: 120 },
      { name: 'Dead hang',                sets: 3, reps: null, repLabel: '30–45 sec hold', loadType: 'bodyweight',                        restSeconds: 60 },
    ],
  },
  {
    day: 'Friday',
    name: 'Athletic & Power',
    duration: '~55 min',
    note: "Explosive. Kept shorter — don't bury yourself before Saturday BJJ.",
    exercises: [
      { name: 'Power clean / hang clean', sets: 4, reps: 3,  repLabel: '3',               loadType: 'percent',    percentRange: [70, 70], restSeconds: 150, isLower: false },
      { name: 'Box jump',                 sets: 3, reps: 5,  repLabel: '5',               loadType: 'bodyweight',                          restSeconds: 90 },
      { name: 'Farmers carry',            sets: 4, reps: null, repLabel: '40 m',           loadType: 'note',       note: 'Heavy — log weight used', restSeconds: 90 },
      { name: 'Single-leg RDL',           sets: 3, reps: 8,  repLabel: '8 each side',     loadType: 'note',       note: 'Moderate', restSeconds: 90 },
      { name: 'Battle rope / rowing 500m',sets: 4, reps: null, repLabel: '30 sec on/off',  loadType: 'note',       note: 'Max effort — rest built in', restSeconds: 0 },
      { name: 'Dragon flag / L-sit',      sets: 3, reps: null, repLabel: 'Max hold or 5',  loadType: 'bodyweight',                          restSeconds: 90 },
    ],
  },
];

export const RECOVERY_DAY = {
  day: 'Sunday',
  name: 'Recovery',
  mobility: [
    'Hip 90/90',
    "World's greatest stretch",
    'Thoracic rotations',
    'Shoulder CARs',
    'Couch stretch',
  ],
  sauna: '2–3 rounds of 7–10 min, 3–5 min cool-down between. Target 80–90°C.',
  cold: '3–5 min cold shower or plunge post-sauna (optional)',
  nutrition: 'High protein, carbs to replenish glycogen, electrolytes, magnesium glycinate in the evening.',
};

export const WEEK_SCHEDULE = [
  { day: 'Monday',    type: 'gym',      sessionIndex: 0 },
  { day: 'Tuesday',   type: 'bjj',      sessionIndex: null },
  { day: 'Wednesday', type: 'gym',      sessionIndex: 1 },
  { day: 'Thursday',  type: 'bjj',      sessionIndex: null },
  { day: 'Friday',    type: 'gym',      sessionIndex: 2 },
  { day: 'Saturday',  type: 'bjj',      sessionIndex: null },
  { day: 'Sunday',    type: 'recovery', sessionIndex: null },
];
