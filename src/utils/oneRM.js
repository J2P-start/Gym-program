/** Epley formula: weight × (1 + reps/30) */
export function epley(weight, reps) {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Round to nearest 2.5 kg */
export function round2_5(kg) {
  return Math.round(kg / 2.5) * 2.5;
}

/** Calculate working weight from 1RM and percentage (0–100) */
export function workingWeight(oneRM, pct) {
  return round2_5(oneRM * (pct / 100));
}

/**
 * Given a list of { weight, reps } sets, return the best estimated 1RM.
 * Only uses sets where reps <= 10 for accuracy.
 */
export function bestEstimated1RM(sets) {
  let best = 0;
  for (const s of sets) {
    if (s.weight > 0 && s.reps > 0 && s.reps <= 10) {
      const est = epley(s.weight, s.reps);
      if (est > best) best = est;
    }
  }
  return best > 0 ? Math.round(best * 10) / 10 : null;
}
