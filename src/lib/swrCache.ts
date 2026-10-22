// Tiny in-memory stale-while-revalidate store for dashboard tab data.
// Pages seed their state from cacheGet() so returning to a tab shows the
// last-loaded rows instantly, then refetch in the background and cacheSet()
// the fresh result. Lives only in memory: a refresh or logout starts clean.

const store = new Map<string, unknown>();
let owner: string | null = null;

export function cacheGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function cacheSet<T>(key: string, value: T) {
  store.set(key, value);
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
