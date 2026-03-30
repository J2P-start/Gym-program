import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getLogs } from '../utils/storage';
import { TRACKED_LIFTS } from '../data/workout';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const COLORS = ['#4ade80', '#60a5fa', '#f59e0b', '#f87171', '#a78bfa', '#34d399'];

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
    plugins: { legend: { labels: { color: '#e5e7eb', font: { size: 11 } } }, tooltip: { mode: 'index' } },
    scales: {
      x: { ticks: { color: '#9ca3af', maxTicksLimit: 6 }, grid: { color: '#374151' } },
      y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
    },
  };

  return (
    <div className="chart-card">
      <h3>{lift}</h3>
      <Line data={data} options={options} plugins={[deloadBg]} />
    </div>
  );
}

export default function Progress({ user }) {
  const logs = getLogs(user);
  const sessionHistory = [...logs].reverse();

  return (
    <div className="progress-screen">
      <h2>Progress</h2>
      <div className="charts-grid">
        {TRACKED_LIFTS.map((lift, i) => (
          <LiftChart key={lift} lift={lift} logs={logs} color={COLORS[i % COLORS.length]} />
        ))}
      </div>

      <h2>Session history</h2>
      <div className="history-list">
        {sessionHistory.length === 0 && <p className="no-data">No sessions logged yet</p>}
        {sessionHistory.map((log, i) => (
          <div key={i} className="history-item">
            <div className="history-top">
              <span className="history-session">{log.session}</span>
              <span className="history-date">{log.date}</span>
            </div>
            <div className="history-meta">
              <span>Fatigue: {['😴', '🙂', '💪', '😤', '🥵'][log.fatigueRating - 1]} {log.fatigueRating}/5</span>
              {log.isDeload && <span className="deload-badge">Deload</span>}
              <span>Block week {log.blockWeek}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
