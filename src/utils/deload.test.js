import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkDeload } from './deload';

vi.mock('./storage', () => ({
  getLogs: vi.fn(),
  getBlock: vi.fn(),
}));

vi.mock('../data/workout', () => ({
  TRACKED_LIFTS: ['Back squat'],
}));

import { getLogs, getBlock } from './storage';

const baseBlock = { week: 1, startDate: '2026-01-01', lastDeloadDate: null };

function makeSession(squat1RM, fatigue = 2, date = '2026-01-01') {
  return {
    date,
    isDeload: false,
    fatigueRating: fatigue,
    exercises: [{ name: 'Back squat', estimatedOneRM: squat1RM, sets: [] }],
  };
}

beforeEach(() => {
  getBlock.mockReturnValue(baseBlock);
});

describe('stall detection', () => {
  it('does not flag a flat 1RM (compliant training)', () => {
    getLogs.mockReturnValue([
      makeSession(140),
      makeSession(140),
      makeSession(140),
    ]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('does not flag a V-shape dip that is recovering', () => {
    getLogs.mockReturnValue([
      makeSession(140),
      makeSession(135),
      makeSession(138),
    ]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(false);
  });

  it('flags a strictly declining trend', () => {
    getLogs.mockReturnValue([
      makeSession(140),
      makeSession(135),
      makeSession(130),
    ]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(true);
    expect(result.reasons[0]).toMatch(/stalled/);
  });

  it('does not flag fewer than 3 sessions', () => {
    getLogs.mockReturnValue([
      makeSession(140),
      makeSession(135),
    ]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(false);
  });
});

describe('fatigue detection', () => {
  it('flags high fatigue in 2 of last 3 sessions', () => {
    getLogs.mockReturnValue([
      makeSession(140, 4),
      makeSession(140, 4),
      makeSession(140, 2),
    ]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(true);
    expect(result.reasons[0]).toMatch(/fatigue/i);
  });

  it('does not flag if only 1 high-fatigue session', () => {
    getLogs.mockReturnValue([
      makeSession(140, 4),
      makeSession(140, 2),
      makeSession(140, 2),
    ]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(false);
  });
});

describe('7-week hard cap', () => {
  it('flags when block week reaches 7 with no deload date', () => {
    getBlock.mockReturnValue({ week: 7, startDate: '2026-01-01', lastDeloadDate: null });
    getLogs.mockReturnValue([]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(true);
    expect(result.reasons[0]).toMatch(/7 weeks/);
  });
});
