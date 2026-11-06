// Tracks WHICH account the dashboard is showing, and is the external store React reads it from (useSyncExternalStore).
//
// Why it exists: the user ID used to be cached in a module variable that only the dashboard's Sign Out button reset.
// Any other way an account can change (session expiry, signing out in another tab, signing in as someone else on the
// same tab) left the old ID and the old cached rows in place, and a slow request started for one account could finish
// after another account had signed in.
//
// How it works:
//  - Every change of account bumps a GENERATION counter. Code that starts async work remembers the generation and
//    drops its result if the generation moved (see accountScoped.ts and loadDashboardListings).
//  - The store's SNAPSHOT is the pair { generation, userId }. It is an immutable object that is replaced only when one of
//    the two changes, so getSnapshot() returns the same object between changes (as useSyncExternalStore requires).
//    Same-user auth events (token refresh, tab-focus sign-in, INITIAL_SESSION) change neither, so they notify nobody.
//  - Order on a change: the manager's own state (identity, generation, snapshot) is made coherent first, then the owner
//    of the dashboard cache is told (onUserChanged), and only then are subscribers notified. A subscriber that reads the
//    store when it is called therefore always sees the NEW account and generation, never a mix.
//  - Notification is synchronous and carries no data: a React subscriber only schedules a re-render check, which React
//    performs after the current call stack, outside the auth client's callback and outside any render. Nothing in this
//    file calls back into the auth client while notifying, and listeners are called from a copy of the subscriber set, so
//    a listener may subscribe, unsubscribe or read the store while it is being notified.
//  - A lookup that started before a change cannot store its result afterwards.
//
// This file has no React and no Supabase import: the real wiring lives in agentSession.tsx, and tests inject fakes.

export interface SessionSnapshot {
  readonly generation: number;
  readonly userId: string | null;
}

export interface SessionDeps {
  // Reads the current session's user ID (local read in the app). Resolves null when there is no session.
  readSession: () => Promise<string | null>;
  // Registers the auth-event listener. Called at most once.
  watchAuth: (onEvent: (event: string, userId: string | null) => void) => void;
  // Called synchronously whenever the known account changes (the app moves the dashboard cache to the new owner here).
  onUserChanged: (userId: string | null) => void;
}

export function createSessionManager(deps: SessionDeps) {
  let cachedUserId: string | null = null;
  let pending: Promise<string | null> | null = null;
  let generation = 0;
  let watching = false;
  let knownSignedOut = false;
  // An auth event for a user that arrived while the first lookup was still in flight.
  let eventUserId: string | null = null;
  // What the server renders, and what the client reports until an account is known: constant, so hydration agrees.
  const serverSnapshot: SessionSnapshot = Object.freeze({ generation: 0, userId: null });
  let snapshot: SessionSnapshot = serverSnapshot;
  const listeners = new Set<() => void>();

  // The manager's state is already coherent when this runs. Replaces the snapshot only if something it holds changed.
  function publish() {
    if (snapshot.generation === generation && snapshot.userId === cachedUserId) return;
    snapshot = Object.freeze({ generation, userId: cachedUserId });
    let firstError: unknown;
    let failed = false;
    for (const listener of Array.from(listeners)) {
      try {
        listener();
      } catch (e) {
        if (!failed) { failed = true; firstError = e; }
      }
    }
    // One failing listener must not stop the others; the first error is rethrown once all have run.
    if (failed) throw firstError;
  }

  // The account changed (or ended). Everything started earlier is now stale.
  function invalidate(userId: string | null) {
    generation++;
    cachedUserId = userId;
    pending = null;
    eventUserId = null;
    knownSignedOut = userId === null;
    deps.onUserChanged(userId);
    publish();
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
          knownSignedOut = userId === null;
          if (userId !== cachedUserId) {
            // The account is now known for the first time (or again): same generation, new identity.
            cachedUserId = userId;
            deps.onUserChanged(userId);
            publish();
          }
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
    // useSyncExternalStore inputs. The same object is returned until the account or the generation changes.
    getSnapshot: (): SessionSnapshot => snapshot,
    getServerSnapshot: (): SessionSnapshot => serverSnapshot,
    // Explicit sign-out path. A no-op when the account is already known to be gone.
    reset() {
      if (cachedUserId === null && knownSignedOut && !pending) return;
      invalidate(null);
    },
    // Called synchronously, after the state and the cache owner are coherent, only when the snapshot changed.
    subscribe(listener: () => void) {
      ensureWatching();
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
