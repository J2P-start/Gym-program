import { useState, useEffect, useRef } from 'react';
import { SESSIONS, TRACKED_LIFTS } from '../data/workout';
import { get1RMs, set1RM, addLog, getBlock, setBlock } from '../utils/storage';
import { workingWeight, bestEstimated1RM } from '../utils/oneRM';

function calcWeight(exercise, oneRMs, isDeload) {
  if (exercise.loadType !== 'percent') return null;
  const pct = isDeload ? 60 : exercise.percentRange[0];
  const rm = oneRMs[exercise.name];
  if (!rm) return null;
  return workingWeight(rm, pct);
}

function SetRow({ setNum, exercise, oneRMs, isDeload, onComplete }) {
  const suggested = calcWeight(exercise, oneRMs, isDeload);
  const [weight, setWeight] = useState(suggested ?? '');
  const [reps, setReps] = useState(exercise.reps ?? '');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (suggested !== null) setWeight(suggested);
  }, [suggested]);

  function handleComplete() {
    setDone(true);
    onComplete({ setNumber: setNum, actualWeight: parseFloat(weight) || 0, reps: parseInt(reps) || 0, completed: true });
  }

  return (
    <div className={`set-row ${done ? 'set-done' : ''}`}>
      <span className="set-num">{setNum}</span>
      <input
        type="number"
        className="set-input"
        placeholder="kg"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        disabled={done}
      />
      <input
        type="number"
        className="set-input"
        placeholder="reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        disabled={done}
      />
      <button className={`btn-set-done ${done ? 'checked' : ''}`} onClick={handleComplete} disabled={done}>
        {done ? '✓' : 'Done'}
      </button>
    </div>
  );
}

function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (running && remaining > 0) {
      ref.current = setInterval(() => setRemaining((r) => r - 1), 1000);
    } else if (remaining === 0) {
      clearInterval(ref.current);
      setRunning(false);
      onDone?.();
    }
    return () => clearInterval(ref.current);
  }, [running, remaining]);

  function toggle() {
    if (remaining === 0) { setRemaining(seconds); setRunning(false); }
    else setRunning((r) => !r);
  }

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <button className={`rest-timer ${running ? 'running' : ''}`} onClick={toggle}>
      {running ? `${m}:${s.toString().padStart(2, '0')}` : remaining === 0 ? 'Rest done' : `Rest ${m}:${s.toString().padStart(2, '0')}`}
    </button>
  );
}

function ExerciseCard({ exercise, oneRMs, isDeload, onSetsComplete }) {
  const setCount = isDeload ? Math.max(1, exercise.sets - 1) : exercise.sets;
  const [completedSets, setCompletedSets] = useState([]);
  const [showTimer, setShowTimer] = useState(false);

  function handleSetDone(setData) {
    const next = [...completedSets, setData];
    setCompletedSets(next);
    if (exercise.restSeconds > 0) setShowTimer(true);
    if (next.length === setCount) onSetsComplete(exercise.name, next);
  }

  const suggested = calcWeight(exercise, oneRMs, isDeload);
  const loadLabel = (() => {
    if (exercise.loadType === 'percent') {
      const pct = isDeload ? 60 : exercise.percentRange[0];
      return suggested ? `${pct}% → ${suggested} kg` : `${pct}% 1RM — set your 1RM`;
    }
    if (exercise.loadType === 'bodyweight') return 'Bodyweight';
    if (exercise.loadType === 'added') return exercise.addedNote;
    return exercise.note ?? '';
  })();

  return (
    <div className="exercise-card">
      <div className="exercise-header">
        <h3>{exercise.name}</h3>
        <span className="exercise-meta">{setCount} sets × {exercise.repLabel}</span>
      </div>
      <div className="load-label">{loadLabel}</div>
      <div className="sets-list">
        {Array.from({ length: setCount }, (_, i) => (
          <SetRow
            key={i}
            setNum={i + 1}
            exercise={exercise}
            oneRMs={oneRMs}
            isDeload={isDeload}
            onComplete={handleSetDone}
          />
        ))}
      </div>
      {showTimer && exercise.restSeconds > 0 && (
        <RestTimer seconds={exercise.restSeconds} onDone={() => setShowTimer(false)} />
      )}
    </div>
  );
}

export default function SessionScreen({ user, sessionIndex, isDeload, onFinish, onBack }) {
  const session = SESSIONS[sessionIndex];
  const [oneRMs, setOneRMs] = useState(() => get1RMs(user));
  const [exerciseSets, setExerciseSets] = useState({});
  const [showFatigue, setShowFatigue] = useState(false);
  const [estimatedSummary, setEstimatedSummary] = useState({});

  function handleSetsComplete(name, sets) {
    setExerciseSets((prev) => ({ ...prev, [name]: sets }));

    if (TRACKED_LIFTS.includes(name)) {
      const est = bestEstimated1RM(sets.map((s) => ({ weight: s.actualWeight, reps: s.reps })));
      if (est) {
        const current = oneRMs[name] ?? 0;
        if (est > current) {
          set1RM(user, name, est);
          setOneRMs((prev) => ({ ...prev, [name]: est }));
        }
        setEstimatedSummary((prev) => ({ ...prev, [name]: est }));
      }
    }
  }

  const allDone = session.exercises.every((e) => exerciseSets[e.name]);

  function handleFatigue(rating) {
    const block = getBlock(user);
    const entry = {
      user,
      date: new Date().toISOString().slice(0, 10),
      session: `${session.day} — ${session.name}`,
      fatigueRating: rating,
      blockWeek: block.week,
      isDeload,
      exercises: session.exercises.map((e) => ({
        name: e.name,
        estimatedOneRM: estimatedSummary[e.name] ?? null,
        sets: (exerciseSets[e.name] ?? []).map((s, i) => ({ setNumber: i + 1, ...s })),
      })),
    };
    addLog(user, entry);

    if (isDeload) {
      setBlock(user, { week: 1, startDate: new Date().toISOString().slice(0, 10), lastDeloadDate: new Date().toISOString().slice(0, 10) });
    } else {
      setBlock(user, { ...block, week: block.week + 1 });
    }

    onFinish(entry);
  }

  if (showFatigue) {
    return (
      <div className="fatigue-screen">
        <h2>Session done!</h2>
        {Object.keys(estimatedSummary).length > 0 && (
          <div className="orm-summary">
            <h3>1RM updates</h3>
            {Object.entries(estimatedSummary).map(([lift, val]) => (
              <div key={lift} className="orm-row">
                <span>{lift}</span>
                <span>{val.toFixed(1)} kg</span>
              </div>
            ))}
          </div>
        )}
        <h3>How did it feel?</h3>
        <div className="fatigue-scale">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className="fatigue-btn" onClick={() => handleFatigue(n)}>
              {['😴', '🙂', '💪', '😤', '🥵'][n - 1]}
              <span>{n}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="session-screen">
      <div className="session-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <div>
          <h2>{session.name}</h2>
          {isDeload && <span className="deload-badge">Deload</span>}
        </div>
      </div>
      <p className="session-note">{session.note}</p>

      <div className="exercises">
        {session.exercises.map((ex) => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            oneRMs={oneRMs}
            isDeload={isDeload}
            onSetsComplete={handleSetsComplete}
          />
        ))}
      </div>

      {allDone && (
        <button className="btn-primary finish-btn" onClick={() => setShowFatigue(true)}>
          Finish session
        </button>
      )}
    </div>
  );
}
