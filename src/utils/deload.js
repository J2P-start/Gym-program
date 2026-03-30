import { getLogs, getBlock } from './storage';
import { TRACKED_LIFTS } from '../data/workout';

/**
 * Returns { triggered: boolean, reasons: string[] }
 */
export function checkDeload(username) {
  const logs = getLogs(username);
  const block = getBlock(username);
  const reasons = [];

  // 1. Fatigue: rated 4 or 5 on 2 of last 3 sessions
  const recent3 = logs.filter((l) => !l.isDeload).slice(-3);
  const highFatigue = recent3.filter((l) => l.fatigueRating >= 4).length;
  if (recent3.length >= 2 && highFatigue >= 2) {
    reasons.push('High fatigue in recent sessions');
  }

  // 2. Stall: same 1RM lift fails to progress for 3 consecutive sessions
  for (const lift of TRACKED_LIFTS) {
    const liftSessions = logs
      .filter((l) => !l.isDeload && l.exercises?.some((e) => e.name === lift && e.estimatedOneRM))
      .slice(-3);
    if (liftSessions.length >= 3) {
      const orms = liftSessions.map((l) => l.exercises.find((e) => e.name === lift)?.estimatedOneRM ?? 0);
      if (orms[2] <= orms[0] && orms[1] <= orms[0]) {
        reasons.push(`${lift} has stalled for 3 sessions`);
        break; // one stall reason is enough
      }
    }
  }

  // 3. Hard cap: 7 weeks without a deload
  if (block.lastDeloadDate) {
    const daysSince = (Date.now() - new Date(block.lastDeloadDate).getTime()) / 86400000;
    if (daysSince >= 49) reasons.push('7 weeks since last deload');
  } else if (block.week >= 7) {
    reasons.push('7 weeks since last deload');
  }

  return { triggered: reasons.length > 0, reasons };
}
