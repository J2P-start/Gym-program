import { useState } from 'react';
import ProfileSelector from './components/ProfileSelector';
import Home from './components/Home';
import SessionScreen from './components/SessionScreen';
import Progress from './components/Progress';
import Settings from './components/Settings';
import Recovery from './components/Recovery';

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [session, setSession] = useState(null); // { index, isDeload }
  const [deloadDismissed, setDeloadDismissed] = useState(false);

  if (!user) {
    return <ProfileSelector onSelect={(name) => { setUser(name); setTab('home'); }} />;
  }

  if (session) {
    return (
      <SessionScreen
        user={user}
        sessionIndex={session.index}
        isDeload={session.isDeload}
        onBack={() => setSession(null)}
        onFinish={() => { setSession(null); setTab('home'); }}
      />
    );
  }

  return (
    <div className="app">
      <main className="main-content">
        {tab === 'home' && (
          <Home
            user={user}
            deloadDismissed={deloadDismissed}
            onDismissDeload={() => setDeloadDismissed(true)}
            onStartSession={(index) => setSession({ index, isDeload: false })}
            onSwitchUser={() => setUser(null)}
          />
        )}
        {tab === 'progress' && <Progress user={user} />}
        {tab === 'recovery' && <Recovery />}
        {tab === 'settings' && (
          <Settings
            user={user}
            onUserChange={(name) => setUser(name)}
            onSwitchUser={() => setUser(null)}
          />
        )}
      </main>

      <nav className="bottom-nav">
        {[
          { key: 'home',     label: 'Home',     icon: '🏠' },
          { key: 'progress', label: 'Progress', icon: '📈' },
          { key: 'recovery', label: 'Recovery', icon: '🛁' },
          { key: 'settings', label: 'Settings', icon: '⚙️' },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            className={`nav-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
