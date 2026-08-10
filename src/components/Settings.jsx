import { useState } from 'react';
import { TRACKED_LIFTS } from '../data/workout';
import { TOTAL_WEEKS } from '../data/hyrox';
import { get1RMs, setAll1RMs, getBlock, setBlock, renameUser, getUsers, getHyrox, setHyrox } from '../utils/storage';
import { epley } from '../utils/oneRM';
import { currentPlanWeek, phaseForWeek, daysUntilRace } from '../utils/hyroxPhase';

export default function Settings({ user, onUserChange, onSwitchUser }) {
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
    const next = { ...hyrox, ...patch };
    setHyroxState(next);
    setHyrox(user, patch);
  }

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
    setBlock(user, { ...getBlock(user), week: 1, startDate: new Date().toISOString().slice(0, 10) });
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
        <p>Current block week: <strong>{getBlock(user).week}</strong></p>
        <button className="btn-secondary" onClick={resetBlock}>Reset block to week 1</button>
      </section>

      <section className="settings-section">
        <button className="btn-secondary switch-btn" onClick={onSwitchUser}>Switch user</button>
      </section>
    </div>
  );
}
