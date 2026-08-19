import { useState } from 'react';
import { setUsers } from '../utils/storage';

export default function ProfileSelector({ onSelect }) {
  const [name, setName] = useState('');
  const valid = name.trim().length > 0;

  return (
    <div className="profile-selector">
      <h1>BJJ Gym Tracker</h1>
      <p className="subtitle">First-time setup — what's your name?</p>
      <div className="setup-inputs">
        <input
          className="name-input"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <button
        className="btn-primary"
        disabled={!valid}
        onClick={() => {
          const trimmed = name.trim();
          setUsers([trimmed]);
          onSelect(trimmed);
        }}
      >
        Let's go
      </button>
    </div>
  );
}
