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

const TODAY = new Date().toISOString().slice(0, 10);
const baseBlock = { week: 1, startDate: TODAY, lastDeloadDate: null };

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

  it('sorts by date before comparing — out-of-order logs do not false-positive', () => {
    // Inserted newest-first (out of order), but sorted oldest-first the trend is flat
    getLogs.mockReturnValue([
      makeSession(140, 2, '2026-03-07'),
      makeSession(140, 2, '2026-02-28'),
      makeSession(140, 2, '2026-02-21'),
    ]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(false);
  });

  it('reports multiple stalled lifts when both decline', () => {
    vi.doMock('../data/workout', () => ({ TRACKED_LIFTS: ['Back squat', 'Bench press'] }));
    // Use separate sessions with both lifts
    const session = (s, b) => ({
      date: '2026-01-01',
      isDeload: false,
      fatigueRating: 2,
      exercises: [
        { name: 'Back squat', estimatedOneRM: s, sets: [] },
        { name: 'Bench press', estimatedOneRM: b, sets: [] },
      ],
    });
    getLogs.mockReturnValue([session(140, 100), session(135, 95), session(130, 90)]);
    const result = checkDeload('user');
    // At minimum the first stall is caught (mocked TRACKED_LIFTS may only have squat)
    expect(result.triggered).toBe(true);
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

  it('does not flag with 0 sessions', () => {
    getLogs.mockReturnValue([]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(false);
  });

  it('does not flag with 1 high-fatigue session', () => {
    getLogs.mockReturnValue([makeSession(140, 5)]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(false);
  });

  it('flags both fatigue and stall simultaneously when both are present', () => {
    getLogs.mockReturnValue([
      makeSession(140, 4, '2026-01-01'),
      makeSession(135, 4, '2026-01-08'),
      makeSession(130, 4, '2026-01-15'),
    ]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(true);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    expect(result.reasons.some((r) => /fatigue/i.test(r))).toBe(true);
    expect(result.reasons.some((r) => /stalled/i.test(r))).toBe(true);
  });
});

describe('7-week hard cap', () => {
  it('flags when block week reaches 7 with no deload date (startDate used)', () => {
    // startDate 50 days ago → over 49-day cap
    const startDate = new Date(Date.now() - 50 * 86400000).toISOString().slice(0, 10);
    getBlock.mockReturnValue({ week: 1, startDate, lastDeloadDate: null });
    getLogs.mockReturnValue([]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(true);
    expect(result.reasons[0]).toMatch(/7 weeks/);
  });

  it('does not flag when startDate is 48 days ago', () => {
    const startDate = new Date(Date.now() - 48 * 86400000).toISOString().slice(0, 10);
    getBlock.mockReturnValue({ week: 6, startDate, lastDeloadDate: null });
    getLogs.mockReturnValue([]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(false);
  });

  it('flags when lastDeloadDate is 49+ days ago', () => {
    const lastDeloadDate = new Date(Date.now() - 50 * 86400000).toISOString().slice(0, 10);
    getBlock.mockReturnValue({ week: 1, startDate: '2026-01-01', lastDeloadDate });
    getLogs.mockReturnValue([]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(true);
    expect(result.reasons[0]).toMatch(/7 weeks/);
  });

  it('does not flag when lastDeloadDate is 48 days ago', () => {
    const lastDeloadDate = new Date(Date.now() - 48 * 86400000).toISOString().slice(0, 10);
    getBlock.mockReturnValue({ week: 1, startDate: '2026-01-01', lastDeloadDate });
    getLogs.mockReturnValue([]);
    const result = checkDeload('user');
    expect(result.triggered).toBe(false);
  });
});
