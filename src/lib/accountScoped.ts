// Ties a dashboard request to the ACCOUNT THAT STARTED IT.
//
// A tab starts a request while account A is signed in. If the session changes to B before the request finishes, A's result
// must not be stored in the cache or shown by a tab that now belongs to B. The session manager (sessionState.ts) bumps a
// generation counter on every account change, so a request is "stale" when the generation moved since it started.
//
// Usage in a tab's load function:
//
//   const scope = accountScope(getSessionGeneration);
//   const uid = await getLocalUserId();
//   if (scope.isStale()) return;
//   const result = await query(uid);
//   if (scope.isStale()) return;          // the account changed: ignore the result completely
//   setRows(result); cacheSetFor(key, result, uid);   // cacheSetFor also refuses a user who no longer owns the cache
//
// Same-user auth events (token refresh, tab focus) do not change the generation, so they never make a load stale.

export function accountScope(getGeneration: () => number) {
  const startedAt = getGeneration();
  return { isStale: () => startedAt !== getGeneration() };
}
