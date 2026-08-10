import { useMemo, useState } from 'react';
import { getWeekTemplate, DAY_CARD_COPY, TOTAL_WEEKS } from '../data/hyrox';
import { getSessionById } from '../data/sessions';
import { getBlock, getHyrox } from '../utils/storage';
import { checkDeload } from '../utils/deload';
import { currentPlanWeek, phaseForWeek, weekWithinPhase, daysUntilRace, dateForPlanDay } from '../utils/hyroxPhase';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKS_TO_SHOW = 4;

export default function Home({ user, onStartSession, onDismissDeload, deloadDismissed, onSwitchUser, lastFinished }) {
  const todayName = DAY_NAMES[new Date().getDay()];
  const todayDateStr = new Date().toISOString().slice(0, 10);

  const block = useMemo(() => getBlock(user), [user, lastFinished]);
  const deload = useMemo(() => checkDeload(user), [user, lastFinished]);
  const hyrox = useMemo(() => getHyrox(user), [user, lastFinished]);

  const week = currentPlanWeek(hyrox);
  const phase = phaseForWeek(week);
  const daysToRace = daysUntilRace(hyrox);

  // Day index is Monday-based (0=Mon…6=Sun) to match the weekly template.
  const todayIndex = (new Date().getDay() + 6) % 7;
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);

  const template = useMemo(() => getWeekTemplate(week), [week]);
  const selected = template[selectedDayIndex];
  const selectedSession = selected?.sessionId ? getSessionById(selected.sessionId) : null;
  const attachedSession = selected?.attachedId ? getSessionById(selected.attachedId) : null;

  // The 4-week scroll now shows genuinely different weeks, since each upcoming
  // week resolves its own template (and may sit in a different phase).
  const weeks = useMemo(() => Array.from({ length: WEEKS_TO_SHOW }, (_, i) => {
    const w = Math.min(TOTAL_WEEKS, week + i);
    return {
      weekNumber: w,
      phase: phaseForWeek(w),
      label: i === 0 ? 'This week' : i === 1 ? 'Next week' : `+${i} weeks`,
      days: getWeekTemplate(w),
      isCurrent: i === 0,
      dates: Array.from({ length: 7 }, (_, di) => dateForPlanDay(hyrox, w, di)),
    };
  }), [week, hyrox]);

  // The Taper phase is a planned deload by design — surfacing a "take it
  // easier" banner during race week would be noise, so it's suppressed there.
  // The trigger logic in deload.js is unchanged.
  const showDeload = deload.triggered && !deloadDismissed && phase.key !== 'taper';

  const copy = DAY_CARD_COPY[selected?.type];

  return (
    <div className="home">
      <div className="home-header">
        <span className={`phase-badge phase-${phase.key}`}>{phase.name}</span>
        <button className="user-badge-btn" onClick={onSwitchUser}>{user} ↓</button>
      </div>

      <div className="plan-meta">
        <span className="plan-week">Week {week} of {TOTAL_WEEKS}</span>
        <span className="plan-sep">·</span>
        <span>Week {weekWithinPhase(week)} of {phase.name}</span>
        {daysToRace !== null && daysToRace >= 0 && (
          <>
            <span className="plan-sep">·</span>
            <span className="race-countdown">
              {daysToRace === 0 ? 'Race day' : `${daysToRace} days to race`}
            </span>
          </>
        )}
        <span className="plan-sep">·</span>
        <span className="block-badge-inline">Block wk {block.week}</span>
      </div>

      <p className="phase-focus">{phase.focus}</p>
      <p className="phase-bjj">BJJ this phase: {phase.bjj}</p>

      {showDeload && (
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

      {/* Scrollable week view */}
      <div className="multi-week-scroll">
        {weeks.map(({ label, days, weekNumber, phase: wPhase, isCurrent, dates }) => (
          <div key={weekNumber} className="week-block">
            <div className="week-label">
              {label}
              <span className={`week-phase-tag phase-${wPhase.key}`}>Wk {weekNumber} · {wPhase.name}</span>
            </div>
            <div className="week-strip">
              {days.map((day, di) => {
                const dateStr = dates[di]?.toISOString().slice(0, 10);
                const isToday = isCurrent && day.day === todayName;
                const isSelected = isCurrent && di === selectedDayIndex;
                return (
                  <button
                    key={di}
                    className={`day-chip ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} type-${day.type}`}
                    onClick={() => { if (isCurrent) setSelectedDayIndex(di); }}
                    disabled={!isCurrent}
                    title={dateStr}
                  >
                    <span className="day-abbr">{day.day.slice(0, 3)}</span>
                    <span className="day-type">{day.label}</span>
                    {isToday && dateStr === todayDateStr && <span className="today-dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Session card for selected day */}
      <div className="today-card">
        {selectedSession ? (
          <>
            <div className="session-day-label">{selected.day}</div>
            <h2>{selectedSession.name}</h2>
            <p className="session-note">{selectedSession.note}</p>
            <p className="session-duration">{selectedSession.duration}</p>
            <button className="btn-primary start-btn" onClick={() => onStartSession(selectedSession.id)}>
              Start session
            </button>
          </>
        ) : (
          <div className="rest-card">
            <div className="session-day-label">{selected?.day}</div>
            <h2>{copy?.title ?? 'Rest day'}</h2>
            <p>{copy?.body ?? 'Nothing scheduled.'}</p>
          </div>
        )}

        {attachedSession && (
          <div className="attached-session">
            <div className="attached-label">Also today</div>
            <h3>{attachedSession.name}</h3>
            <p className="session-note">{attachedSession.note}</p>
            <button className="btn-secondary" onClick={() => onStartSession(attachedSession.id)}>
              Start {attachedSession.duration}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
