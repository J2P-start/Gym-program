/**
 * Parse a duration typed as "mm:ss", "h:mm:ss", or a plain number of seconds.
 * Returns seconds, or 0 when nothing usable was entered.
 */
export function parseTime(input) {
  if (input === null || input === undefined) return 0;
  const str = String(input).trim();
  if (!str) return 0;

  if (str.includes(':')) {
    const parts = str.split(':').map((p) => parseFloat(p));
    if (parts.some((p) => isNaN(p) || p < 0)) return 0;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  const n = parseFloat(str);
  return isNaN(n) || n < 0 ? 0 : n;
}

/** Format seconds as m:ss, or h:mm:ss once past an hour. */
export function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
