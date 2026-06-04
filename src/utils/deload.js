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

  // 2. Stall: estimated 1RM is strictly declining across 3 consecutive sessions.
  // Requires a monotonically falling trend (orms[2] < orms[1] < orms[0]) so that
  // a flat 1RM (completing prescribed sets at the same %) never triggers a false
  // stall, and a V-shape dip that is already recovering also doesn't fire.
  for (const lift of TRACKED_LIFTS) {
    const liftSessions = logs
      .filter((l) => !l.isDeload && l.exercises?.some((e) => e.name === lift && e.estimatedOneRM != null))
      .slice(-3)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (liftSessions.length >= 3) {
      const orms = liftSessions.map((l) => l.exercises.find((e) => e.name === lift)?.estimatedOneRM ?? 0);
      if (orms[2] < orms[1] && orms[1] < orms[0]) {
        reasons.push(`${lift} has stalled for 3 sessions`);
      }
    }
  }

  // 3. Hard cap: 7 weeks (49 days) without a deload, measured from the last
  // deload date if one exists, otherwise from when the current block started.
  // Previously used block.week >= 7 for the no-deload case, but block.week
  // counts sessions not calendar weeks, so it fired after ~2.5 real weeks.
  const referenceDate = block.lastDeloadDate ?? block.startDate;
  if (referenceDate) {
    const daysSince = (Date.now() - new Date(referenceDate).getTime()) / 86400000;
    if (daysSince >= 49) reasons.push('7 weeks since last deload');
  }

  return { triggered: reasons.length > 0, reasons };
}
