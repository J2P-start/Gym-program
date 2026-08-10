// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getLogs, addLog, getLastSession } from './storage';
import { localDateStr } from './dates';

// Use a real localStorage shim provided by vitest's jsdom environment
beforeEach(() => {
  localStorage.clear();
});

function log(session, date) {
  return { session, date, isDeload: false, fatigueRating: 2, exercises: [] };
}

describe('getLastSession', () => {
  const TODAY = localDateStr();
  const YESTERDAY = localDateStr(new Date(Date.now() - 86400000));
  const TWO_DAYS_AGO = localDateStr(new Date(Date.now() - 2 * 86400000));

  it('returns null when there are no logs', () => {
    expect(getLastSession('user', 'Monday — Push & Legs')).toBeNull();
  });

  it('returns null when the only matching session is today', () => {
    addLog('user', log('Monday — Push & Legs', TODAY));
    expect(getLastSession('user', 'Monday — Push & Legs')).toBeNull();
  });

  it('returns the most recent matching session that is not today', () => {
    addLog('user', log('Monday — Push & Legs', TWO_DAYS_AGO));
    addLog('user', log('Monday — Push & Legs', YESTERDAY));
    addLog('user', log('Monday — Push & Legs', TODAY));
    const result = getLastSession('user', 'Monday — Push & Legs');
    expect(result.date).toBe(YESTERDAY);
  });

  it('ignores sessions with a different name', () => {
    addLog('user', log('Wednesday — Pull & Legs', YESTERDAY));
    expect(getLastSession('user', 'Monday — Push & Legs')).toBeNull();
  });

  it('returns null when only other sessions exist, not today excluded by mistake', () => {
    addLog('user', log('Wednesday — Pull & Legs', YESTERDAY));
    addLog('user', log('Monday — Push & Legs', TODAY));
    expect(getLastSession('user', 'Monday — Push & Legs')).toBeNull();
  });
});

describe('addLog', () => {
  it('returns true on successful write', () => {
    expect(addLog('user', log('Monday — Push & Legs', '2026-01-01'))).toBe(true);
  });

  it('appends entries in order', () => {
    addLog('user', log('A', '2026-01-01'));
    addLog('user', log('B', '2026-01-02'));
    const logs = getLogs('user');
    expect(logs).toHaveLength(2);
    expect(logs[0].session).toBe('A');
    expect(logs[1].session).toBe('B');
  });
});
