import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { createSessionManager, type SessionSnapshot } from "../sessionState";
import { cacheGetFor, cacheSetFor, clearCache, getCacheOwner, setCacheOwner } from "../swrCache";

// The REAL session manager (sessionState.ts) and the REAL swrCache, driven with fictional users and a fake session source.
// The manager is an external store for useSyncExternalStore: these tests check its contract (stable snapshot, constant
// server snapshot, coherent state at notification time, no notification for same-user events). They do NOT run React: the
// layout's use of the store is covered by the mounted tests (mountedDashboard / mountedTransition) and source checks.

const A = "fictional-user-A";
const B = "fictional-user-B";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function setup(readSession?: () => Promise<string | null>) {
  const state = { reads: 0, watchCalls: 0, owners: [] as (string | null)[] };
  // What every subscriber saw at the moment it was called.
  const seen: { snapshot: SessionSnapshot; peek: string | null; generation: number; owner: string | null }[] = [];
  let onEvent: (event: string, userId: string | null) => void = () => {};
  const m = createSessionManager({
    readSession: () => { state.reads++; return readSession ? readSession() : Promise.resolve(A); },
    watchAuth: (cb) => { state.watchCalls++; onEvent = cb; },
    onUserChanged: (u) => { state.owners.push(u); },
  });
  m.subscribe(() => seen.push({ snapshot: m.getSnapshot(), peek: m.peekUserId(), generation: m.getGeneration(), owner: state.owners[state.owners.length - 1] ?? null }));
  return { m, state, seen, emit: (event: string, userId: string | null) => onEvent(event, userId) };
}

test("the first lookup is cached, concurrent callers share one read, and the account becomes known once", async () => {
  const s = setup();
  const [x, y] = await Promise.all([s.m.getUserId(), s.m.getUserId()]);
  assert.equal(x, A);
  assert.equal(y, A);
  assert.equal(await s.m.getUserId(), A);
  assert.equal(s.state.reads, 1);
  assert.equal(s.m.peekUserId(), A);
  assert.deepEqual(s.state.owners, [A], "the cache owner learned the account once");
  assert.equal(s.seen.length, 1, "one notification for the first identity");
  assert.deepEqual({ ...s.m.getSnapshot() }, { generation: 0, userId: A }, "same generation, new identity: no remount trigger");
});

test("a null session is not cached (a later call can recover); a throwing read rejects and the next call retries", async () => {
  let next: () => Promise<string | null> = () => Promise.resolve(null);
  const s = setup(() => next());
  assert.equal(await s.m.getUserId(), null);
  assert.equal(s.m.peekUserId(), null);
  assert.equal(s.seen.length, 0, "no identity, so nothing to announce");
  next = () => Promise.reject(new Error("storage unavailable"));
  await assert.rejects(s.m.getUserId(), /storage unavailable/);
  next = () => Promise.resolve(B);
  assert.equal(await s.m.getUserId(), B);
  assert.equal(s.state.reads, 3);
});

test("the auth listener is registered once, however many callers and subscribers there are", async () => {
  const s = setup();
  await s.m.getUserId();
  s.m.subscribe(() => {});
  s.m.subscribe(() => {});
  await s.m.getUserId();
  assert.equal(s.state.watchCalls, 1);
});

test("snapshot contract: the same object between changes, a constant server snapshot, new objects only on change", async () => {
  const s = setup();
  const server = s.m.getServerSnapshot();
  assert.equal(s.m.getServerSnapshot(), server, "constant");
  assert.deepEqual({ ...server }, { generation: 0, userId: null });
  assert.equal(s.m.getSnapshot(), server, "before any account is known the client reports the server snapshot (hydration agrees)");
  await s.m.getUserId();
  const first = s.m.getSnapshot();
  assert.equal(s.m.getSnapshot(), first, "stable between reads");
  for (let i = 0; i < 100; i++) s.emit(i % 2 ? "TOKEN_REFRESHED" : "SIGNED_IN", A);
  assert.equal(s.m.getSnapshot(), first, "same-user events never replace it");
  s.emit("SIGNED_IN", B);
  const second = s.m.getSnapshot();
  assert.notEqual(second, first);
  assert.equal(s.m.getServerSnapshot(), server, "the server snapshot does not change");
  assert.ok(Object.isFrozen(second), "immutable");
});

test("account A to B: identity, generation, cache owner and snapshot are coherent at the moment subscribers are called", async () => {
  const s = setup();
  await s.m.getUserId();
  s.seen.length = 0;
  const g0 = s.m.getGeneration();
  s.emit("SIGNED_IN", B);
  assert.equal(s.seen.length, 1, "one synchronous notification");
  const view = s.seen[0];
  assert.equal(view.peek, B);
  assert.equal(view.generation, g0 + 1);
  assert.deepEqual({ ...view.snapshot }, { generation: g0 + 1, userId: B }, "the snapshot a subscriber reads is already the new one");
  assert.equal(view.owner, B, "and the cache owner already moved");
});

test("sign-out: the account is dropped once; a duplicate sign-out or an explicit reset adds nothing", async () => {
  const s = setup();
  await s.m.getUserId();
  s.seen.length = 0;
  s.emit("SIGNED_OUT", null);
  assert.equal(s.m.peekUserId(), null);
  assert.deepEqual(s.state.owners, [A, null]);
  assert.equal(s.seen.length, 1);
  const g = s.m.getGeneration();
  s.emit("SIGNED_OUT", null);
  s.m.reset();
  assert.equal(s.m.getGeneration(), g);
  assert.equal(s.seen.length, 1, "no second notification");
});

test("same-user auth events change nothing: no generation change, no cache change, no notification, even for hundreds of events (no loop)", async () => {
  const s = setup();
  await s.m.getUserId();
  s.seen.length = 0;
  const g = s.m.getGeneration();
  for (const ev of ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION", "PASSWORD_RECOVERY"]) s.emit(ev, A);
  for (let i = 0; i < 300; i++) s.emit(i % 2 ? "TOKEN_REFRESHED" : "SIGNED_IN", A);
  assert.equal(s.m.getGeneration(), g);
  assert.deepEqual(s.state.owners, [A]);
  assert.equal(s.seen.length, 0);
  assert.equal(s.m.peekUserId(), A);
});

test("an in-flight session lookup that finishes AFTER the account was reset does not repopulate the cache or the snapshot", async () => {
  const d = deferred<string | null>();
  const s = setup(() => d.promise);
  const lookup = s.m.getUserId();
  s.m.reset(); // sign-out path while the lookup is running
  d.resolve(A);
  assert.equal(await lookup, A, "the old caller still gets its answer");
  assert.equal(s.m.peekUserId(), null, "but it is not stored");
  assert.equal(s.m.getSnapshot().userId, null, "and the snapshot does not claim it");
  const readsBefore = s.state.reads;
  await s.m.getUserId(); // a fresh lookup is needed
  assert.equal(s.state.reads, readsBefore + 1);
});

test("a lookup that read an OLDER session than the auth event reported is replaced by the event's account", async () => {
  const d = deferred<string | null>();
  const s = setup(() => d.promise);
  const lookup = s.m.getUserId();
  s.emit("SIGNED_IN", B); // B signed in while the lookup (which read A) was in flight
  assert.equal(s.m.peekUserId(), null, "nothing is trusted until the lookup finishes");
  d.resolve(A);
  await lookup;
  assert.equal(s.m.peekUserId(), B);
  assert.deepEqual(s.state.owners, [B], "the cache never saw A");
  assert.equal(s.seen.length, 1);
  assert.equal(s.seen[0].snapshot.userId, B);
});

test("a same-user event during the first lookup does not invalidate anything", async () => {
  const d = deferred<string | null>();
  const s = setup(() => d.promise);
  const g = s.m.getGeneration();
  const lookup = s.m.getUserId();
  s.emit("TOKEN_REFRESHED", A); // token refreshed while the first lookup runs (expired token at startup)
  d.resolve(A);
  await lookup;
  assert.equal(s.m.getGeneration(), g);
  assert.equal(s.m.peekUserId(), A);
  assert.equal(s.seen.length, 1, "only the first identity was announced");
  assert.deepEqual(s.state.owners, [A]);
});

test("signing in after a sign-out is a new account state, even for the same person", async () => {
  const s = setup();
  await s.m.getUserId();
  s.seen.length = 0;
  s.emit("SIGNED_OUT", null);
  s.emit("SIGNED_IN", A);
  assert.deepEqual(s.state.owners, [A, null, A]);
  assert.deepEqual(s.seen.map((v) => v.snapshot.userId), [null, A]);
  assert.equal(s.m.peekUserId(), A);
});

test("a sign-in event when no session was found earlier is picked up (the page showing 'session unavailable' can recover)", async () => {
  const s = setup(() => Promise.resolve(null));
  assert.equal(await s.m.getUserId(), null);
  s.emit("SIGNED_IN", B);
  assert.equal(s.m.peekUserId(), B);
  assert.equal(s.seen.at(-1)?.snapshot.userId, B);
});

test("re-entrancy: a subscriber may read, subscribe and unsubscribe while being notified, and cannot cause a notification loop", async () => {
  const s = setup();
  await s.m.getUserId();
  s.seen.length = 0;
  let late = 0;
  let off: () => void = () => {};
  s.m.subscribe(() => {
    s.m.getSnapshot();
    off = s.m.subscribe(() => { late++; }); // subscribing during a notification
    off();                                  // and unsubscribing again
    s.emit("TOKEN_REFRESHED", B);           // an auth event for the NEW (now current) account arriving from inside the listener
  });
  s.emit("SIGNED_IN", B);
  assert.equal(s.m.getGeneration(), 1, "exactly one change happened");
  assert.equal(s.seen.length, 1);
  assert.equal(late, 0, "a listener added during notification is not called for that notification");
});

test("a failing listener does not stop the others, and the first error is rethrown afterwards", async () => {
  const s = setup();
  await s.m.getUserId();
  let reached = false;
  s.m.subscribe(() => { throw new Error("listener failed"); });
  s.m.subscribe(() => { reached = true; });
  assert.throws(() => s.emit("SIGNED_IN", B), /listener failed/);
  assert.equal(reached, true);
  assert.equal(s.m.peekUserId(), B, "the state change itself was not lost");
});

test("an unsubscribed listener is not called", async () => {
  const s = setup();
  const calls: number[] = [];
  const off = s.m.subscribe(() => calls.push(1));
  await s.m.getUserId(); // announces A
  off();
  s.emit("SIGNED_IN", B);
  assert.equal(calls.length, 1, "called for A, not for B");
});

// ---- with the real dashboard cache ----

function managerWithCache(first: string) {
  clearCache();
  let onEvent: (e: string, u: string | null) => void = () => {};
  const m = createSessionManager({
    readSession: () => Promise.resolve(first),
    watchAuth: (cb) => { onEvent = cb; },
    onUserChanged: (u) => setCacheOwner(u),
  });
  return { m, emit: (e: string, u: string | null) => onEvent(e, u) };
}

test("cache: the cache owner follows the account from the moment it is first known, and A's rows are gone the moment the account becomes B", async () => {
  const { m, emit } = managerWithCache(A);
  assert.equal(await m.getUserId(), A);
  assert.equal(getCacheOwner(), A, "no separate step is needed to make A the owner");
  cacheSetFor("dashboard:listings", [{ id: "A-1" }], A);
  assert.deepEqual(cacheGetFor("dashboard:listings", A), [{ id: "A-1" }]);
  emit("SIGNED_IN", B);
  assert.equal(getCacheOwner(), B);
  assert.equal(cacheGetFor("dashboard:listings", A), undefined);
  assert.equal(cacheGetFor("dashboard:listings", B), undefined, "A's rows were dropped, not handed to B");
});

test("cache: sign-out leaves nothing readable, and a late write for the old user is ignored", async () => {
  const { m, emit } = managerWithCache(A);
  await m.getUserId();
  cacheSetFor("dashboard:listings", [{ id: "A-1" }], A);
  emit("SIGNED_OUT", null);
  assert.equal(getCacheOwner(), null);
  assert.equal(cacheGetFor("dashboard:listings", A), undefined);
  cacheSetFor("dashboard:listings", [{ id: "A-late" }], A);
  emit("SIGNED_IN", B);
  cacheSetFor("dashboard:listings", [{ id: "A-late-2" }], A);
  assert.equal(cacheGetFor("dashboard:listings", B), undefined);
});

test("cache: same-user auth events keep the cached rows", async () => {
  const { m, emit } = managerWithCache(A);
  await m.getUserId();
  cacheSetFor("dashboard:listings", [{ id: "A-1" }], A);
  for (const ev of ["TOKEN_REFRESHED", "SIGNED_IN", "USER_UPDATED", "INITIAL_SESSION"]) emit(ev, A);
  assert.deepEqual(cacheGetFor("dashboard:listings", A), [{ id: "A-1" }]);
  assert.equal(getCacheOwner(), A);
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
