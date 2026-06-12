import { round2_5 } from './oneRM';
import { getLogs, getBlock } from './storage';

export const DELOAD_PERCENT = 60;

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Monday of the week containing a YYYY-MM-DD date, as YYYY-MM-DD */
export function weekStart(dateStr) {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDateStr(d);
}

/**
 * Current week of the training block, counted from weeks actually trained:
 * 1 + the number of distinct past calendar weeks (Mon–Sun) containing at
 * least one non-deload session since the block started. The current week
 * never counts itself, so every session within a week shares one percentage,
 * and weeks with no training don't advance the ramp.
 */
export function trainingWeek(username, todayStr = localDateStr()) {
  const { startDate } = getBlock(username);
  const thisWeek = weekStart(todayStr);
  const pastWeeks = new Set(
    getLogs(username)
      .filter((l) => !l.isDeload && (!startDate || l.date >= startDate))
      .map((l) => weekStart(l.date))
      .filter((w) => w < thisWeek)
  );
  return pastWeeks.size + 1;
}

/**
 * Percentage of 1RM for a percent-loaded exercise in a given block week.
 *
 * Ramps from percentRange[0] by +2.5 percentage points every 2 weeks,
 * capped at percentRange[1], so e.g. [80, 85] runs:
 *   weeks 1–2 → 80%, weeks 3–4 → 82.5%, week 5+ → 85%
 * A flat range like [70, 70] stays constant. Deload sessions are always 60%.
 * The deload reset (block.week → 1) restarts the wave from the low end.
 */
export function blockPercent(percentRange, week, isDeload = false) {
  if (isDeload) return DELOAD_PERCENT;
  const [low, high] = percentRange;
  const ramp = Math.floor((Math.max(1, week) - 1) / 2) * 2.5;
  return Math.min(low + ramp, high);
}

/** Suggested working weight for an exercise in a given block week. */
export function blockWeight(oneRM, percentRange, week, isDeload = false) {
  return round2_5(oneRM * (blockPercent(percentRange, week, isDeload) / 100));
}
