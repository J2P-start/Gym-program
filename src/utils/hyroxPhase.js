import { PHASES, TOTAL_WEEKS, DEFAULT_HYROX } from '../data/hyrox';

/**
 * Parse a YYYY-MM-DD string as a local-midnight date, or Invalid Date.
 *
 * Years under 100 are rejected rather than parsed: `new Date(2, 11, 6)` maps to
 * 1902, so a half-typed year in a date field would otherwise resolve to a real
 * but absurd date instead of failing.
 */
export function parseDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!(y >= 100)) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/**
 * The configured race day, or null when none is set.
 *
 * Everything date-driven goes through this so an empty or malformed race date
 * means the same thing everywhere. An empty string is the routine value from a
 * cleared `<input type="date">`, and `??` does not catch it — so this is a
 * truthiness check, not a nullish one.
 */
export function raceDateOf(config = DEFAULT_HYROX) {
  // ?? not || on purpose: a missing key means "not configured yet" and takes
  // the default, but an empty string means the user cleared the field and must
  // not silently resurrect a date they never chose.
  const raw = config?.raceDate ?? DEFAULT_HYROX.raceDate;
  if (!raw) return null;
  const race = parseDate(raw);
  return isNaN(race.getTime()) ? null : race;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Rounded, not floored: across a spring-forward the gap between two local
// midnights is 23 hours short of a whole number of days, and flooring would
// report every week in the plan as rolling over a day late.
function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

/**
 * Monday of plan week 1, derived from race day.
 *
 * Race day is the one fixed point in all of this, so the plan positions itself
 * against it: week 17 is race week, and week 1 starts sixteen weeks before that
 * Monday. Deriving the start rather than storing it separately means the two
 * can't drift apart — which they silently did when both were editable, leaving
 * the schedule marching to one date while the countdown showed another.
 */
export function planStartFor(config = DEFAULT_HYROX) {
  const race = raceDateOf(config);
  if (!race) return null;
  const start = new Date(race);
  start.setDate(race.getDate() - ((race.getDay() + 6) % 7) - (TOTAL_WEEKS - 1) * 7);
  return start;
}

/**
 * Which plan week we're in, 1–17.
 *
 * Derived from race day unless the user has set a manual override in Settings —
 * real life shifts weeks around, and forcing the calendar to be right is worse
 * than letting them say where they actually are.
 *
 * Clamping does useful work at both ends: a race far enough out that week 1
 * hasn't started yet holds at week 1, and a race close enough that the plan
 * can't fit drops you in partway, where you'd actually be.
 */
export function currentPlanWeek(config = DEFAULT_HYROX, today = new Date()) {
  if (config?.weekOverride) {
    return clampWeek(config.weekOverride);
  }
  const start = planStartFor(config);
  if (!start) return 1;
  return clampWeek(Math.floor(daysBetween(start, today) / 7) + 1);
}

export function clampWeek(week) {
  const n = Number(week);
  if (isNaN(n)) return 1;
  return Math.min(TOTAL_WEEKS, Math.max(1, Math.round(n)));
}

/** The phase a given plan week falls in. */
export function phaseForWeek(week) {
  const w = clampWeek(week);
  return PHASES.find((p) => w >= p.firstWeek && w <= p.lastWeek) ?? PHASES[0];
}

/** Which week of its own phase this is, e.g. week 8 is week 2 of Build. */
export function weekWithinPhase(week) {
  const phase = phaseForWeek(week);
  return clampWeek(week) - phase.firstWeek + 1;
}

/** Days until race day. Negative once the race has been and gone. */
export function daysUntilRace(config = DEFAULT_HYROX, today = new Date()) {
  const race = raceDateOf(config);
  return race ? daysBetween(today, race) : null;
}

/** Monday-based date for day `index` (0=Mon) of a given plan week. */
export function dateForPlanDay(config, week, index) {
  const start = planStartFor(config);
  if (!start) return null;
  const d = new Date(start);
  d.setDate(start.getDate() + (clampWeek(week) - 1) * 7 + index);
  return d;
}
