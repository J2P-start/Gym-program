import { round2_5 } from './oneRM';

export const BAR_WEIGHT = 20;

/**
 * Ramp-up sets for a barbell lift: empty bar, then 40/60/80% of the working
 * weight with falling reps. Steps that round to the bar weight or to (or past)
 * the working weight are dropped, as are duplicate weights, so light working
 * weights produce a short ramp rather than nonsense.
 */
export function warmupSets(workingWeight) {
  if (!workingWeight || workingWeight <= BAR_WEIGHT) return [];
  const sets = [{ label: 'Bar', weight: BAR_WEIGHT, reps: 10 }];
  for (const { pct, reps } of [{ pct: 40, reps: 8 }, { pct: 60, reps: 5 }, { pct: 80, reps: 3 }]) {
    const w = round2_5(workingWeight * (pct / 100));
    if (w <= BAR_WEIGHT || w >= workingWeight) continue;
    if (sets.some((s) => s.weight === w)) continue;
    sets.push({ label: `${pct}%`, weight: w, reps });
  }
  return sets;
}
