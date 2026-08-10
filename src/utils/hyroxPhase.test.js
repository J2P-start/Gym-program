import { describe, it, expect } from 'vitest';
import { currentPlanWeek, phaseForWeek, weekWithinPhase, daysUntilRace, clampWeek } from './hyroxPhase';
import { DEFAULT_HYROX, TOTAL_WEEKS, PHASES } from '../data/hyrox';

const config = DEFAULT_HYROX;
const on = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

describe('currentPlanWeek', () => {
  it('is week 1 on the plan start date', () => {
    expect(currentPlanWeek(config, on('2026-08-10'))).toBe(1);
  });

  it('stays in week 1 through the Sunday of week 1', () => {
    expect(currentPlanWeek(config, on('2026-08-16'))).toBe(1);
  });

  it('rolls to week 2 on the following Monday', () => {
    expect(currentPlanWeek(config, on('2026-08-17'))).toBe(2);
  });

  it('puts race week at week 17', () => {
    expect(currentPlanWeek(config, on('2026-12-06'))).toBe(TOTAL_WEEKS);
  });

  it('clamps to week 1 before the plan starts', () => {
    expect(currentPlanWeek(config, on('2026-07-01'))).toBe(1);
  });

  it('clamps to the final week after race day', () => {
    expect(currentPlanWeek(config, on('2027-03-01'))).toBe(TOTAL_WEEKS);
  });

  it('honours a manual week override regardless of the date', () => {
    expect(currentPlanWeek({ ...config, weekOverride: 9 }, on('2026-08-10'))).toBe(9);
  });

  it('clamps an out-of-range override', () => {
    expect(currentPlanWeek({ ...config, weekOverride: 99 }, on('2026-08-10'))).toBe(TOTAL_WEEKS);
  });
});

describe('phaseForWeek', () => {
  it.each([
    [1, 'base'], [6, 'base'],
    [7, 'build'], [12, 'build'],
    [13, 'peak'], [15, 'peak'],
    [16, 'taper'], [17, 'taper'],
  ])('week %i is in the %s phase', (week, key) => {
    expect(phaseForWeek(week).key).toBe(key);
  });

  it('covers every week from 1 to 17 with exactly one phase', () => {
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      const matches = PHASES.filter((p) => w >= p.firstWeek && w <= p.lastWeek);
      expect(matches).toHaveLength(1);
    }
  });
});

describe('weekWithinPhase', () => {
  it('reports position inside the phase, not the plan', () => {
    expect(weekWithinPhase(8)).toBe(2);   // 2nd week of Build
    expect(weekWithinPhase(13)).toBe(1);  // 1st week of Peak
    expect(weekWithinPhase(17)).toBe(2);  // 2nd week of Taper
  });
});

describe('daysUntilRace', () => {
  it('counts down to race day', () => {
    expect(daysUntilRace(config, on('2026-12-01'))).toBe(5);
    expect(daysUntilRace(config, on('2026-12-06'))).toBe(0);
  });

  it('goes negative after the race', () => {
    expect(daysUntilRace(config, on('2026-12-07'))).toBe(-1);
  });
});

describe('clampWeek', () => {
  it('falls back to week 1 for junk input', () => {
    expect(clampWeek('nonsense')).toBe(1);
    expect(clampWeek(0)).toBe(1);
    expect(clampWeek(-4)).toBe(1);
  });
});
