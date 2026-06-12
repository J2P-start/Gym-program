import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blockPercent, blockWeight, weekStart, trainingWeek, DELOAD_PERCENT } from './progression';

vi.mock('./storage', () => ({
  getLogs: vi.fn(),
  getBlock: vi.fn(),
}));

import { getLogs, getBlock } from './storage';

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

describe('weekStart', () => {
  it('returns the Monday of the week', () => {
    expect(weekStart('2026-06-12')).toBe('2026-06-08'); // Friday → Monday
    expect(weekStart('2026-06-08')).toBe('2026-06-08'); // Monday → itself
    expect(weekStart('2026-06-14')).toBe('2026-06-08'); // Sunday → previous Monday
  });
});

describe('trainingWeek', () => {
  // 2026-06-08 is a Monday; "today" is Friday 2026-06-12 unless stated.
  const log = (date, isDeload = false) => ({ date, isDeload });

  beforeEach(() => {
    getBlock.mockReturnValue({ week: 1, startDate: '2026-05-18', lastDeloadDate: null });
  });

  it('is week 1 with no sessions logged', () => {
    getLogs.mockReturnValue([]);
    expect(trainingWeek('user', '2026-06-12')).toBe(1);
  });

  it('stays week 1 for every session within the first week', () => {
    getLogs.mockReturnValue([log('2026-06-08'), log('2026-06-10')]);
    expect(trainingWeek('user', '2026-06-12')).toBe(1);
  });

  it('advances to week 2 once a prior week was trained', () => {
    getLogs.mockReturnValue([log('2026-06-01'), log('2026-06-03'), log('2026-06-05')]);
    expect(trainingWeek('user', '2026-06-12')).toBe(2);
  });

  it('does not advance across missed weeks', () => {
    // Trained the weeks of May 18 and May 25, missed two weeks, back June 12
    getLogs.mockReturnValue([log('2026-05-18'), log('2026-05-20'), log('2026-05-27')]);
    expect(trainingWeek('user', '2026-06-12')).toBe(3);
  });

  it('ignores deload sessions and sessions before the block start', () => {
    getLogs.mockReturnValue([
      log('2026-05-11'),       // before startDate — previous block
      log('2026-05-20', true), // deload
      log('2026-06-01'),
    ]);
    expect(trainingWeek('user', '2026-06-12')).toBe(2);
  });

  it('counts all weeks when the block has no startDate', () => {
    getBlock.mockReturnValue({ week: 1, startDate: null, lastDeloadDate: null });
    getLogs.mockReturnValue([log('2026-05-25'), log('2026-06-01')]);
    expect(trainingWeek('user', '2026-06-12')).toBe(3);
  });
});
