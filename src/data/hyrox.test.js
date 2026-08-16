import { describe, it, expect } from 'vitest';
import { getWeekTemplate, HYROX_SESSIONS, STATIONS, TOTAL_WEEKS, PHASES } from './hyrox';
import { phaseForWeek } from '../utils/hyroxPhase';
import { getSessionById } from './sessions';
import { SESSIONS, TRACKED_LIFTS } from './workout';

const ALL_WEEKS = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);
const VALID_FIELDS = ['weight', 'reps', 'distance', 'time'];

describe('weekly templates', () => {
  it.each(ALL_WEEKS)('week %i has seven days, Monday to Sunday', (week) => {
    const template = getWeekTemplate(week);
    expect(template).toHaveLength(7);
    expect(template.map((d) => d.day)).toEqual([
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    ]);
  });

  it('every referenced session id resolves', () => {
    for (const week of ALL_WEEKS) {
      for (const day of getWeekTemplate(week)) {
        if (day.sessionId) expect(getSessionById(day.sessionId), `week ${week} ${day.day}`).toBeTruthy();
        if (day.attachedId) expect(getSessionById(day.attachedId), `week ${week} ${day.day} attached`).toBeTruthy();
      }
    }
  });

  it('drops BJJ from three days to two in the Peak phase only', () => {
    const bjjDays = (week) => getWeekTemplate(week).filter((d) => d.type === 'bjj').length;
    expect(bjjDays(1)).toBe(3);   // Base
    expect(bjjDays(10)).toBe(3);  // Build
    expect(bjjDays(13)).toBe(2);  // Peak
    expect(bjjDays(15)).toBe(2);
    expect(bjjDays(16)).toBe(2);  // Taper — light, but still twice
  });

  it('keeps Tuesday and Saturday as the Peak BJJ days', () => {
    const peakBjj = getWeekTemplate(14).filter((d) => d.type === 'bjj').map((d) => d.day);
    expect(peakBjj).toEqual(['Tuesday', 'Saturday']);
  });

  it('ends the plan on race day', () => {
    const raceWeek = getWeekTemplate(17);
    expect(raceWeek[6].type).toBe('race');
  });
});

describe('station coverage', () => {
  const stationNames = STATIONS.map((s) => s.name);

  function stationsHitInWeek(week) {
    const hit = new Set();
    for (const day of getWeekTemplate(week)) {
      for (const id of [day.sessionId, day.attachedId]) {
        if (!id) continue;
        for (const ex of getSessionById(id).exercises) {
          if (stationNames.includes(ex.name)) hit.add(ex.name);
        }
      }
    }
    return hit;
  }

  it('grooves all 8 stations in the Base technique circuit', () => {
    const circuit = HYROX_SESSIONS['base-technique'];
    const covered = circuit.exercises.filter((e) => stationNames.includes(e.name)).map((e) => e.name);
    expect(new Set(covered).size).toBe(8);
  });

  it('covers all 8 stations across a Build fortnight', () => {
    const fortnight = new Set([...stationsHitInWeek(7), ...stationsHitInWeek(8)]);
    for (const name of stationNames) expect(fortnight, name).toContain(name);
  });

  it('covers all 8 stations in a full Peak simulation', () => {
    const full = HYROX_SESSIONS['peak-sim-full'];
    const covered = full.exercises.filter((e) => stationNames.includes(e.name)).map((e) => e.name);
    expect(new Set(covered).size).toBe(8);
  });
});

describe('exercise shape', () => {
  const everySession = [...Object.values(HYROX_SESSIONS), ...SESSIONS];

  it('gives every session a unique id', () => {
    const ids = everySession.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keys every exercise uniquely within its session', () => {
    for (const session of everySession) {
      const keys = session.exercises.map((e) => e.id ?? e.name);
      expect(new Set(keys).size, session.id).toBe(keys.length);
    }
  });

  it('only uses known tracked fields', () => {
    for (const session of everySession) {
      for (const ex of session.exercises) {
        for (const field of ex.track ?? []) {
          expect(VALID_FIELDS, `${session.id} / ${ex.name}`).toContain(field);
        }
      }
    }
  });

  it('gives every percent-based exercise a percentRange', () => {
    for (const session of everySession) {
      for (const ex of session.exercises) {
        if (ex.loadType === 'percent') {
          expect(ex.percentRange, `${session.id} / ${ex.name}`).toHaveLength(2);
          expect(ex.percentRange[0]).toBeGreaterThan(0);
          expect(ex.percentRange[0]).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('only prescribes percentages against lifts that have a tracked 1RM', () => {
    for (const session of Object.values(HYROX_SESSIONS)) {
      for (const ex of session.exercises) {
        if (ex.loadType === 'percent') {
          expect(TRACKED_LIFTS, `${session.id} / ${ex.name}`).toContain(ex.name);
        }
      }
    }
  });

  it('gives every fixed-load exercise a label and a weight', () => {
    for (const session of Object.values(HYROX_SESSIONS)) {
      for (const ex of session.exercises) {
        if (ex.loadType === 'fixed') {
          expect(ex.fixedLabel, `${session.id} / ${ex.name}`).toBeTruthy();
          expect(typeof ex.fixedWeight).toBe('number');
        }
      }
    }
  });
});

describe('pacing language', () => {
  // The plan deliberately avoids max-effort framing in favour of controlled,
  // sustainable effort. Guard against that drifting back in — while allowing
  // negated mentions, since "controlled effort, not maximal" is exactly the
  // framing we want.
  const banned = /race pace|full send|all[- ]out|max(imal)? effort|maximal/i;
  const negated = /not (an? )?(race pace|full send|all[- ]out|max(imal)? effort|maximal)/gi;

  it('keeps max-effort framing out of Hyrox session copy', () => {
    for (const session of Object.values(HYROX_SESSIONS)) {
      const text = [session.note, ...session.exercises.flatMap((e) => [e.note, e.effort])]
        .filter(Boolean)
        .join(' ')
        .replace(negated, '');
      expect(text.match(banned), `${session.id}: ${text.match(banned)?.[0]}`).toBeNull();
    }
  });
});

describe('running volume targets', () => {
  // The volume chart draws each phase's runTargetKm as a band. If the sessions
  // a week actually prescribes fall outside that band, the chart tells you
  // you're under-training when you're following the plan exactly — so the two
  // have to stay in step.
  function prescribedKm(week) {
    let metres = 0;
    for (const day of getWeekTemplate(week)) {
      for (const id of [day.sessionId, day.attachedId]) {
        if (!id) continue;
        for (const ex of getSessionById(id).exercises) {
          if (ex.metric !== 'run') continue;
          const d = ex.defaults?.distance;
          if (typeof d === 'number' && d > 0) metres += d * ex.sets;
        }
      }
    }
    return metres / 1000;
  }

  it.each(ALL_WEEKS)('week %i prescribes running inside its phase target band', (week) => {
    const { runTargetKm, name } = phaseForWeek(week);
    const km = prescribedKm(week);
    expect(km, `${name} week ${week}: ${km} km vs ${runTargetKm.join('–')} km`).toBeGreaterThanOrEqual(runTargetKm[0]);
    expect(km, `${name} week ${week}: ${km} km vs ${runTargetKm.join('–')} km`).toBeLessThanOrEqual(runTargetKm[1]);
  });

  it('gives every phase a running target', () => {
    for (const phase of PHASES) {
      expect(phase.runTargetKm, phase.name).toHaveLength(2);
      expect(phase.runTargetKm[0]).toBeLessThan(phase.runTargetKm[1]);
    }
  });

  it('pre-fills a distance on every timed run block, so volume is one tap not typing', () => {
    for (const week of ALL_WEEKS) {
      for (const day of getWeekTemplate(week)) {
        for (const id of [day.sessionId, day.attachedId]) {
          if (!id) continue;
          for (const ex of getSessionById(id).exercises) {
            // Zone 2 is deliberately blank: it may be a bike or row, and only
            // a run should count toward running volume.
            if (ex.metric !== 'run' || ex.id === 'z2') continue;
            expect(typeof ex.defaults?.distance, `${id} / ${ex.name}`).toBe('number');
          }
        }
      }
    }
  });
});
