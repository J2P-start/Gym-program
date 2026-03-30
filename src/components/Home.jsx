import { useMemo } from 'react';
import { WEEK_SCHEDULE, SESSIONS } from '../data/workout';
import { getBlock } from '../utils/storage';
import { checkDeload } from '../utils/deload';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Home({ user, onStartSession, onDismissDeload, deloadDismissed }) {
  const todayName = DAY_NAMES[new Date().getDay()];
  const block = getBlock(user);
  const deload = useMemo(() => checkDeload(user), [user]);

  const todaySchedule = WEEK_SCHEDULE.find((d) => d.day === todayName);

  return (
    <div className="home">
      <div className="home-header">
        <span className="block-badge">Block week {block.week}</span>
        <span className="user-badge">{user}</span>
      </div>

      {deload.triggered && !deloadDismissed && (
        <div className="deload-banner">
          <div>
            <strong>Time for a lighter week</strong>
            <ul>
              {deload.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
          <button className="btn-dismiss" onClick={onDismissDeload}>Dismiss</button>
        </div>
      )}

      <div className="week-strip">
        {WEEK_SCHEDULE.map(({ day, type, sessionIndex }) => {
          const isToday = day === todayName;
          return (
            <div key={day} className={`day-chip ${isToday ? 'today' : ''} type-${type}`}>
              <span className="day-abbr">{day.slice(0, 3)}</span>
              <span className="day-type">
                {type === 'gym' ? SESSIONS[sessionIndex].name.split(' & ')[0] : type === 'bjj' ? 'BJJ' : 'Rest'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="today-card">
        {todaySchedule?.type === 'gym' && (
          <>
            <h2>{SESSIONS[todaySchedule.sessionIndex].name}</h2>
            <p className="session-note">{SESSIONS[todaySchedule.sessionIndex].note}</p>
            <p className="session-duration">{SESSIONS[todaySchedule.sessionIndex].duration}</p>
            <button className="btn-primary start-btn" onClick={() => onStartSession(todaySchedule.sessionIndex)}>
              Start session
            </button>
          </>
        )}
        {todaySchedule?.type === 'bjj' && (
          <div className="rest-card">
            <h2>BJJ day</h2>
            <p>Focus on technique. Recover well.</p>
          </div>
        )}
        {todaySchedule?.type === 'recovery' && (
          <div className="rest-card">
            <h2>Recovery day</h2>
            <p>Mobility + sauna. See Recovery tab.</p>
          </div>
        )}
      </div>
    </div>
  );
}
