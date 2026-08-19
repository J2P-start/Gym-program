import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { getLogs, getHyrox } from '../utils/storage';
import { TRACKED_LIFTS } from '../data/workout';
import { weeklyRunVolume, runSessions, stationSummary, formatPace, formatRate, formatVolume } from '../utils/hyroxStats';
import { currentPlanWeek, phaseForWeek } from '../utils/hyroxPhase';
import { weekStart } from '../utils/progression';
import { localDateStr } from '../utils/dates';
import { formatTime } from '../utils/time';
import SessionDetail from './SessionDetail';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const COLORS = ['#d7e9f7', '#cdbcf0', '#f5d8a8', '#f0a8b8', '#9ec8f0', '#a8e8cf'];
const AXIS = {
  x: { ticks: { color: '#9a9aa2', maxTicksLimit: 6 }, grid: { color: '#2e2e33' } },
  y: { ticks: { color: '#9a9aa2' }, grid: { color: '#2e2e33' } },
};

function LiftChart({ lift, logs, color }) {
  const points = useMemo(() => {
    const out = [];
    for (const log of logs) {
      const ex = log.exercises?.find((e) => e.name === lift);
      if (!ex) continue;
      const heaviest = ex.sets?.reduce((m, s) => Math.max(m, s.actualWeight ?? 0), 0) ?? 0;
      out.push({ date: log.date, estimated: ex.estimatedOneRM, actual: heaviest, isDeload: log.isDeload });
    }
    return out;
  }, [lift, logs]);

  if (points.length === 0) return (
    <div className="chart-card">
      <h3>{lift}</h3>
      <p className="no-data">No data yet</p>
    </div>
  );

  const deloadBg = {
    id: 'deloadBands',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      points.forEach((p, i) => {
        if (!p.isDeload) return;
        const x = scales.x.getPixelForValue(i);
        const w = scales.x.getPixelForValue(1) - scales.x.getPixelForValue(0);
        ctx.save();
        ctx.fillStyle = 'rgba(248,113,113,0.15)';
        ctx.fillRect(x - w / 2, chartArea.top, w, chartArea.bottom - chartArea.top);
        ctx.restore();
      });
    },
  };

  const data = {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: 'Est. 1RM (kg)',
        data: points.map((p) => p.estimated),
        borderColor: color,
        backgroundColor: color + '33',
        tension: 0.3,
        spanGaps: true,
      },
      {
        label: 'Heaviest set (kg)',
        data: points.map((p) => p.actual || null),
        borderColor: color + '88',
        borderDash: [4, 4],
        tension: 0.3,
        spanGaps: true,
        pointRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { labels: { color: '#f4f4f6', font: { size: 11, family: 'Poppins' } } }, tooltip: { mode: 'index' } },
    scales: {
      x: { ticks: { color: '#9a9aa2', maxTicksLimit: 6 }, grid: { color: '#2e2e33' } },
      y: { ticks: { color: '#9a9aa2' }, grid: { color: '#2e2e33' } },
    },
  };

  return (
    <div className="chart-card">
      <h3>{lift}</h3>
      <Line data={data} options={options} plugins={[deloadBg]} />
    </div>
  );
}

/**
 * Weekly running volume against the phase's target band. The plan sets an
 * explicit km/week target per phase, so the bar only means something next to
 * the range it's being measured against.
 */
function RunVolumeChart({ logs, targetKm }) {
  const weeks = useMemo(() => weeklyRunVolume(logs).slice(-12), [logs]);
  if (weeks.length === 0) {
    return <div className="chart-card"><h3>Running volume</h3><p className="no-data">No runs logged yet</p></div>;
  }

  const targetBand = targetKm && {
    id: 'targetBand',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      const top = scales.y.getPixelForValue(targetKm[1]);
      const bottom = scales.y.getPixelForValue(targetKm[0]);
      ctx.save();
      ctx.fillStyle = 'rgba(215,233,247,0.12)';
      ctx.fillRect(chartArea.left, top, chartArea.right - chartArea.left, bottom - top);
      ctx.restore();
    },
  };

  // The last bar is the last week you *logged*, which isn't necessarily this
  // one — so read the current week explicitly rather than assuming.
  const thisWeek = weekStart(localDateStr());
  const thisWeekKm = weeks.find((w) => w.week === thisWeek)?.km ?? 0;

  return (
    <div className="chart-card">
      <h3>Running volume</h3>
      <p className="chart-sub">
        This week <strong>{thisWeekKm} km</strong>
        {targetKm && ` · target ${targetKm[0]}–${targetKm[1]} km`}
      </p>
      <Bar
        data={{
          labels: weeks.map((w) => w.week.slice(5)),
          datasets: [{ label: 'km', data: weeks.map((w) => w.km), backgroundColor: '#9ec8f0', borderRadius: 4 }],
        }}
        options={{
          responsive: true,
          plugins: { legend: { display: false } },
          // Keep the target band on screen even in a low-volume week, so the
          // gap between what you ran and what the phase asks for is visible.
          scales: { x: AXIS.x, y: { ...AXIS.y, beginAtZero: true, suggestedMax: targetKm ? targetKm[1] * 1.15 : undefined } },
        }}
        plugins={targetBand ? [targetBand] : []}
      />
    </div>
  );
}

/** Pace trend. The axis is reversed because a lower number is a faster run. */
function PaceChart({ logs }) {
  const points = useMemo(() => runSessions(logs).filter((s) => s.pace), [logs]);
  if (points.length === 0) {
    return <div className="chart-card"><h3>Running pace</h3><p className="no-data">No timed runs yet</p></div>;
  }

  const best = Math.min(...points.map((p) => p.pace));
  return (
    <div className="chart-card">
      <h3>Running pace</h3>
      <p className="chart-sub">
        Best <strong>{formatPace(best)}</strong> · latest {formatPace(points[points.length - 1].pace)}
      </p>
      <Line
        data={{
          labels: points.map((p) => p.date.slice(5)),
          datasets: [{
            label: 'sec / km',
            data: points.map((p) => Math.round(p.pace)),
            borderColor: '#a8e8cf',
            backgroundColor: '#a8e8cf33',
            tension: 0.3,
          }],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => formatPace(c.parsed.y) } },
          },
          scales: {
            x: AXIS.x,
            // Reversed: faster runs sit higher on the chart, which is what
            // "improving" should look like.
            y: { ...AXIS.y, reverse: true, ticks: { ...AXIS.y.ticks, callback: (v) => formatPace(v) } },
          },
        }}
      />
    </div>
  );
}

/** How much of each race station has actually been trained, and how fast. */
function StationTable({ logs }) {
  const rows = useMemo(() => stationSummary(logs), [logs]);
  const trained = rows.filter((r) => r.sessions > 0).length;

  return (
    <div className="chart-card">
      <h3>Stations</h3>
      <p className="chart-sub">{trained} of 8 trained</p>
      <div className="station-table">
        {rows.map((r) => (
          <div key={r.key} className={`station-row ${r.sessions === 0 ? 'untrained' : ''}`}>
            <div className="station-name">
              {r.name}
              <span className="station-spec">{r.raceSpec}</span>
            </div>
            <div className="station-stats">
              {r.sessions === 0 ? (
                <span className="station-none">Not yet trained</span>
              ) : (
                <>
                  <span className="station-count">×{r.sessions}</span>
                  <span>{formatVolume(r, r.lastVolume)}{r.lastTimeSec > 0 && ` in ${formatTime(r.lastTimeSec)}`}</span>
                  <span className="station-best">Best {formatRate(r)}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Progress({ user }) {
  const logs = getLogs(user);
  const sessionHistory = useMemo(
    () => logs.map((log, index) => ({ log, index })).reverse(),
    [logs]
  );
  const [openIndex, setOpenIndex] = useState(null);

  const targetKm = useMemo(() => {
    const hyrox = getHyrox(user);
    return phaseForWeek(currentPlanWeek(hyrox)).runTargetKm ?? null;
  }, [user]);

  if (openIndex !== null && logs[openIndex]) {
    return <SessionDetail log={logs[openIndex]} onBack={() => setOpenIndex(null)} />;
  }

  return (
    <div className="progress-screen">
      <h2>Hyrox</h2>
      <div className="charts-grid">
        <RunVolumeChart logs={logs} targetKm={targetKm} />
        <PaceChart logs={logs} />
        <StationTable logs={logs} />
      </div>

      <h2>Strength</h2>
      <div className="charts-grid">
        {TRACKED_LIFTS.map((lift, i) => (
          <LiftChart key={lift} lift={lift} logs={logs} color={COLORS[i % COLORS.length]} />
        ))}
      </div>

      <h2>Session history</h2>
      <div className="history-list">
        {sessionHistory.length === 0 && <p className="no-data">No sessions logged yet</p>}
        {sessionHistory.map(({ log, index }) => (
          <button key={index} className="history-item" onClick={() => setOpenIndex(index)}>
            <div className="history-top">
              <span className="history-session">{log.session}</span>
              <span className="history-date">{log.date}</span>
            </div>
            <div className="history-meta">
              <span>Fatigue: {['😴', '🙂', '💪', '😤', '🥵'][log.fatigueRating - 1]} {log.fatigueRating}/5</span>
              {log.isDeload && <span className="deload-badge">Deload</span>}
              <span>Block week {log.blockWeek}</span>
              <span className="history-chevron">›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
