import { describe, it, expect } from 'vitest';
import { epley, round2_5, workingWeight, bestEstimated1RM } from './oneRM';

describe('epley', () => {
  it('returns weight directly for a 1-rep set', () => {
    expect(epley(100, 1)).toBe(100);
  });

  it('calculates 1RM estimate for multi-rep sets', () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 1);
  });
});

describe('round2_5', () => {
  it('rounds down when below midpoint', () => {
    expect(round2_5(101)).toBe(100);   // 101/2.5 = 40.4 → 40 * 2.5 = 100
    expect(round2_5(101.2)).toBe(100); // 40.48 → 40
  });

  it('rounds up when above midpoint', () => {
    expect(round2_5(101.3)).toBe(102.5); // 40.52 → 41 * 2.5 = 102.5
    expect(round2_5(101.25)).toBe(102.5); // 40.5 → 41
  });

  it('returns exact multiples of 2.5 unchanged', () => {
    expect(round2_5(100)).toBe(100);
    expect(round2_5(102.5)).toBe(102.5);
  });
});

describe('workingWeight', () => {
  it('calculates percentage of 1RM rounded to 2.5', () => {
    expect(workingWeight(100, 80)).toBe(80);
    expect(workingWeight(100, 75)).toBe(75);
  });

  it('rounds result to nearest 2.5 kg', () => {
    // 130 * 0.80 = 104 → rounds to 105
    expect(workingWeight(130, 80)).toBe(105);
  });
});

describe('bestEstimated1RM', () => {
  it('returns null for an empty set list', () => {
    expect(bestEstimated1RM([])).toBeNull();
  });

  it('returns null when all sets have weight 0', () => {
    expect(bestEstimated1RM([{ weight: 0, reps: 5 }])).toBeNull();
  });

  it('returns null when all sets exceed 10 reps', () => {
    expect(bestEstimated1RM([{ weight: 100, reps: 12 }, { weight: 80, reps: 15 }])).toBeNull();
  });

  it('ignores sets with reps > 10', () => {
    const result = bestEstimated1RM([
      { weight: 100, reps: 5 },
      { weight: 80, reps: 12 },
    ]);
    // Only the 5-rep set should be used
    expect(result).toBeCloseTo(epley(100, 5), 1);
  });

  it('returns the highest estimated 1RM across multiple sets', () => {
    const result = bestEstimated1RM([
      { weight: 90, reps: 5 },
      { weight: 100, reps: 3 },
    ]);
    const expected = Math.max(epley(90, 5), epley(100, 3));
    expect(result).toBeCloseTo(expected, 1);
  });

  it('handles a single 1-rep set correctly', () => {
    expect(bestEstimated1RM([{ weight: 150, reps: 1 }])).toBe(150);
  });
});
