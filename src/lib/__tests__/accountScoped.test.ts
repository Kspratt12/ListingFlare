import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { accountScope } from "../accountScoped";
import { createSessionManager } from "../sessionState";
import { cacheGet, cacheGetFor, cacheSetFor, clearCache, setCacheOwner } from "../swrCache";

// The REAL accountScope helper, session manager and cache, with fictional users. The tab pages themselves are React
// components whose effects this repo cannot execute; they apply this helper the way `loadTab` below does, and
// dashboardWiring.test.ts checks by reading the source that each page does exactly that. `loadTab` is a stand-in for those
// call sites, not a copy of them.

const A = "fictional-user-A";
const B = "fictional-user-B";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

function world() {
  clearCache();
  let onEvent: (e: string, u: string | null) => void = () => {};
  const m = createSessionManager({
    readSession: () => Promise.resolve(A),
    watchAuth: (cb) => { onEvent = cb; },
    onUserChanged: (u) => setCacheOwner(u),
  });
  return { m, emit: (e: string, u: string | null) => onEvent(e, u) };
}

// The shape every tab's load now has: remember the account, look up the user, query, apply only if still the same account.
async function loadTab(w: ReturnType<typeof world>, key: string, query: (uid: string | null) => PromiseLike<string[]>, applied: string[][]) {
  const scope = accountScope(w.m.getGeneration);
  const uid = await w.m.getUserId();
  if (scope.isStale()) return "stale";
  const rows = await query(uid);
  if (scope.isStale()) return "stale";
  applied.push(rows);        // stands in for setRows(...)
  cacheSetFor(key, rows, uid);
  return "applied";
}

test("accountScope: not stale while the account is unchanged, stale after any account change", async () => {
  const w = world();
  await w.m.getUserId();
  const scope = accountScope(w.m.getGeneration);
  assert.equal(scope.isStale(), false);
  w.emit("SIGNED_IN", B);
  assert.equal(scope.isStale(), true);
  assert.equal(accountScope(w.m.getGeneration).isStale(), false, "a scope started after the change is current");
});

test("accountScope: same-user auth events never make a request stale (no refetch loop)", async () => {
  const w = world();
  await w.m.getUserId();
  const scope = accountScope(w.m.getGeneration);
  for (let i = 0; i < 200; i++) w.emit(i % 3 === 0 ? "TOKEN_REFRESHED" : i % 3 === 1 ? "SIGNED_IN" : "USER_UPDATED", A);
  assert.equal(scope.isStale(), false);
});

test("A's delayed result: not applied to the visible tab, not stored for B, and B cannot read it", async () => {
  const w = world();
  await w.m.getUserId();
  setCacheOwner(A);
  const slow = deferred<string[]>();
  const applied: string[][] = [];
  const forA = loadTab(w, "leads", () => slow.promise, applied);
  await Promise.resolve(); await Promise.resolve();
  w.emit("SIGNED_IN", B);                       // the session changes to B while A's request is running
  slow.resolve(["A-lead-1"]);
  assert.equal(await forA, "stale");
  assert.deepEqual(applied, [], "A's rows never reach the visible tab state");
  assert.equal(cacheGet("leads"), undefined, "nothing of A's is in the cache");
  assert.equal(cacheGetFor("leads", B), undefined);
});

test("B's own load after the change is applied and stored for B only", async () => {
  const w = world();
  await w.m.getUserId();
  setCacheOwner(A);
  w.emit("SIGNED_IN", B);
  const applied: string[][] = [];
  assert.equal(await loadTab(w, "leads", () => Promise.resolve(["B-lead-1"]), applied), "applied");
  assert.deepEqual(applied, [["B-lead-1"]]);
  assert.deepEqual(cacheGetFor("leads", B), ["B-lead-1"]);
  assert.equal(cacheGetFor("leads", A), undefined);
});

test("a late effect-style write for the old account is refused once the cache belongs to someone else, and a same-user write is accepted", async () => {
  const w = world();
  await w.m.getUserId();
  setCacheOwner(A);
  cacheSetFor("showings", ["A-showing-1"], A);
  assert.deepEqual(cacheGetFor("showings", A), ["A-showing-1"], "same account: accepted");
  w.emit("SIGNED_IN", B);                       // cache cleared, owner B; a mounted tab still holds A's rows
  cacheSetFor("showings", ["A-showing-held-in-state"], A); // the tab's "keep the cache in step" effect, naming A
  assert.equal(cacheGet("showings"), undefined);
  assert.equal(cacheGetFor("showings", B), undefined);
  cacheSetFor("showings", ["A-showing-held-in-state"], null); // before any user is known: also refused
  assert.equal(cacheGet("showings"), undefined);
});

test("a request for A that finishes after sign-out is dropped and leaves nothing behind", async () => {
  const w = world();
  await w.m.getUserId();
  setCacheOwner(A);
  const slow = deferred<string[]>();
  const applied: string[][] = [];
  const p = loadTab(w, "offers", () => slow.promise, applied);
  await Promise.resolve(); await Promise.resolve();
  w.emit("SIGNED_OUT", null);
  slow.resolve(["A-offer-1"]);
  assert.equal(await p, "stale");
  assert.deepEqual(applied, []);
  assert.equal(cacheGet("offers"), undefined);
});

test("a lookup that finishes after the account changed is stale before any query starts", async () => {
  const lookup = deferred<string | null>();
  const m = createSessionManager({ readSession: () => lookup.promise, watchAuth: () => {}, onUserChanged: () => {} });
  const scope = accountScope(m.getGeneration);
  const pending = m.getUserId();
  m.reset(); // sign-out while the lookup is running
  lookup.resolve(A);
  await pending;
  assert.equal(scope.isStale(), true);
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
