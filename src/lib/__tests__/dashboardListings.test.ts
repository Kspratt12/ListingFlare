import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { loadDashboardListings, type ListingsQueryResult } from "../dashboardListings";
import { createSessionManager } from "../sessionState";
import { cacheGetFor, cacheSetFor, clearCache, setCacheOwner } from "../swrCache";

// The REAL loader (dashboardListings.ts), the REAL session manager and the REAL cache, with fictional rows and a fake
// query. These tests do not render the page: how the page uses the loader's result is covered by source checks in
// dashboardWiring.test.ts.

type Row = { id: string };
const A = "fictional-user-A";
const B = "fictional-user-B";
const ok = (rows: Row[], count = rows.length): Promise<ListingsQueryResult<Row>> => Promise.resolve({ data: rows, count, error: null });
const failed = (): Promise<ListingsQueryResult<Row>> => Promise.resolve({ data: null, count: null, error: { message: "network error" } });
const never = () => { throw new Error("must not be called"); };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

const base = {
  getUserId: () => Promise.resolve<string | null>(A),
  fetchRows: () => ok([{ id: "1" }, { id: "2" }]),
  getCachedRows: (): Row[] | undefined => undefined,
  isCurrent: () => true,
};

test("success with rows: ready, rows returned, an account that has had listings is recorded", async () => {
  const r = await loadDashboardListings<Row>(base);
  assert.deepEqual(r, { status: "ready", userId: A, rows: [{ id: "1" }, { id: "2" }], hasEverCreated: true });
});

test("success with no rows is a real empty account, and only a successful query can say so", async () => {
  const r = await loadDashboardListings<Row>({ ...base, fetchRows: () => ok([], 0) });
  assert.deepEqual(r, { status: "ready", userId: A, rows: [], hasEverCreated: false });
  const archivedOnly = await loadDashboardListings<Row>({ ...base, fetchRows: () => ok([], 3) });
  assert.equal(archivedOnly?.status === "ready" && archivedOnly.hasEverCreated, true);
});

test("null session: a sign-in recovery state, never an empty account, and no query is made", async () => {
  const r = await loadDashboardListings<Row>({ ...base, getUserId: () => Promise.resolve(null), fetchRows: never });
  assert.deepEqual(r, { status: "no-session" });
});

test("a throwing session read is handled like a missing session: the loader still finishes", async () => {
  const r = await loadDashboardListings<Row>({ ...base, getUserId: () => Promise.reject(new Error("storage unavailable")), fetchRows: never });
  assert.deepEqual(r, { status: "no-session" });
});

test("a failed query is an error state, not an empty account; so is a thrown query and a response with no data", async () => {
  assert.deepEqual(await loadDashboardListings<Row>({ ...base, fetchRows: failed }), { status: "error", userId: A, rows: [] });
  assert.deepEqual(await loadDashboardListings<Row>({ ...base, fetchRows: () => Promise.reject(new Error("fetch failed")) }), { status: "error", userId: A, rows: [] });
  assert.deepEqual(await loadDashboardListings<Row>({ ...base, fetchRows: () => Promise.resolve({ data: null, count: null, error: null }) }), { status: "error", userId: A, rows: [] });
});

test("a failed query followed by a successful retry ends in ready", async () => {
  let attempt = 0;
  const deps = { ...base, fetchRows: () => (++attempt === 1 ? failed() : ok([{ id: "9" }])) };
  assert.equal((await loadDashboardListings<Row>(deps))?.status, "error");
  const retry = await loadDashboardListings<Row>(deps);
  assert.deepEqual(retry, { status: "ready", userId: A, rows: [{ id: "9" }], hasEverCreated: true });
});

test("a failed refresh keeps the cached rows ONLY when the cache belongs to the same user", async () => {
  clearCache();
  setCacheOwner(A);
  cacheSetFor("dashboard:listings", [{ id: "cached-A" }], A);
  const deps = { ...base, fetchRows: failed, getCachedRows: (uid: string) => cacheGetFor<Row[]>("dashboard:listings", uid) };
  assert.deepEqual(await loadDashboardListings<Row>({ ...deps, getUserId: () => Promise.resolve(A) }), { status: "error", userId: A, rows: [{ id: "cached-A" }] });
  assert.deepEqual(await loadDashboardListings<Row>({ ...deps, getUserId: () => Promise.resolve(B) }), { status: "error", userId: B, rows: [] }, "B never gets A's cached rows");
});

test("a superseded load returns null and does not query: stale before the session read finishes, and stale after the query finishes", async () => {
  let current = true;
  const d = deferred<string | null>();
  const p = loadDashboardListings<Row>({ ...base, getUserId: () => d.promise, fetchRows: never, isCurrent: () => current });
  current = false;
  d.resolve(A);
  assert.equal(await p, null);

  current = true;
  const q = deferred<ListingsQueryResult<Row>>();
  const p2 = loadDashboardListings<Row>({ ...base, fetchRows: () => q.promise, isCurrent: () => current });
  await Promise.resolve();
  current = false;
  q.resolve({ data: [{ id: "late" }], count: 1, error: null });
  assert.equal(await p2, null);
});

// ---- with the real session manager: the account-change races ----

function world(first: string) {
  clearCache();
  let onEvent: (e: string, u: string | null) => void = () => {};
  const m = createSessionManager({
    readSession: () => Promise.resolve(first),
    watchAuth: (cb) => { onEvent = cb; },
    onUserChanged: (u) => setCacheOwner(u),
  });
  // how the page binds the loader to the session: a load is current while the generation has not moved
  const load = (fetchRows: (uid: string) => PromiseLike<ListingsQueryResult<Row>>, getUserId = () => m.getUserId()) => {
    const startedAt = m.getGeneration();
    return loadDashboardListings<Row>({
      getUserId,
      fetchRows,
      getCachedRows: (uid) => cacheGetFor<Row[]>("dashboard:listings", uid),
      isCurrent: () => startedAt === m.getGeneration(),
    });
  };
  return { m, emit: (e: string, u: string | null) => onEvent(e, u), load };
}

test("A's delayed request completing after B signed in is discarded and never reaches B's dashboard", async () => {
  const w = world(A);
  await w.m.getUserId();
  setCacheOwner(A);
  const slow = deferred<ListingsQueryResult<Row>>();
  const forA = w.load(() => slow.promise);
  await Promise.resolve(); await Promise.resolve();
  w.emit("SIGNED_IN", B); // B signs in while A's query is still running
  slow.resolve({ data: [{ id: "A-private-1" }], count: 1, error: null });
  assert.equal(await forA, null, "A's result is dropped");
  // B's own load, started after the change
  const forB = await w.load(() => ok([{ id: "B-1" }]), () => Promise.resolve(B));
  assert.deepEqual(forB, { status: "ready", userId: B, rows: [{ id: "B-1" }], hasEverCreated: true });
  assert.equal(cacheGetFor("dashboard:listings", B), undefined, "and nothing of A's was written to the cache");
});

test("an in-flight session lookup that completes after invalidation is discarded by the loader and does not repopulate the cache", async () => {
  const d = deferred<string | null>();
  const w = world(A);
  const forOld = w.load(never, () => d.promise.then((u) => u));
  w.m.reset(); // sign-out while the lookup is running
  d.resolve(A);
  assert.equal(await forOld, null);
  assert.equal(w.m.peekUserId(), null);
});

test("same-user auth events during a load do not make the load stale (no reload loop)", async () => {
  const w = world(A);
  await w.m.getUserId();
  const q = deferred<ListingsQueryResult<Row>>();
  const p = w.load(() => q.promise);
  await Promise.resolve(); await Promise.resolve();
  for (const ev of ["TOKEN_REFRESHED", "SIGNED_IN", "USER_UPDATED"]) w.emit(ev, A);
  q.resolve({ data: [{ id: "1" }], count: 1, error: null });
  assert.deepEqual(await p, { status: "ready", userId: A, rows: [{ id: "1" }], hasEverCreated: true });
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
