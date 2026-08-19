import { describe, it, expect } from 'vitest';
import {
  paceSecPerKm, formatPace, weeklyRunVolume, runSessions, stationSummary, formatRate,
} from './hyroxStats';

// 'Run legs' and the station names below are real entries in the plan, so
// these fixtures exercise the same name lookups the app uses.
const runEx = (sets) => ({ name: 'Run legs', estimatedOneRM: null, sets });
const stationEx = (name, sets) => ({ name, estimatedOneRM: null, sets });
const log = (date, exercises) => ({ date, session: 'Wednesday — Test', fatigueRating: 2, isDeload: false, exercises });

describe('paceSecPerKm', () => {
  it('converts distance and time to seconds per km', () => {
    expect(paceSecPerKm(1000, 300)).toBe(300);
    expect(paceSecPerKm(500, 150)).toBe(300);
  });

  it('returns null when either side is missing', () => {
    expect(paceSecPerKm(0, 300)).toBeNull();
    expect(paceSecPerKm(1000, 0)).toBeNull();
    expect(paceSecPerKm(undefined, undefined)).toBeNull();
  });
});

describe('formatPace', () => {
  it('formats as m:ss /km', () => {
    expect(formatPace(300)).toBe('5:00 /km');
    expect(formatPace(292)).toBe('4:52 /km');
  });
  it('shows a dash when there is no pace', () => {
    expect(formatPace(null)).toBe('—');
  });
});

describe('weeklyRunVolume', () => {
  it('sums run distance into Mon–Sun weeks', () => {
    const logs = [
      log('2026-08-12', [runEx([{ distanceM: 3000, timeSec: 900 }])]), // Wed
      log('2026-08-16', [runEx([{ distanceM: 5000, timeSec: 1500 }])]), // Sun, same week
      log('2026-08-17', [runEx([{ distanceM: 4000, timeSec: 1200 }])]), // Mon, next week
    ];
    expect(weeklyRunVolume(logs)).toEqual([
      { week: '2026-08-10', km: 8 },
      { week: '2026-08-17', km: 4 },
    ]);
  });

  it('ignores station distance — a SkiErg is not a run', () => {
    const logs = [log('2026-08-12', [
      runEx([{ distanceM: 1000, timeSec: 300 }]),
      stationEx('SkiErg', [{ distanceM: 1000, timeSec: 240 }]),
      stationEx('Row', [{ distanceM: 1000, timeSec: 230 }]),
    ])];
    expect(weeklyRunVolume(logs)).toEqual([{ week: '2026-08-10', km: 1 }]);
  });

  it('returns nothing when no runs are logged', () => {
    expect(weeklyRunVolume([log('2026-08-12', [stationEx('Wall balls', [{ reps: 20, timeSec: 90 }])])])).toEqual([]);
  });
});

describe('runSessions', () => {
  it('totals distance and averages pace across a run block', () => {
    const logs = [log('2026-08-12', [runEx([
      { distanceM: 500, timeSec: 150 },
      { distanceM: 500, timeSec: 150 },
    ])])];
    const [s] = runSessions(logs);
    expect(s.distanceM).toBe(1000);
    expect(s.pace).toBe(300);
  });

  it('averages pace only over timed sets, so an untimed leg does not skew it', () => {
    const logs = [log('2026-08-12', [runEx([
      { distanceM: 1000, timeSec: 300 },
      { distanceM: 1000, timeSec: 0 },   // logged distance but forgot the watch
    ])])];
    const [s] = runSessions(logs);
    expect(s.distanceM).toBe(2000);   // full distance still counts
    expect(s.pace).toBe(300);         // pace unaffected by the untimed leg
  });

  it('leaves pace null when nothing was timed', () => {
    const logs = [log('2026-08-12', [runEx([{ distanceM: 1000, timeSec: 0 }])])];
    expect(runSessions(logs)[0].pace).toBeNull();
  });
});

describe('stationSummary', () => {
  it('covers all 8 stations even with no data', () => {
    const rows = stationSummary([]);
    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.sessions === 0)).toBe(true);
  });

  it('counts sessions and keeps the latest volume', () => {
    const logs = [
      log('2026-08-12', [stationEx('Sled push', [{ distanceM: 50, timeSec: 60 }])]),
      log('2026-08-19', [stationEx('Sled push', [{ distanceM: 50, timeSec: 55 }])]),
    ];
    const sled = stationSummary(logs).find((r) => r.key === 'sledpush');
    expect(sled.sessions).toBe(2);
    expect(sled.lastDate).toBe('2026-08-19');
    expect(sled.lastVolume).toBe(50);
  });

  it('tracks the fastest rate for distance stations (lower is better)', () => {
    const logs = [
      log('2026-08-12', [stationEx('Sled push', [{ distanceM: 50, timeSec: 60 }])]),  // 120 s/100m
      log('2026-08-19', [stationEx('Sled push', [{ distanceM: 50, timeSec: 50 }])]),  // 100 s/100m
      log('2026-08-26', [stationEx('Sled push', [{ distanceM: 50, timeSec: 70 }])]),  // slower again
    ];
    const sled = stationSummary(logs).find((r) => r.key === 'sledpush');
    expect(sled.bestRate).toBe(100);
    expect(formatRate(sled)).toBe('1:40 /100 m');
  });

  it('tracks the highest rate for rep stations (higher is better)', () => {
    const logs = [
      log('2026-08-12', [stationEx('Wall balls', [{ reps: 20, timeSec: 120 }])]), // 10 reps/min
      log('2026-08-19', [stationEx('Wall balls', [{ reps: 30, timeSec: 120 }])]), // 15 reps/min
      log('2026-08-26', [stationEx('Wall balls', [{ reps: 10, timeSec: 120 }])]), // 5 reps/min
    ];
    const wb = stationSummary(logs).find((r) => r.key === 'wallball');
    expect(wb.repBased).toBe(true);
    expect(wb.bestRate).toBe(15);
    expect(formatRate(wb)).toBe('15.0 reps/min');
  });

  it('sums multiple sets of the same station within one session', () => {
    const logs = [log('2026-08-12', [stationEx('Row', [
      { distanceM: 500, timeSec: 120 },
      { distanceM: 500, timeSec: 120 },
    ])])];
    const row = stationSummary(logs).find((r) => r.key === 'row');
    expect(row.sessions).toBe(1);
    expect(row.lastVolume).toBe(1000);
    expect(row.lastTimeSec).toBe(240);
  });

  it('does not record a rate when a station was logged untimed', () => {
    const logs = [log('2026-08-12', [stationEx('Farmers carry', [{ distanceM: 200, timeSec: 0 }])])];
    const fc = stationSummary(logs).find((r) => r.key === 'farmers');
    expect(fc.sessions).toBe(1);
    expect(fc.bestRate).toBeNull();
    expect(formatRate(fc)).toBe('—');
  });
});
