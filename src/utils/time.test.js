import { describe, it, expect } from 'vitest';
import { parseTime, formatTime } from './time';

describe('parseTime', () => {
  it('parses mm:ss', () => {
    expect(parseTime('4:30')).toBe(270);
    expect(parseTime('0:45')).toBe(45);
  });

  it('parses h:mm:ss', () => {
    expect(parseTime('1:02:03')).toBe(3723);
  });

  it('treats a bare number as seconds', () => {
    expect(parseTime('90')).toBe(90);
  });

  it('returns 0 for empty or junk input', () => {
    expect(parseTime('')).toBe(0);
    expect(parseTime('   ')).toBe(0);
    expect(parseTime('abc')).toBe(0);
    expect(parseTime('1:xx')).toBe(0);
    expect(parseTime(null)).toBe(0);
    expect(parseTime(undefined)).toBe(0);
  });

  it('rejects negatives rather than producing nonsense durations', () => {
    expect(parseTime('-30')).toBe(0);
    expect(parseTime('-1:30')).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats as m:ss under an hour', () => {
    expect(formatTime(270)).toBe('4:30');
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats as h:mm:ss past an hour', () => {
    expect(formatTime(3723)).toBe('1:02:03');
  });

  it('shows a dash when there is nothing to show', () => {
    expect(formatTime(0)).toBe('—');
    expect(formatTime(null)).toBe('—');
  });

  it('round-trips with parseTime', () => {
    for (const s of ['4:30', '12:07', '1:02:03']) {
      expect(formatTime(parseTime(s))).toBe(s);
    }
  });
});
