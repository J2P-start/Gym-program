import { describe, it, expect } from 'vitest';
import { blockPercent, blockWeight, DELOAD_PERCENT } from './progression';

describe('blockPercent', () => {
  it('uses the low end of the range in weeks 1 and 2', () => {
    expect(blockPercent([80, 85], 1)).toBe(80);
    expect(blockPercent([80, 85], 2)).toBe(80);
  });

  it('steps up 2.5 points every 2 weeks', () => {
    expect(blockPercent([80, 85], 3)).toBe(82.5);
    expect(blockPercent([80, 85], 4)).toBe(82.5);
    expect(blockPercent([80, 85], 5)).toBe(85);
  });

  it('caps at the high end of the range', () => {
    expect(blockPercent([80, 85], 6)).toBe(85);
    expect(blockPercent([80, 85], 7)).toBe(85);
    expect(blockPercent([80, 85], 12)).toBe(85);
  });

  it('keeps a flat range constant across the block', () => {
    expect(blockPercent([70, 70], 1)).toBe(70);
    expect(blockPercent([70, 70], 4)).toBe(70);
    expect(blockPercent([70, 70], 7)).toBe(70);
  });

  it('ramps a wider range over more weeks', () => {
    expect(blockPercent([75, 80], 1)).toBe(75);
    expect(blockPercent([75, 80], 3)).toBe(77.5);
    expect(blockPercent([75, 80], 5)).toBe(80);
  });

  it('always returns 60% on deload regardless of week or range', () => {
    expect(blockPercent([80, 85], 1, true)).toBe(DELOAD_PERCENT);
    expect(blockPercent([80, 85], 5, true)).toBe(DELOAD_PERCENT);
    expect(blockPercent([70, 70], 3, true)).toBe(DELOAD_PERCENT);
  });

  it('treats missing or invalid week as week 1', () => {
    expect(blockPercent([80, 85], 0)).toBe(80);
    expect(blockPercent([80, 85], -3)).toBe(80);
  });
});

describe('blockWeight', () => {
  it('derives weight from the ramped percentage, rounded to 2.5 kg', () => {
    // 1RM 130: week 1 → 80% = 104 → 105; week 3 → 82.5% = 107.25 → 107.5
    expect(blockWeight(130, [80, 85], 1)).toBe(105);
    expect(blockWeight(130, [80, 85], 3)).toBe(107.5);
    expect(blockWeight(130, [80, 85], 5)).toBe(110);
  });

  it('uses 60% on deload', () => {
    expect(blockWeight(130, [80, 85], 5, true)).toBe(77.5); // 130 * 0.6 = 78 → 77.5
  });
});
