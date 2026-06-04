import { useState } from 'react';
import { getUsers, setUsers } from '../utils/storage';

export default function ProfileSelector({ onSelect }) {
  const existing = getUsers();
  const [names, setNames] = useState(() => {
    if (existing.length >= 2) return existing.slice(0, 2);
    if (existing.length === 1) return [existing[0], ''];
    return ['', ''];
  });
  const [setupMode, setSetupMode] = useState(existing.length < 2);

  if (setupMode) {
    const valid = names[0].trim() && names[1].trim() && names[0].trim() !== names[1].trim();
    const canGoBack = existing.length === 2;
    return (
      <div className="profile-selector">
        {canGoBack && (
          <button className="btn-back-top" onClick={() => setSetupMode(false)}>← Back</button>
        )}
        <h1>BJJ Gym Tracker</h1>
        <p className="subtitle">First-time setup — enter both names</p>
        <div className="setup-inputs">
          {[0, 1].map((i) => (
            <input
              key={i}
              className="name-input"
              placeholder={`Athlete ${i + 1} name`}
              value={names[i]}
              onChange={(e) => {
                const next = [...names];
                next[i] = e.target.value;
                setNames(next);
              }}
            />
          ))}
        </div>
        <button
          className="btn-primary"
          disabled={!valid}
          onClick={() => {
            const trimmed = names.map((n) => n.trim());
            setUsers(trimmed);
            setNames(trimmed);
            setSetupMode(false);
          }}
        >
          Let's go
        </button>
      </div>
    );
  }

  return (
    <div className="profile-selector">
      <h1>BJJ Gym Tracker</h1>
      <p className="subtitle">Who's training?</p>
      <div className="profile-buttons">
        {names.map((name) => (
          <button key={name} className="profile-btn" onClick={() => onSelect(name)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
