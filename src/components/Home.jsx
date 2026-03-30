import { useMemo } from 'react';
import { WEEK_SCHEDULE, SESSIONS } from '../data/workout';
import { getBlock } from '../utils/storage';
import { checkDeload } from '../utils/deload';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKS_TO_SHOW = 4;

function getWeekDays(offsetWeeks) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  // Start of this week = Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function Home({ user, onStartSession, onDismissDeload, deloadDismissed, onSwitchUser }) {
  const todayName = DAY_NAMES[new Date().getDay()];
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const block = getBlock(user);
  const deload = useMemo(() => checkDeload(user), [user]);

  const todaySchedule = WEEK_SCHEDULE.find((d) => d.day === todayName);

  const weeks = Array.from({ length: WEEKS_TO_SHOW }, (_, i) => ({
    label: i === 0 ? 'This week' : i === 1 ? 'Next week' : `+${i} weeks`,
    days: getWeekDays(i),
  }));

  return (
    <div className="home">
      <div className="home-header">
        <span className="block-badge">Block week {block.week}</span>
        <button className="user-badge-btn" onClick={onSwitchUser}>{user} ↓</button>
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

      <div className="multi-week-scroll">
        {weeks.map(({ label, days }, wi) => (
          <div key={wi} className="week-block">
            <div className="week-label">{label}</div>
            <div className="week-strip">
              {days.map((date, di) => {
                const schedule = WEEK_SCHEDULE[di];
                const dateStr = date.toISOString().slice(0, 10);
                const isToday = dateStr === todayDateStr;
                return (
                  <div key={di} className={`day-chip ${isToday ? 'today' : ''} type-${schedule.type}`}>
                    <span className="day-abbr">{schedule.day.slice(0, 3)}</span>
                    <span className="day-type">
                      {schedule.type === 'gym'
                        ? SESSIONS[schedule.sessionIndex].name.split(' & ')[0]
                        : schedule.type === 'bjj' ? 'BJJ' : 'Rest'}
                    </span>
                    {isToday && <span className="today-dot" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
