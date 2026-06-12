import { useState, useEffect, useMemo, useRef } from 'react';
import { SESSIONS, TRACKED_LIFTS } from '../data/workout';
import { get1RMs, set1RM, addLog, getBlock, setBlock, getLastSession, storageAvailable } from '../utils/storage';
import { bestEstimated1RM } from '../utils/oneRM';
import { blockPercent, blockWeight, trainingWeek } from '../utils/progression';
import { localDateStr } from '../utils/dates';
import { warmupSets } from '../utils/warmup';

/**
 * iOS-style back gesture: a touch that starts at the left screen edge and
 * swipes right triggers onBack. Edge-start + strongly-horizontal requirements
 * keep it from firing on normal scrolling or input interaction.
 */
function useSwipeBack(onBack) {
  const onBackRef = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; });

  useEffect(() => {
    let start = null;
    function onTouchStart(e) {
      const t = e.touches[0];
      start = t.clientX <= 40 ? { x: t.clientX, y: t.clientY } : null;
    }
    function onTouchEnd(e) {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = Math.abs(t.clientY - start.y);
      start = null;
      if (dx > 70 && dy < 60) onBackRef.current();
    }
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);
}

function WarmupChecklist({ items }) {
  const [done, setDone] = useState(() => items.map(() => false));
  const [collapsed, setCollapsed] = useState(false);
  const doneCount = done.filter(Boolean).length;

  return (
    <div className="exercise-card warmup-card">
      <button className="card-header" onClick={() => setCollapsed((c) => !c)}>
        <h3>Warm-up</h3>
        <span className="exercise-meta">{doneCount}/{items.length} {collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && items.map((item, i) => (
        <label key={item.name} className={`checklist-item ${done[i] ? 'checked' : ''}`}>
          <input
            type="checkbox"
            checked={done[i]}
            onChange={() => setDone((prev) => prev.map((v, j) => (j === i ? !v : v)))}
          />
          <span>
            {item.name}
            <span className="warmup-detail">{item.detail}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function calcWeight(exercise, oneRMs, isDeload, week) {
  if (exercise.loadType !== 'percent') return null;
  const rm = oneRMs[exercise.name];
  if (!rm) return null;
  return blockWeight(rm, exercise.percentRange, week, isDeload);
}

function SetRow({ setNum, exercise, oneRMs, isDeload, week, prevWeight, onChange }) {
  const suggested = calcWeight(exercise, oneRMs, isDeload, week);
  const [weight, setWeight] = useState(suggested ?? prevWeight ?? '');
  const [reps, setReps] = useState(exercise.reps ?? '');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (suggested !== null) setWeight(suggested);
  }, [suggested]);

  function toggleDone() {
    if (done) {
      setDone(false);
      onChange(setNum, null);
    } else {
      setDone(true);
      onChange(setNum, { setNumber: setNum, actualWeight: parseFloat(weight) || 0, reps: parseInt(reps) || 0, completed: true });
    }
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
      <button className={`btn-set-done ${done ? 'checked' : ''}`} onClick={toggleDone}>
        {done ? '✓' : 'Done'}
      </button>
    </div>
  );
}

function ExerciseCard({ exercise, oneRMs, isDeload, week, prevSets, onSetsChange }) {
  const setCount = isDeload ? Math.max(1, exercise.sets - 1) : exercise.sets;
  const [completedSets, setCompletedSets] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const isComplete = Object.keys(completedSets).length === setCount;

  function handleSetChange(setNum, data) {
    setCompletedSets((prev) => {
      const next = { ...prev };
      if (data) next[setNum] = data;
      else delete next[setNum];
      return next;
    });
  }

  // Report the full ordered set list when every set is done, else retract.
  // Runs as an effect so back-to-back set ticks can't race each other.
  useEffect(() => {
    const full = Object.keys(completedSets).length === setCount;
    // Auto-collapse a finished exercise to keep the screen tidy
    if (full) setCollapsed(true);
    onSetsChange(
      exercise.name,
      full ? Array.from({ length: setCount }, (_, i) => completedSets[i + 1]) : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSetsChange is recreated by the parent each render; including it would loop
  }, [completedSets, setCount, exercise.name]);

  const suggested = calcWeight(exercise, oneRMs, isDeload, week);
  const pct = exercise.loadType === 'percent' ? blockPercent(exercise.percentRange, week, isDeload) : null;
  const loadLabel = (() => {
    if (exercise.loadType === 'percent') {
      return suggested ? `${pct}% → ${suggested} kg` : `${pct}% 1RM — set your 1RM`;
    }
    if (exercise.loadType === 'bodyweight') return 'Bodyweight';
    if (exercise.loadType === 'added') return exercise.addedNote;
    return exercise.note ?? '';
  })();

  const rampLine = (() => {
    if (exercise.loadType !== 'percent' || !suggested) return null;
    const ramp = warmupSets(suggested);
    if (ramp.length === 0) return null;
    return ramp.map((s) => `${s.label === 'Bar' ? 'Bar' : `${s.weight} kg`} ×${s.reps}`).join(' · ');
  })();

  const prevHint = (() => {
    if (exercise.loadType === 'percent' || !prevSets?.length) return null;
    const weights = prevSets.map((s) => s.actualWeight).filter((w) => w > 0);
    if (!weights.length) return null;
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    return min === max ? `Last: ${min} kg` : `Last: ${min}–${max} kg`;
  })();

  const restLabel = exercise.restSeconds > 0
    ? `${Math.floor(exercise.restSeconds / 60)}:${String(exercise.restSeconds % 60).padStart(2, '0')} rest`
    : null;

  return (
    <div className="exercise-card">
      <button className="card-header" onClick={() => setCollapsed((c) => !c)}>
        <h3>{exercise.name}</h3>
        <span className="exercise-meta">
          {isComplete && <span className="card-check">✓ </span>}
          {setCount} × {exercise.repLabel} {collapsed ? '▸' : '▾'}
        </span>
      </button>
      {/* Hidden, not unmounted — SetRow keeps its ticked/typed state while collapsed */}
      <div className={`card-body${collapsed ? ' hidden' : ''}`}>
          <div className="exercise-info-row">
            <span className="load-label">{loadLabel}</span>
            {restLabel && <span className="rest-label">{restLabel}</span>}
          </div>
          {rampLine && <span className="warmup-ramp">Warm-up: {rampLine}</span>}
          {prevHint && <span className="prev-weight-hint">{prevHint}</span>}
          <div className="sets-list">
            <div className="set-header-row">
              <span className="set-num" />
              <span className="set-col-label">kg</span>
              <span className="set-col-label">reps</span>
              <span className="set-done-spacer" />
            </div>
            {Array.from({ length: setCount }, (_, i) => (
              <SetRow
                key={i}
                setNum={i + 1}
                exercise={exercise}
                oneRMs={oneRMs}
                isDeload={isDeload}
                week={week}
                prevWeight={prevSets?.[i]?.actualWeight ?? null}
                onChange={handleSetChange}
              />
            ))}
          </div>
      </div>
    </div>
  );
}

export default function SessionScreen({ user, sessionIndex, isDeload, onFinish, onBack }) {
  const session = SESSIONS[sessionIndex];
  const [oneRMs, setOneRMs] = useState(() => get1RMs(user));
  const [exerciseSets, setExerciseSets] = useState({});
  const [showFatigue, setShowFatigue] = useState(false);
  const [estimatedSummary, setEstimatedSummary] = useState({});
  const blockWeek = useMemo(() => trainingWeek(user), [user]);

  const prevExercises = useMemo(() => {
    const sessionName = `${session.day} — ${session.name}`;
    const lastLog = getLastSession(user, sessionName);
    if (!lastLog) return {};
    return Object.fromEntries(lastLog.exercises.map((e) => [e.name, e.sets]));
  }, [user, session]);

  function handleSetsChange(name, setsOrNull) {
    setExerciseSets((prev) => {
      const next = { ...prev };
      if (setsOrNull) next[name] = setsOrNull;
      else delete next[name];
      return next;
    });
  }

  // 1RM updates happen here, not as sets complete, so un-ticking a set to fix
  // a typo can never leave a wrong estimate behind.
  function startFinish() {
    const summary = {};
    const updated = { ...oneRMs };
    for (const [name, sets] of Object.entries(exerciseSets)) {
      if (!TRACKED_LIFTS.includes(name)) continue;
      const est = bestEstimated1RM(sets.map((s) => ({ weight: s.actualWeight, reps: s.reps })));
      if (est && est > (updated[name] ?? 0)) {
        set1RM(user, name, est);
        updated[name] = est;
        summary[name] = est;
      }
    }
    setOneRMs(updated);
    setEstimatedSummary(summary);
    setShowFatigue(true);
  }

  const allDone = session.exercises.every((e) => exerciseSets[e.name]);

  function handleBack() {
    if (Object.keys(exerciseSets).length > 0 && !window.confirm('Go back? Your progress for this session will be lost.')) return;
    onBack();
  }

  useSwipeBack(handleBack);

  function handleFatigue(rating) {
    const block = getBlock(user);
    const entry = {
      user,
      date: localDateStr(),
      session: `${session.day} — ${session.name}`,
      fatigueRating: rating,
      blockWeek,
      isDeload,
      exercises: session.exercises.map((e) => ({
        name: e.name,
        estimatedOneRM: estimatedSummary[e.name] ?? null,
        sets: (exerciseSets[e.name] ?? []).map((s, i) => ({ setNumber: i + 1, ...s })),
      })),
    };
    const saved = addLog(user, entry);
    if (!saved) {
      alert('Could not save your session — storage may be full. Please free up space and try again.');
      return;
    }

    if (isDeload) {
      setBlock(user, { week: 1, startDate: localDateStr(), lastDeloadDate: localDateStr() });
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
        <button className="btn-back" onClick={handleBack}>←</button>
        <div>
          <h2>{session.name}</h2>
          {isDeload && <span className="deload-badge">Deload</span>}
        </div>
      </div>
      <p className="session-note">{session.note}</p>

      <div className="exercises">
        {session.warmup?.length > 0 && <WarmupChecklist items={session.warmup} />}
        {session.exercises.map((ex) => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            oneRMs={oneRMs}
            isDeload={isDeload}
            week={blockWeek}
            prevSets={prevExercises[ex.name] ?? null}
            onSetsChange={handleSetsChange}
          />
        ))}
      </div>

      {allDone && (
        <button className="btn-primary finish-btn" onClick={startFinish}>
          Finish session
        </button>
      )}
    </div>
  );
}
