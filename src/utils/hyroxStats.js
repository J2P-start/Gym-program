import { RUN_EXERCISE_NAMES, STATION_NAME_TO_KEY, STATIONS } from '../data/hyrox';
import { weekStart } from './progression';

/**
 * Reading Hyrox metrics back out of the session log.
 *
 * Logs store exercise names and raw sets, so everything here works off the
 * `distanceM` / `timeSec` fields written by distance- and time-tracked
 * exercises. Sets that never recorded both are skipped rather than counted as
 * zero, which would silently drag every average down.
 */

const isRun = (name) => RUN_EXERCISE_NAMES.has(name);

/** Seconds per kilometre. Null when either side of the ratio is missing. */
export function paceSecPerKm(distanceM, timeSec) {
  if (!distanceM || !timeSec || distanceM <= 0 || timeSec <= 0) return null;
  return (timeSec / distanceM) * 1000;
}

/** "4:52 /km" — the conventional way runners read pace. */
export function formatPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return '—';
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /km`;
}

/** Every logged run set across all sessions, flattened. */
function runSets(logs) {
  const out = [];
  for (const log of logs) {
    for (const ex of log.exercises ?? []) {
      if (!isRun(ex.name)) continue;
      for (const s of ex.sets ?? []) {
        if (s.distanceM > 0) out.push({ date: log.date, distanceM: s.distanceM, timeSec: s.timeSec ?? 0 });
      }
    }
  }
  return out;
}

/** Total running distance per session, with average pace where timed. */
export function runSessions(logs) {
  const out = [];
  for (const log of logs) {
    let distance = 0;
    let timedDistance = 0;
    let time = 0;
    for (const ex of log.exercises ?? []) {
      if (!isRun(ex.name)) continue;
      for (const s of ex.sets ?? []) {
        if (!(s.distanceM > 0)) continue;
        distance += s.distanceM;
        // Pace only averages over sets that were actually timed, so an
        // untimed leg doesn't get counted as infinitely fast.
        if (s.timeSec > 0) { timedDistance += s.distanceM; time += s.timeSec; }
      }
    }
    if (distance > 0) {
      out.push({
        date: log.date,
        session: log.session,
        distanceM: distance,
        pace: paceSecPerKm(timedDistance, time),
      });
    }
  }
  return out;
}

/** Running distance in km per calendar week (Mon–Sun), oldest first. */
export function weeklyRunVolume(logs) {
  const byWeek = new Map();
  for (const s of runSets(logs)) {
    const wk = weekStart(s.date);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + s.distanceM);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, metres]) => ({ week, km: Math.round((metres / 1000) * 10) / 10 }));
}

/**
 * Per-station summary: how often it's been trained, the most recent volume,
 * and the best rate achieved.
 *
 * Rate is normalised so sessions of different volumes are comparable —
 * seconds per 100 m for the distance stations, reps per minute for the
 * rep-based ones. Lower is better for distance, higher for reps.
 */
export function stationSummary(logs) {
  const acc = new Map(STATIONS.map((s) => [s.key, {
    key: s.key,
    name: s.name,
    raceSpec: s.raceSpec,
    repBased: s.track.includes('reps'),
    sessions: 0,
    lastDate: null,
    lastVolume: 0,
    lastTimeSec: 0,
    bestRate: null,
  }]));

  for (const log of logs) {
    for (const ex of log.exercises ?? []) {
      const key = STATION_NAME_TO_KEY.get(ex.name);
      if (!key) continue;
      const entry = acc.get(key);
      if (!entry) continue;

      let volume = 0;
      let time = 0;
      for (const s of ex.sets ?? []) {
        volume += entry.repBased ? (s.reps ?? 0) : (s.distanceM ?? 0);
        time += s.timeSec ?? 0;
      }
      if (volume <= 0) continue;

      entry.sessions += 1;
      entry.lastDate = log.date;
      entry.lastVolume = volume;
      entry.lastTimeSec = time;

      if (time > 0) {
        const rate = entry.repBased
          ? volume / (time / 60)      // reps per minute — higher is better
          : (time / volume) * 100;    // seconds per 100 m — lower is better
        const better = entry.bestRate === null
          || (entry.repBased ? rate > entry.bestRate : rate < entry.bestRate);
        if (better) entry.bestRate = rate;
      }
    }
  }

  return [...acc.values()];
}

/** How a station's best rate reads on screen. */
export function formatRate(entry) {
  if (entry.bestRate === null) return '—';
  if (entry.repBased) return `${entry.bestRate.toFixed(1)} reps/min`;
  const total = Math.round(entry.bestRate);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /100 m`;
}

/** Volume as it should read per station type. */
export function formatVolume(entry, value) {
  if (!value) return '—';
  return entry.repBased ? `${value} reps` : `${value} m`;
}
