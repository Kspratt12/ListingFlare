// Loads the signed-in agent's listings for the dashboard and reports ONE of four outcomes, so the page can never be
// left loading and can never show "no listings" unless a query actually succeeded.
//
//   ready       the query succeeded (rows may be empty: that is a real empty account)
//   no-session  there is no usable session (none, or reading it failed): show a sign-in recovery state
//   error       the query failed: show an error with Retry; `rows` holds cached rows ONLY if they belong to this user
//   null        the result is stale (the account changed or a newer load started): the caller must ignore it
//
// The helper does no I/O itself; the page passes the real session lookup and query as dependencies.

export interface ListingsQueryResult<T> {
  data: T[] | null;
  count: number | null;
  error: unknown;
}

export type ListingsLoad<T> =
  | { status: "ready"; userId: string; rows: T[]; hasEverCreated: boolean }
  | { status: "no-session" }
  | { status: "error"; userId: string; rows: T[] };

export interface ListingsLoadDeps<T> {
  getUserId: () => Promise<string | null>;
  fetchRows: (userId: string) => PromiseLike<ListingsQueryResult<T>>;
  // Cached rows for this user, or undefined. Must return rows only when the cache is confirmed to belong to `userId`.
  getCachedRows: (userId: string) => T[] | undefined;
  // False once this load has been superseded (unmounted, retried, or the account changed).
  isCurrent: () => boolean;
}

export async function loadDashboardListings<T>(deps: ListingsLoadDeps<T>): Promise<ListingsLoad<T> | null> {
  let userId: string | null;
  try {
    userId = await deps.getUserId();
  } catch {
    userId = null;
  }
  if (!deps.isCurrent()) return null;
  if (!userId) return { status: "no-session" };

  let result: ListingsQueryResult<T> | null = null;
  try {
    result = await deps.fetchRows(userId);
  } catch {
    result = null;
  }
  if (!deps.isCurrent()) return null;

  if (!result || result.error || !result.data) {
    return { status: "error", userId, rows: deps.getCachedRows(userId) ?? [] };
  }
  const rows = result.data;
  return { status: "ready", userId, rows, hasEverCreated: (result.count || 0) > 0 || rows.length > 0 };
}
