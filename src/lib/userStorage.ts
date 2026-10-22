// Per-agent localStorage helpers. Every key is scoped by user ID so that a
// shared device never shows one agent another agent's display state, and
// clearUserStorage() wipes everything on logout.

const PREFIX = "listingflare:";

// Keys written before scoping existed. Removed on logout so older sessions
// don't leave state behind on a shared device.
const LEGACY_KEYS = ["lf_getting_started_dismissed", "listingflare_draft"];

function userKey(name: string, userId: string) {
  return `${PREFIX}${name}:${userId}`;
}

export function readUserPref(name: string, userId: string): string | null {
  try {
    return localStorage.getItem(userKey(name, userId));
  } catch {
    return null;
  }
}

export function writeUserPref(name: string, userId: string, value: string) {
  try {
    localStorage.setItem(userKey(name, userId), value);
  } catch {
    // private mode / quota: preference just won't persist
  }
}

export function clearUserStorage() {
  try {
    const doomed: string[] = [...LEGACY_KEYS];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
