import { formatTime } from '../utils/time';
import { paceSecPerKm, formatPace } from '../utils/hyroxStats';
import { RUN_EXERCISE_NAMES, STATION_NAME_TO_KEY } from '../data/hyrox';

const FATIGUE_FACES = ['😴', '🙂', '💪', '😤', '🥵'];

/**
 * One logged set, rendered from whichever fields it actually recorded.
 * A lift shows kg × reps; a run shows distance, time and pace; a station
 * shows whichever of those it tracked.
 */
function setLine(set) {
  const parts = [];
  if (set.distanceM > 0) parts.push(`${set.distanceM} m`);
  if (set.reps > 0) parts.push(`${set.reps} reps`);
  if (set.actualWeight > 0) parts.push(`${set.actualWeight} kg`);
  if (set.timeSec > 0) parts.push(formatTime(set.timeSec));
  return parts.length ? parts.join(' · ') : 'logged';
}

function ExerciseBlock({ exercise }) {
  const sets = exercise.sets ?? [];
  const isRun = RUN_EXERCISE_NAMES.has(exercise.name);
  const isStation = STATION_NAME_TO_KEY.has(exercise.name);

  // Totals only make sense for the distance/time work, where adding up the
  // legs of a run block is the number you actually care about.
  const totals = (() => {
    if (!isRun && !isStation) return null;
    let distance = 0, time = 0, reps = 0, timedDistance = 0;
    for (const s of sets) {
      distance += s.distanceM ?? 0;
      reps += s.reps ?? 0;
      time += s.timeSec ?? 0;
      if (s.timeSec > 0) timedDistance += s.distanceM ?? 0;
    }
    const bits = [];
    // Station distances are short — a 50 m sled push should not read "0.05 km".
    if (distance > 0) {
      bits.push(distance >= 1000
        ? `${(distance / 1000).toFixed(2).replace(/\.?0+$/, '')} km total`
        : `${distance} m total`);
    }
    if (reps > 0) bits.push(`${reps} reps total`);
    if (time > 0) bits.push(formatTime(time));
    const pace = isRun ? paceSecPerKm(timedDistance, time) : null;
    if (pace) bits.push(formatPace(pace));
    return bits.length ? bits.join(' · ') : null;
  })();

  return (
    <div className="detail-exercise">
      <div className="detail-exercise-head">
        <h3>{exercise.name}</h3>
        {exercise.estimatedOneRM != null && (
          <span className="detail-pr">PR {exercise.estimatedOneRM.toFixed(1)} kg</span>
        )}
      </div>
      {totals && <div className="detail-totals">{totals}</div>}
      {sets.length === 0 ? (
        <p className="detail-skipped">Not logged</p>
      ) : (
        <ol className="detail-sets">
          {sets.map((s, i) => (
            <li key={i}>
              <span className="detail-set-num">{i + 1}</span>
              <span>{setLine(s)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function SessionDetail({ log, onBack }) {
  const logged = (log.exercises ?? []).filter((e) => (e.sets?.length ?? 0) > 0);
  const skipped = (log.exercises ?? []).filter((e) => (e.sets?.length ?? 0) === 0);
  const prs = (log.exercises ?? []).filter((e) => e.estimatedOneRM != null);

  return (
    <div className="session-detail">
      <div className="session-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div>
          <h2>{log.session}</h2>
          <span className="detail-date">{log.date}</span>
        </div>
      </div>

      <div className="detail-meta">
        <span>
          Fatigue {FATIGUE_FACES[log.fatigueRating - 1]} {log.fatigueRating}/5
        </span>
        <span>Block week {log.blockWeek}</span>
        {log.isDeload && <span className="deload-badge">Deload</span>}
        <span>{logged.length} of {log.exercises?.length ?? 0} logged</span>
      </div>

      {prs.length > 0 && (
        <div className="detail-pr-summary">
          <h3>1RM set this session</h3>
          {prs.map((e) => (
            <div key={e.name} className="orm-row">
              <span>{e.name}</span>
              <span>{e.estimatedOneRM.toFixed(1)} kg</span>
            </div>
          ))}
        </div>
      )}

      <div className="detail-exercises">
        {logged.map((e, i) => <ExerciseBlock key={`${e.name}-${i}`} exercise={e} />)}
      </div>

      {skipped.length > 0 && (
        <div className="detail-skipped-list">
          <h3>Not logged</h3>
          <p>{skipped.map((e) => e.name).join(' · ')}</p>
        </div>
      )}
    </div>
  );
}
