import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { createSessionManager } from "../sessionState";
import { cacheGetFor, cacheSetFor, clearCache, getCacheOwner, setCacheOwner } from "../swrCache";

// The REAL session manager (sessionState.ts) and the REAL swrCache, driven with fictional users and a fake session source.
// Nothing here touches a network, a database or a browser. The Supabase client wiring (agentSession.tsx) is covered by
// source checks in dashboardWiring.test.ts, not by these tests.

const A = "fictional-user-A";
const B = "fictional-user-B";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function setup(readSession?: () => Promise<string | null>) {
  const state = { reads: 0, watchCalls: 0, owners: [] as (string | null)[], notified: [] as (string | null)[] };
  let onEvent: (event: string, userId: string | null) => void = () => {};
  let queue: (() => void)[] = [];
  const m = createSessionManager({
    readSession: () => { state.reads++; return readSession ? readSession() : Promise.resolve(A); },
    watchAuth: (cb) => { state.watchCalls++; onEvent = cb; },
    onUserChanged: (u) => { state.owners.push(u); },
    defer: (fn) => { queue.push(fn); },
  });
  m.subscribe((u) => state.notified.push(u));
  return {
    m,
    state,
    emit: (event: string, userId: string | null) => onEvent(event, userId),
    flush: () => { const q = queue; queue = []; q.forEach((fn) => fn()); },
    pendingCallbacks: () => queue.length,
  };
}

test("the first lookup is cached, and concurrent callers share one read", async () => {
  const s = setup();
  const [x, y] = await Promise.all([s.m.getUserId(), s.m.getUserId()]);
  assert.equal(x, A);
  assert.equal(y, A);
  assert.equal(await s.m.getUserId(), A);
  assert.equal(s.state.reads, 1);
  assert.equal(s.m.peekUserId(), A);
});

test("a null session is not cached (a later call can recover); a throwing read rejects and the next call retries", async () => {
  let next: () => Promise<string | null> = () => Promise.resolve(null);
  const s = setup(() => next());
  assert.equal(await s.m.getUserId(), null);
  assert.equal(s.m.peekUserId(), null);
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

test("account A to B: the generation moves, the cache owner changes in the same step, subscribers hear about it AFTER the auth callback", async () => {
  const s = setup();
  await s.m.getUserId();
  const g0 = s.m.getGeneration();
  s.emit("SIGNED_IN", B);
  assert.equal(s.m.getGeneration(), g0 + 1);
  assert.equal(s.m.peekUserId(), B);
  assert.deepEqual(s.state.owners, [B], "cache owner changed synchronously");
  assert.deepEqual(s.state.notified, [], "subscribers are not called inside the auth callback");
  assert.equal(s.pendingCallbacks(), 1);
  s.flush();
  assert.deepEqual(s.state.notified, [B]);
});

test("sign-out (from anywhere): the account is dropped once, and a duplicate sign-out or an explicit reset does nothing more", async () => {
  const s = setup();
  await s.m.getUserId();
  s.emit("SIGNED_OUT", null);
  s.flush();
  assert.equal(s.m.peekUserId(), null);
  assert.deepEqual(s.state.owners, [null]);
  assert.deepEqual(s.state.notified, [null]);
  const g = s.m.getGeneration();
  s.emit("SIGNED_OUT", null);
  s.m.reset();
  s.flush();
  assert.equal(s.m.getGeneration(), g);
  assert.deepEqual(s.state.notified, [null], "no second notification");
});

test("same-user auth events change nothing: no generation change, no cache change, no notification, even for hundreds of events (no reload loop)", async () => {
  const s = setup();
  await s.m.getUserId();
  const g = s.m.getGeneration();
  for (const ev of ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION", "PASSWORD_RECOVERY"]) s.emit(ev, A);
  for (let i = 0; i < 300; i++) s.emit(i % 2 ? "TOKEN_REFRESHED" : "SIGNED_IN", A);
  s.flush();
  assert.equal(s.m.getGeneration(), g);
  assert.deepEqual(s.state.owners, []);
  assert.deepEqual(s.state.notified, []);
  assert.equal(s.m.peekUserId(), A);
});

test("an in-flight session lookup that finishes AFTER the account was reset does not repopulate the cache", async () => {
  const d = deferred<string | null>();
  const s = setup(() => d.promise);
  const lookup = s.m.getUserId();
  s.m.reset(); // sign-out path while the lookup is running
  d.resolve(A);
  assert.equal(await lookup, A, "the old caller still gets its answer");
  assert.equal(s.m.peekUserId(), null, "but it is not stored");
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
  assert.deepEqual(s.state.owners, [B]);
  s.flush();
  assert.deepEqual(s.state.notified, [B]);
});

test("a same-user event during the first lookup does not invalidate anything", async () => {
  const d = deferred<string | null>();
  const s = setup(() => d.promise);
  const g = s.m.getGeneration();
  const lookup = s.m.getUserId();
  s.emit("TOKEN_REFRESHED", A); // token refreshed while the first lookup runs (expired token at startup)
  d.resolve(A);
  await lookup;
  s.flush();
  assert.equal(s.m.getGeneration(), g);
  assert.equal(s.m.peekUserId(), A);
  assert.deepEqual(s.state.notified, []);
  assert.deepEqual(s.state.owners, []);
});

test("signing in after a sign-out is a new account state, even for the same person", async () => {
  const s = setup();
  await s.m.getUserId();
  s.emit("SIGNED_OUT", null);
  s.emit("SIGNED_IN", A);
  s.flush();
  assert.deepEqual(s.state.owners, [null, A]);
  assert.deepEqual(s.state.notified, [null, A]);
  assert.equal(s.m.peekUserId(), A);
});

test("a sign-in event when no session was found earlier is picked up (the page showing 'session unavailable' can recover)", async () => {
  const s = setup(() => Promise.resolve(null));
  assert.equal(await s.m.getUserId(), null);
  s.emit("SIGNED_IN", B);
  s.flush();
  assert.equal(s.m.peekUserId(), B);
  assert.deepEqual(s.state.notified, [B]);
});

test("an unsubscribed listener is not called", async () => {
  const s = setup();
  const calls: (string | null)[] = [];
  const off = s.m.subscribe((u) => calls.push(u));
  await s.m.getUserId();
  off();
  s.emit("SIGNED_IN", B);
  s.flush();
  assert.deepEqual(calls, []);
});

// ---- with the real dashboard cache ----

// Wires the manager to the cache the way agentSession.tsx does: the cache owner follows the account.
function managerWithCache(first: string) {
  clearCache();
  let onEvent: (e: string, u: string | null) => void = () => {};
  const m = createSessionManager({
    readSession: () => Promise.resolve(first),
    watchAuth: (cb) => { onEvent = cb; },
    onUserChanged: (u) => setCacheOwner(u),
    defer: () => {},
  });
  return { m, emit: (e: string, u: string | null) => onEvent(e, u) };
}

test("cache: account A's rows are gone the moment the account becomes B, and B can never read them", async () => {
  const { m, emit } = managerWithCache(A);
  assert.equal(await m.getUserId(), A);
  setCacheOwner(A); // the dashboard layout confirms the owner once the session is read
  cacheSetFor("dashboard:listings", [{ id: "A-1" }], A);
  assert.deepEqual(cacheGetFor("dashboard:listings", A), [{ id: "A-1" }]);
  emit("SIGNED_IN", B);
  assert.equal(getCacheOwner(), B);
  assert.equal(cacheGetFor("dashboard:listings", A), undefined);
  assert.equal(cacheGetFor("dashboard:listings", B), undefined, "A's rows were dropped, not handed to B");
  assert.equal(m.peekUserId(), B);
});

test("cache: sign-out leaves nothing readable, and a late write for the old user is ignored", async () => {
  const { m, emit } = managerWithCache(A);
  await m.getUserId();
  setCacheOwner(A);
  cacheSetFor("dashboard:listings", [{ id: "A-1" }], A);
  emit("SIGNED_OUT", null);
  assert.equal(getCacheOwner(), null);
  assert.equal(cacheGetFor("dashboard:listings", A), undefined);
  assert.equal(cacheGetFor("dashboard:listings", null), undefined);
  cacheSetFor("dashboard:listings", [{ id: "A-late" }], A); // a request for A finishing after sign-out
  emit("SIGNED_IN", B);
  assert.equal(cacheGetFor("dashboard:listings", B), undefined);
  cacheSetFor("dashboard:listings", [{ id: "A-late-2" }], A); // and after B signed in
  assert.equal(cacheGetFor("dashboard:listings", B), undefined);
});

test("cache: same-user auth events keep the cached rows", async () => {
  const { m, emit } = managerWithCache(A);
  await m.getUserId();
  setCacheOwner(A);
  cacheSetFor("dashboard:listings", [{ id: "A-1" }], A);
  for (const ev of ["TOKEN_REFRESHED", "SIGNED_IN", "USER_UPDATED", "INITIAL_SESSION"]) emit(ev, A);
  assert.deepEqual(cacheGetFor("dashboard:listings", A), [{ id: "A-1" }]);
  assert.equal(getCacheOwner(), A);
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
