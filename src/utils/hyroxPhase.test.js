import { describe, it, expect } from 'vitest';
import { currentPlanWeek, phaseForWeek, weekWithinPhase, daysUntilRace, clampWeek, planStartFor, dateForPlanDay } from './hyroxPhase';
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

describe('planStartFor', () => {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  it('puts week 1 sixteen weeks before race week, so week 17 is race week', () => {
    // Race Sun 6 Dec 2026 → race week starts Mon 30 Nov → week 1 starts Mon 10 Aug.
    expect(iso(planStartFor({ raceDate: '2026-12-06' }))).toBe('2026-08-10');
  });

  it('always lands on a Monday, whatever day the race falls on', () => {
    // Seven consecutive dates, so every weekday is genuinely covered.
    for (const raceDate of ['2027-01-18', '2027-01-19', '2027-01-20', '2027-01-21',
                            '2027-01-22', '2027-01-23', '2027-01-24']) {
      expect(planStartFor({ raceDate }).getDay(), raceDate).toBe(1);
    }
  });

  it('puts race day inside week 17 for every weekday a race could fall on', () => {
    for (const raceDate of ['2027-01-18', '2027-01-19', '2027-01-20', '2027-01-21',
                            '2027-01-22', '2027-01-23', '2027-01-24']) {
      const [y, m, d] = raceDate.split('-').map(Number);
      expect(currentPlanWeek({ raceDate }, new Date(y, m - 1, d)), raceDate).toBe(17);
    }
  });

  it('anchors a Saturday and Sunday race in the same week to the same start', () => {
    // Both fall in the week beginning Mon 18 Jan 2027, so both are race week.
    expect(iso(planStartFor({ raceDate: '2027-01-23' })))
      .toBe(iso(planStartFor({ raceDate: '2027-01-24' })));
  });

  it('moves the whole plan when the race moves', () => {
    const dec = planStartFor({ raceDate: '2026-12-06' });
    const jan = planStartFor({ raceDate: '2027-01-17' });
    expect(Math.round((jan - dec) / (7 * 86400000))).toBe(6);   // race moved 6 weeks, plan moved 6 weeks
  });

  it('takes the default only when no race date has been set at all', () => {
    expect(iso(planStartFor({}))).toBe('2026-08-10');
  });

  it('returns null for a malformed race date rather than a plausible wrong one', () => {
    // Silently resolving to the default would march the schedule to a date the
    // user never picked, which is the failure this whole change exists to stop.
    expect(planStartFor({ raceDate: 'nonsense' })).toBeNull();
    expect(planStartFor({ raceDate: '2026-13' })).toBeNull();
  });
});

describe('race date drives the schedule', () => {
  const on = (isoStr) => { const [y, m, d] = isoStr.split('-').map(Number); return new Date(y, m - 1, d); };

  it('holds at week 1 when the race is further out than the plan is long', () => {
    // 17 Jan 2027 race, asked in Aug 2026: week 1 has not started yet.
    expect(currentPlanWeek({ raceDate: '2027-01-17' }, on('2026-08-17'))).toBe(1);
  });

  it('drops you in partway when the race is closer than the plan is long', () => {
    // Race 8 weeks out lands you in Build, not back at week 1 with no time left.
    expect(currentPlanWeek({ raceDate: '2026-10-11' }, on('2026-08-17'))).toBe(10);
  });

  it('still puts race week at 17 after the race date changes', () => {
    expect(currentPlanWeek({ raceDate: '2027-01-17' }, on('2027-01-17'))).toBe(17);
    expect(currentPlanWeek({ raceDate: '2027-01-17' }, on('2027-01-11'))).toBe(17);
    expect(currentPlanWeek({ raceDate: '2027-01-17' }, on('2027-01-10'))).toBe(16);
  });
});

describe('race date is the only anchor', () => {
  const on = (isoStr) => { const [y, m, d] = isoStr.split('-').map(Number); return new Date(y, m - 1, d); };

  it('ignores a stale stored planStartDate', () => {
    // The whole point of the change: plan start is derived, never read from
    // config. A leftover value from the old two-field shape must not win.
    const week = currentPlanWeek({ raceDate: '2026-12-06', planStartDate: '2026-06-01' }, on('2026-08-17'));
    expect(week).toBe(currentPlanWeek({ raceDate: '2026-12-06' }, on('2026-08-17')));
    expect(week).toBe(2);
  });

  it('treats an empty race date as no race date, consistently', () => {
    // '' is what a cleared <input type="date"> yields, and `??` would miss it.
    // Schedule and countdown must agree that there is nothing set.
    expect(planStartFor({ raceDate: '' })).toBeNull();
    expect(daysUntilRace({ raceDate: '' }, on('2026-08-17'))).toBeNull();
    expect(currentPlanWeek({ raceDate: '' }, on('2026-08-17'))).toBe(1);
    expect(dateForPlanDay({ raceDate: '' }, 1, 0)).toBeNull();
  });

  it('rejects a half-typed year rather than resolving it to the 1900s', () => {
    // new Date(2, 11, 6) is 1902-12-06, which would look like a valid plan.
    expect(planStartFor({ raceDate: '0002-12-06' })).toBeNull();
    expect(daysUntilRace({ raceDate: '0002-12-06' }, on('2026-08-17'))).toBeNull();
  });

  it('counts whole days across a spring-forward without losing one', () => {
    // UK clocks go forward on 2027-03-28. Weeks after it must not roll late.
    const race = { raceDate: '2027-05-30' };
    const start = planStartFor(race);
    expect(start.getDay()).toBe(1);
    // The Monday of week 10 must report week 10, not week 9.
    const wk10 = new Date(start);
    wk10.setDate(start.getDate() + 9 * 7);
    expect(currentPlanWeek(race, wk10)).toBe(10);
  });
});

describe('dateForPlanDay', () => {
  it('returns the Monday-based date for a given plan week and day index', () => {
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cfg = { raceDate: '2026-12-06' };   // week 1 starts Mon 10 Aug 2026
    expect(iso(dateForPlanDay(cfg, 1, 0))).toBe('2026-08-10');   // week 1 Monday
    expect(iso(dateForPlanDay(cfg, 1, 6))).toBe('2026-08-16');   // week 1 Sunday
    expect(iso(dateForPlanDay(cfg, 2, 0))).toBe('2026-08-17');   // week 2 Monday
    expect(iso(dateForPlanDay(cfg, 17, 6))).toBe('2026-12-06');  // race day
  });
});
