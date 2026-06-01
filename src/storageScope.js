const ACTIVE_SCOPE_KEY = 'voiceBusinessTrackerActiveUserId';
const GLOBAL_KEYS = new Set([
  ACTIVE_SCOPE_KEY,
  'voiceBusinessTrackerAuth',
  'darkMode',
]);

function cleanScope(value) {
  return String(value || 'demo')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 80) || 'demo';
}

export function setStorageScope(userId) {
  localStorage.setItem(ACTIVE_SCOPE_KEY, cleanScope(userId));
}

export function clearStorageScope() {
  localStorage.removeItem(ACTIVE_SCOPE_KEY);
}

export function getStorageScope() {
  return cleanScope(localStorage.getItem(ACTIVE_SCOPE_KEY) || 'demo');
}

export function scopedKey(key) {
  if (GLOBAL_KEYS.has(key) || key.startsWith('vbt:')) {
    return key;
  }

  return `vbt:${getStorageScope()}:${key}`;
}

export function readScopedString(key) {
  const scoped = localStorage.getItem(scopedKey(key));
  if (scoped !== null) {
    return scoped;
  }

  return localStorage.getItem(key);
}

export function writeScopedString(key, value) {
  localStorage.setItem(scopedKey(key), value);
}

export function removeScopedValue(key) {
  localStorage.removeItem(scopedKey(key));
}

export function readScopedJson(key, fallback) {
  try {
    const value = readScopedString(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeScopedJson(key, value) {
  writeScopedString(key, JSON.stringify(value));
}
