import { describe, it, expect } from 'vitest';
import { warmupSets, BAR_WEIGHT } from './warmup';

describe('warmupSets', () => {
  it('builds a full bar → 40 → 60 → 80% ramp for a heavy working weight', () => {
    expect(warmupSets(110)).toEqual([
      { label: 'Bar', weight: BAR_WEIGHT, reps: 10 },
      { label: '40%', weight: 45, reps: 8 },   // 44 → 45
      { label: '60%', weight: 65, reps: 5 },   // 66 → 65
      { label: '80%', weight: 87.5, reps: 3 }, // 88 → 87.5
    ]);
  });

  it('drops ramp steps that round down to the bar weight', () => {
    // 40% of 50 = 20 → equal to bar, skipped
    expect(warmupSets(50)).toEqual([
      { label: 'Bar', weight: BAR_WEIGHT, reps: 10 },
      { label: '60%', weight: 30, reps: 5 },
      { label: '80%', weight: 40, reps: 3 },
    ]);
  });

  it('drops ramp steps that reach the working weight', () => {
    // 80% of 25 = 20 ≤ bar; 60% = 15 ≤ bar; 40% = 10 ≤ bar — bar only
    expect(warmupSets(25)).toEqual([{ label: 'Bar', weight: BAR_WEIGHT, reps: 10 }]);
  });

  it('dedupes steps that round to the same weight', () => {
    const sets = warmupSets(35); // 60% = 21 → 20 (skip ≤ bar), 80% = 28 → 27.5
    const weights = sets.map((s) => s.weight);
    expect(new Set(weights).size).toBe(weights.length);
  });

  it('returns no sets when the working weight is missing or below the bar', () => {
    expect(warmupSets(null)).toEqual([]);
    expect(warmupSets(0)).toEqual([]);
    expect(warmupSets(BAR_WEIGHT)).toEqual([]);
  });
});
