import { round2_5 } from './oneRM';

export const DELOAD_PERCENT = 60;

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
