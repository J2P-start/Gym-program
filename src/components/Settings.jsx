import { useState } from 'react';
import { TRACKED_LIFTS } from '../data/workout';
import { get1RMs, setAll1RMs, getBlock, setBlock, renameUser, getUsers } from '../utils/storage';
import { epley } from '../utils/oneRM';

export default function Settings({ user, onUserChange, onSwitchUser }) {
  const [oneRMs, setOneRMs] = useState(() => get1RMs(user));
  const [repMaxInputs, setRepMaxInputs] = useState({});
  const [newName, setNewName] = useState(user);
  const [saved, setSaved] = useState(false);

  function handleRMChange(lift, val) {
    const next = { ...oneRMs, [lift]: parseFloat(val) || 0 };
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
