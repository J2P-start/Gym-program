import { SESSIONS } from './workout';
import { HYROX_SESSIONS } from './hyrox';

// Every session in the app, keyed by id. The original BJJ strength sessions are
// no longer on the weekly schedule, but they stay in the registry so historical
// log entries and progress charts still resolve correctly.
const REGISTRY = {
  ...HYROX_SESSIONS,
  ...Object.fromEntries(SESSIONS.map((s) => [s.id, s])),
};

export function getSessionById(id) {
  return REGISTRY[id] ?? null;
}

export function allSessions() {
  return Object.values(REGISTRY);
}
