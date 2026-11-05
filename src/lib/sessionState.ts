// Tracks WHICH account the dashboard is showing, and tells everyone when that changes.
//
// Why it exists: the user ID used to be cached in a module variable that only the dashboard's Sign Out button reset.
// Any other way an account can change (session expiry, signing out in another tab, signing in as someone else on the
// same tab) left the old ID and the old cached rows in place, and a slow request started for one account could finish
// after another account had signed in.
//
// How it works:
//  - Every change of account bumps a GENERATION counter. Code that starts async work remembers the generation and
//    drops its result if the generation moved (see loadDashboardListings).
//  - A lookup that was started before a change cannot repopulate the cache afterwards.
//  - The auth listener ignores events for the account that is already known (token refreshes, tab-focus sign-ins,
//    INITIAL_SESSION), so same-user events do not clear anything or trigger reloads.
//  - Subscribers are notified AFTER the state changes, deferred so they never run inside the auth callback
//    (calling the Supabase client from inside that callback can deadlock it).
//
// This file has no React and no Supabase import: the real wiring lives in agentSession.tsx, and tests inject fakes.

export interface SessionDeps {
  // Reads the current session's user ID (local read in the app). Resolves null when there is no session.
  readSession: () => Promise<string | null>;
  // Registers the auth-event listener. Called at most once.
  watchAuth: (onEvent: (event: string, userId: string | null) => void) => void;
  // Called synchronously whenever the known account changes (the app clears the dashboard cache here).
  onUserChanged: (userId: string | null) => void;
  // Runs a callback outside the current call stack. Defaults to setTimeout(0).
  defer?: (fn: () => void) => void;
}

export type SessionListener = (userId: string | null) => void;

export function createSessionManager(deps: SessionDeps) {
  let cachedUserId: string | null = null;
  let pending: Promise<string | null> | null = null;
  let generation = 0;
  let watching = false;
  let knownSignedOut = false;
  // An auth event for a user that arrived while the first lookup was still in flight.
  let eventUserId: string | null = null;
  const listeners = new Set<SessionListener>();
  const defer = deps.defer ?? ((fn: () => void) => { setTimeout(fn, 0); });

  // The account changed (or ended). Everything started earlier is now stale.
  function invalidate(userId: string | null) {
    generation++;
    cachedUserId = userId;
    pending = null;
    eventUserId = null;
    knownSignedOut = userId === null;
    deps.onUserChanged(userId);
    defer(() => listeners.forEach((l) => l(userId)));
  }

  function handleAuthEvent(event: string, userId: string | null) {
    // The first lookup reads this session itself.
    if (event === "INITIAL_SESSION") return;
    if (event === "SIGNED_OUT") {
      if (cachedUserId === null && knownSignedOut && !pending) return; // already known
      invalidate(null);
      return;
    }
    if (userId === null) return;
    if (userId === cachedUserId) return; // same account: token refresh, tab focus, profile update
    if (cachedUserId === null && pending) {
      // The first lookup is still running. Remember what the event says and compare when it finishes.
      eventUserId = userId;
      return;
    }
    invalidate(userId);
  }

  function ensureWatching() {
    if (watching) return;
    watching = true;
    deps.watchAuth(handleAuthEvent);
  }

  function getUserId(): Promise<string | null> {
    ensureWatching();
    if (cachedUserId) return Promise.resolve(cachedUserId);
    if (!pending) {
      const startedAt = generation;
      const p: Promise<string | null> = deps
        .readSession()
        .then((userId) => {
          // The account changed while this lookup was running: its answer must not be stored.
          if (startedAt !== generation) return userId;
          const seen = eventUserId;
          eventUserId = null;
          if (seen !== null && seen !== userId) {
            // The lookup read an older session than the one the auth event reported.
            invalidate(seen);
            return userId;
          }
          cachedUserId = userId;
          knownSignedOut = userId === null;
          return userId;
        })
        .finally(() => {
          if (pending === p) pending = null;
        });
      pending = p;
    }
    return pending;
  }

  return {
    getUserId,
    // Synchronous peek for first-render state initializers (null until a lookup has resolved).
    peekUserId: () => cachedUserId,
    getGeneration: () => generation,
    // Explicit sign-out path. A no-op when the account is already known to be gone.
    reset() {
      if (cachedUserId === null && knownSignedOut && !pending) return;
      invalidate(null);
    },
    subscribe(listener: SessionListener) {
      ensureWatching();
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
