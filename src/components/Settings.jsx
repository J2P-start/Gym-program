import { useState, useMemo } from 'react';
import { TRACKED_LIFTS } from '../data/workout';
import { TOTAL_WEEKS } from '../data/hyrox';
import { get1RMs, setAll1RMs, getBlock, setBlock, getLogs, renameUser, getUsers, getHyrox, setHyrox } from '../utils/storage';
import { epley, bestEstimated1RM } from '../utils/oneRM';
import { trainingWeek } from '../utils/progression';
import { localDateStr } from '../utils/dates';
import { currentPlanWeek, phaseForWeek, daysUntilRace } from '../utils/hyroxPhase';

function RMDelta({ baseline, current }) {
  if (!baseline || !current) return null;
  const diff = Math.round((current - baseline) * 10) / 10;
  if (diff === 0) return <div className="rm-delta">— no change since first session</div>;
  const pct = ((diff / baseline) * 100).toFixed(1);
  const sign = diff > 0 ? '+' : '';
  return (
    <div className={`rm-delta ${diff > 0 ? 'up' : 'down'}`}>
      {diff > 0 ? '▲' : '▼'} {sign}{diff.toFixed(1)} kg ({sign}{pct}%) since first session
    </div>
  );
}

export default function Settings({ user, onUserChange }) {
  const [oneRMs, setOneRMs] = useState(() => get1RMs(user));
  const [repMaxInputs, setRepMaxInputs] = useState({});
  const [newName, setNewName] = useState(user);
  const [saved, setSaved] = useState(false);
  const [hyrox, setHyroxState] = useState(() => getHyrox(user));

  const derivedWeek = currentPlanWeek({ ...hyrox, weekOverride: null });
  const activeWeek = currentPlanWeek(hyrox);
  const activePhase = phaseForWeek(activeWeek);
  const toRace = daysUntilRace(hyrox);

  function updateHyrox(patch) {
    setHyroxState((prev) => ({ ...prev, ...patch }));
    setHyrox(user, patch);
  }

  // Baseline 1RM per lift, estimated from the raw sets of the earliest session
  // that logged the lift. (The stored estimatedOneRM field can't be used here:
  // it's only written when a session sets a new PR, so it would measure
  // progress from the first PR instead of the first session.)
  const baselines = useMemo(() => {
    const logs = getLogs(user)
      .filter((l) => !l.isDeload)
      .sort((a, b) => a.date.localeCompare(b.date));
    const map = {};
    for (const log of logs) {
      for (const e of log.exercises ?? []) {
        if (map[e.name] !== undefined || !e.sets?.length) continue;
        const est = bestEstimated1RM(e.sets.map((s) => ({ weight: s.actualWeight, reps: s.reps })));
        if (est != null) map[e.name] = est;
      }
    }
    return map;
  }, [user]);

  function handleRMChange(lift, val) {
    const parsed = parseFloat(val);
    const next = { ...oneRMs };
    if (val === '' || isNaN(parsed)) {
      delete next[lift];
    } else {
      next[lift] = parsed;
    }
    setOneRMs(next);
  }

  function handleRepMaxChange(lift, field, val) {
    setRepMaxInputs((prev) => ({ ...prev, [lift]: { ...(prev[lift] ?? {}), [field]: val } }));
  }

  function calcFromRepMax(lift) {
    const { weight, reps } = repMaxInputs[lift] ?? {};
    if (!weight || !reps) return;
    const est = epley(parseFloat(weight), parseInt(reps));
    handleRMChange(lift, Math.round(est * 10) / 10);
  }

  function saveRMs() {
    setAll1RMs(user, oneRMs);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function saveName() {
    if (!newName.trim() || newName.trim() === user) return;
    const users = getUsers();
    if (users.includes(newName.trim())) { alert('Name already in use'); return; }
    renameUser(user, newName.trim());
    onUserChange(newName.trim());
  }

  function resetBlock() {
    if (!window.confirm('Reset block counter to week 1?')) return;
    setBlock(user, { ...getBlock(user), week: 1, startDate: localDateStr() });
    alert('Block reset to week 1');
  }

  return (
    <div className="settings-screen">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>1RM values</h3>
        <p className="settings-hint">Edit directly or calculate from a recent rep max.</p>
        {TRACKED_LIFTS.map((lift) => (
          <div key={lift} className="rm-row">
            <label>{lift}</label>
            <input
              type="number"
              className="rm-input"
              placeholder="kg"
              value={oneRMs[lift] ?? ''}
              onChange={(e) => handleRMChange(lift, e.target.value)}
            />
            <span className="rm-unit">kg</span>
            <div className="rep-max-row">
              <input
                type="number"
                className="rm-input small"
                placeholder="weight"
                value={repMaxInputs[lift]?.weight ?? ''}
                onChange={(e) => handleRepMaxChange(lift, 'weight', e.target.value)}
              />
              <span>×</span>
              <input
                type="number"
                className="rm-input small"
                placeholder="reps"
                value={repMaxInputs[lift]?.reps ?? ''}
                onChange={(e) => handleRepMaxChange(lift, 'reps', e.target.value)}
              />
              <button className="btn-calc" onClick={() => calcFromRepMax(lift)}>Calc</button>
            </div>
            <RMDelta baseline={baselines[lift]} current={oneRMs[lift]} />
          </div>
        ))}
        <button className="btn-primary" onClick={saveRMs}>{saved ? 'Saved ✓' : 'Save 1RMs'}</button>
      </section>

      <section className="settings-section">
        <h3>Hyrox plan</h3>
        <p className="settings-hint">
          17 weeks across Base, Build, Peak and Taper. The weekly schedule on Home follows
          whichever week you're in.
        </p>

        <div className="plan-status">
          <div className="plan-status-row">
            <span>Current week</span>
            <strong>Week {activeWeek} — {activePhase.name}</strong>
          </div>
          {toRace !== null && (
            <div className="plan-status-row">
              <span>Race day</span>
              <strong>{toRace >= 0 ? `${toRace} days away` : 'Been and gone'}</strong>
            </div>
          )}
        </div>

        <label className="settings-field">
          <span>Race date</span>
          <input
            type="date"
            className="name-input"
            value={hyrox.raceDate}
            onChange={(e) => updateHyrox({ raceDate: e.target.value })}
          />
        </label>

        <label className="settings-field">
          <span>Plan week 1 starts</span>
          <input
            type="date"
            className="name-input"
            value={hyrox.planStartDate}
            onChange={(e) => updateHyrox({ planStartDate: e.target.value })}
          />
        </label>

        <label className="settings-field">
          <span>Which week am I on?</span>
          <select
            className="name-input"
            value={hyrox.weekOverride ?? ''}
            onChange={(e) => updateHyrox({ weekOverride: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Follow the calendar (week {derivedWeek})</option>
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>Week {w} — {phaseForWeek(w).name}</option>
            ))}
          </select>
        </label>
        <p className="settings-hint">
          Set this if life has shifted the plan and the calendar no longer matches where you actually are.
        </p>
      </section>

      <section className="settings-section">
        <h3>Name</h3>
        <div className="name-edit-row">
          <input
            className="name-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn-primary" onClick={saveName} disabled={!newName.trim() || newName.trim() === user}>
            Save
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Block</h3>
        <p>Current block week: <strong>{trainingWeek(user)}</strong></p>
        <button className="btn-secondary" onClick={resetBlock}>Reset block to week 1</button>
      </section>

    </div>
  );
}
