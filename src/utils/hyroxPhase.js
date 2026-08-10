import { PHASES, TOTAL_WEEKS, DEFAULT_HYROX } from '../data/hyrox';

/** Parse a YYYY-MM-DD string as a local-midnight date. */
export function parseDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from, to) {
  return Math.floor((startOfDay(to) - startOfDay(from)) / 86400000);
}

/**
 * Which plan week we're in, 1–17.
 *
 * Derived from the plan start date unless the user has set a manual override in
 * Settings — real life shifts weeks around, and forcing the calendar to be
 * right is worse than letting them say where they actually are.
 */
export function currentPlanWeek(config = DEFAULT_HYROX, today = new Date()) {
  if (config?.weekOverride) {
    return clampWeek(config.weekOverride);
  }
  const start = parseDate(config?.planStartDate ?? DEFAULT_HYROX.planStartDate);
  if (isNaN(start.getTime())) return 1;
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
  const race = parseDate(config?.raceDate ?? DEFAULT_HYROX.raceDate);
  if (isNaN(race.getTime())) return null;
  return daysBetween(today, race);
}

/** Monday-based date for day `index` (0=Mon) of a given plan week. */
export function dateForPlanDay(config, week, index) {
  const start = parseDate(config?.planStartDate ?? DEFAULT_HYROX.planStartDate);
  if (isNaN(start.getTime())) return null;
  const d = new Date(start);
  d.setDate(start.getDate() + (clampWeek(week) - 1) * 7 + index);
  return d;
}
