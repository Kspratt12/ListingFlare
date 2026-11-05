// Tiny in-memory stale-while-revalidate store for dashboard tab data.
// Pages seed their state from cacheGet() so returning to a tab shows the
// last-loaded rows instantly, then refetch in the background and cacheSet()
// the fresh result. Lives only in memory: a refresh or logout starts clean.
//
// Every entry belongs to the current owner (the signed-in agent). The owner is
// set the moment the account is known to change (see agentSession.tsx), which
// empties the store, and nothing can be read while there is no owner.

const store = new Map<string, unknown>();
let owner: string | null = null;

export function cacheGet<T>(key: string): T | undefined {
  if (owner === null) return undefined;
  return store.get(key) as T | undefined;
}

export function cacheSet<T>(key: string, value: T) {
  store.set(key, value);
}

// Same as cacheGet, but only when the cache belongs to `userId`.
export function cacheGetFor<T>(key: string, userId: string | null): T | undefined {
  if (owner === null || owner !== userId) return undefined;
  return store.get(key) as T | undefined;
}

// Same as cacheSet, but ignored unless the cache belongs to `userId`.
export function cacheSetFor<T>(key: string, value: T, userId: string | null) {
  if (owner === null || owner !== userId) return;
  store.set(key, value);
}

export function getCacheOwner(): string | null {
  return owner;
}

// Drops everything when a different agent signs in on the same tab.
export function setCacheOwner(userId: string | null) {
  if (owner !== userId) {
    store.clear();
    owner = userId;
  }
}

export function clearCache() {
  store.clear();
  owner = null;
}
