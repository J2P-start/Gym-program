import { useState } from 'react';
import { RECOVERY_DAY } from '../data/workout';

export default function Recovery() {
  const [checked, setChecked] = useState({});
  function toggle(key) { setChecked((p) => ({ ...p, [key]: !p[key] })); }

  return (
    <div className="recovery-screen">
      <h2>Sunday Recovery</h2>

      <section className="recovery-section">
        <h3>Mobility flow (20 min)</h3>
        {RECOVERY_DAY.mobility.map((item) => (
          <label key={item} className={`checklist-item ${checked[item] ? 'checked' : ''}`}>
            <input type="checkbox" checked={!!checked[item]} onChange={() => toggle(item)} />
            {item}
          </label>
        ))}
      </section>

      <section className="recovery-section">
        <h3>Sauna</h3>
        <p>{RECOVERY_DAY.sauna}</p>
        {['Round 1', 'Round 2', 'Round 3'].map((r) => (
          <label key={r} className={`checklist-item ${checked[r] ? 'checked' : ''}`}>
            <input type="checkbox" checked={!!checked[r]} onChange={() => toggle(r)} />
            {r}
          </label>
        ))}
      </section>

      <section className="recovery-section">
        <h3>Cold exposure (optional)</h3>
        <p>{RECOVERY_DAY.cold}</p>
      </section>

      <section className="recovery-section">
        <h3>Nutrition</h3>
        <p>{RECOVERY_DAY.nutrition}</p>
      </section>
    </div>
  );
}
