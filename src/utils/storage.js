const KEY_USERS = 'bjj_users';
const key1RM = (u) => `bjj_1rm_${u}`;
const keyLog = (u) => `bjj_log_${u}`;
const keyBlock = (u) => `bjj_block_${u}`;

function get(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getUsers() { return get(KEY_USERS, []); }
export function setUsers(names) { set(KEY_USERS, names); }

export function get1RMs(username) { return get(key1RM(username), {}); }
export function set1RM(username, lift, value) {
  const rms = get1RMs(username);
  rms[lift] = value;
  set(key1RM(username), rms);
}
export function setAll1RMs(username, obj) { set(key1RM(username), obj); }

export function getLogs(username) { return get(keyLog(username), []); }
export function addLog(username, entry) {
  const logs = getLogs(username);
  logs.push(entry);
  set(keyLog(username), logs);
}

export function getBlock(username) {
  return get(keyBlock(username), { week: 1, startDate: new Date().toISOString().slice(0, 10), lastDeloadDate: null });
}
export function setBlock(username, data) { set(keyBlock(username), data); }

export function renameUser(oldName, newName) {
  const rms = get1RMs(oldName);
  const logs = getLogs(oldName);
  const block = getBlock(oldName);
  setAll1RMs(newName, rms);
  set(keyLog(newName), logs);
  setBlock(newName, block);
  localStorage.removeItem(key1RM(oldName));
  localStorage.removeItem(keyLog(oldName));
  localStorage.removeItem(keyBlock(oldName));
  const users = getUsers().map((u) => (u === oldName ? newName : u));
  setUsers(users);
}
