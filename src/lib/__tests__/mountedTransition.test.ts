import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { mountWorld, sleep, type World } from "./_mounted";
import type { QueryResult } from "./_fakeBackend";

// REGRESSION tests for the account-transition window and the consumers around it, on the mounted real components (see
// _mounted.ts for exactly what is substituted). They replaced characterization probes that asserted the OLD, unsafe behavior.
// Fictional users A and B; a fake backend; no real mutation (every insert goes to the fake).
//
// NOT verified here: a real browser (event timing, tab visibility, focus), the real Supabase client's event order and
// realtime behavior, and any confirmation that a server dropped a subscription (a fake client cannot show that).

const A = "user-A";
const B = "user-B";
const row = (id: string, userId: string, street: string) => ({ id, agent_id: userId, status: "published", slug: id, street, city: "Exampleville", state: "NC", zip: "27000", price: 450000, beds: 3, baths: 2, sqft: 1800, year_built: 2000, lot_size: null, description: "d", features: [], photos: [], videos: [], virtual_tour_url: "", view_count: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
const ok = (rows: unknown[]): QueryResult => ({ data: rows, count: rows.length, error: null });
const fakeEvent = { preventDefault() {}, stopPropagation() {} };
const hasActions = (w: World, id: string) => w.container.find((e) => e.getAttribute("data-actions") === id).length > 0;

// Zero-delay timers are held while a test looks at the tree right after an account change, so that a fix which still relied
// on a timer would be caught (the session store must not need one).
function holdZeroDelayTimers() {
  const original = globalThis.setTimeout;
  const held: (() => void)[] = [];
  (globalThis as { setTimeout: unknown }).setTimeout = ((fn: () => void, ms?: number, ...args: unknown[]) => {
    if (ms === 0) { held.push(fn); return 0; }
    return original(fn, ms, ...args);
  }) as unknown as typeof setTimeout;
  return { count: () => held.length, release() { globalThis.setTimeout = original; held.splice(0).forEach((fn) => fn()); } };
}

type Inserts = Record<string, unknown>[];
async function withListings(opts: Parameters<typeof mountWorld>[0], fn: (w: World, pending: ReturnType<World["backend"]["hold"]>, inserts: Inserts) => Promise<void>) {
  const w = mountWorld(opts);
  const inserts: Inserts = [];
  const pending: { query: import("./_fakeBackend").FakeQuery; release: (r: QueryResult) => void }[] = [];
  w.backend.handlers.listings = (q) => {
    if (q.op === "insert") { inserts.push(q.row ?? {}); return { data: { ...(q.row ?? {}), id: "copy-1" }, error: null }; }
    return new Promise<QueryResult>((release) => pending.push({ query: q, release }));
  };
  try {
    await w.mount();
    await w.settle();
    await fn(w, pending, inserts);
  } finally {
    await w.unmount();
  }
}

test("after an account change, A's rows and A's actions are gone in the same step: nothing is left usable under B's identity, and no timer is involved", async () => {
  await withListings({ firstUser: A }, async (w, pending) => {
    pending[0].release(ok([row("A-1", A, "111 Alpha Street")]));
    await w.settle();
    assert.match(w.text(), /111 Alpha Street/);
    assert.equal(hasActions(w, "A-1"), true);
    const timers = holdZeroDelayTimers();
    try {
      await w.run(() => w.backend.emitAuth("SIGNED_IN", B));
      assert.equal(timers.count(), 0, "the store does not depend on a timer");
      assert.equal(w.session.peekLocalUserId(), B);
      assert.equal(w.swr.getCacheOwner(), B);
      assert.doesNotMatch(w.text(), /111 Alpha Street/, "A's row is not on screen");
      assert.equal(hasActions(w, "A-1"), false, "A's actions are not rendered");
    } finally {
      timers.release();
    }
    await w.settle();
    assert.equal(pending[1].query.filters.agent_id, B, "B's own load started");
  });
});

test("a duplicate handler captured BEFORE the change (a stale row's action) refuses to copy A's listing into B; B's own duplicate still works", async () => {
  await withListings({ firstUser: A }, async (w, pending, inserts) => {
    pending[0].release(ok([row("A-1", A, "111 Alpha Street")]));
    await w.settle();
    const staleProps = w.menuProps.get("A-1");
    assert.ok(staleProps);
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B));
    await w.settle();
    pending[1].release(ok([row("B-1", B, "222 Bravo Street")]));
    await w.settle();
    await w.runAsync(async () => { void staleProps.onDuplicate(fakeEvent, staleProps.listing); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    await w.settle(5);
    assert.deepEqual(inserts, [], "nothing was sent for A's listing");
    // control: the signed-in account's own listing duplicates normally
    const bProps = w.menuProps.get("B-1");
    assert.ok(bProps);
    await w.runAsync(async () => { void bProps.onDuplicate(fakeEvent, bProps.listing); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    await w.settle(5);
    const sent = inserts as Inserts; // (assert.deepEqual above narrowed the type)
    assert.equal(sent.length, 1);
    assert.equal(sent[0].agent_id, B);
    assert.equal(sent[0].street, "222 Bravo Street (copy)");
  });
});

test("duplicate refuses a listing that does not belong to the signed-in account, shows a message, and never re-assigns it", async () => {
  await withListings({ firstUser: A }, async (w, pending, inserts) => {
    pending[0].release(ok([row("A-1", A, "111 Alpha Street")]));
    await w.settle();
    const props = w.menuProps.get("A-1");
    assert.ok(props);
    // the row says it belongs to someone else (a row kept from another account, say)
    await w.runAsync(async () => { void props.onDuplicate(fakeEvent, { ...props.listing, agent_id: B }); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    await w.settle(5);
    assert.deepEqual(inserts, []);
    assert.match(w.text(), /doesn't belong to the account you're signed in to/);
    // and a row with no owner at all is refused rather than assigned to the current account
    await w.runAsync(async () => { void props.onDuplicate(fakeEvent, { ...props.listing, agent_id: undefined }); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    await w.settle(5);
    assert.deepEqual(inserts, []);
  });
});

test("duplicate refuses when the account switches DURING its awaited session lookup, even though the lookup itself returned a matching owner", async () => {
  await withListings({ firstUser: A }, async (w, pending, inserts) => {
    pending[0].release(ok([row("A-1", A, "111 Alpha Street")]));
    await w.settle();
    const props = w.menuProps.get("A-1");
    assert.ok(props);
    await w.run(() => w.backend.emitAuth("SIGNED_OUT", null));
    await w.settle();
    w.backend.setSessionQuiet(A);                 // a lookup that starts now will read A's session ...
    const held = w.backend.holdSessionReads();    // ... but it is slow
    await w.runAsync(async () => { void props.onDuplicate(fakeEvent, props.listing); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    assert.equal(held.length, 1, "the handler is waiting on its session lookup");
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B)); // B signs in while it waits
    await w.runAsync(async () => { held[0].release(null); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    await w.settle(5);
    assert.equal(held[0].read?.user.id, A, "the lookup returned A, and A's listing carries A's id: the ownership check alone would pass");
    assert.deepEqual(inserts, [], "the generation check stopped it");
  });
});

test("command palette (mounted ALONE, no layout remount): a result for A that arrives after the account changed is discarded", async () => {
  const w = mountWorld({ firstUser: A, only: "palette" });
  const requests: { query: { filters: Record<string, unknown> }; release: (r: QueryResult) => void }[] = [];
  w.backend.handlers.listings = (q) => new Promise<QueryResult>((release) => requests.push({ query: q, release }));
  try {
    await w.mount();
    await w.settle();
    await w.togglePalette();
    await w.settle(5);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].query.filters.agent_id, A);
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B)); // the palette is NOT remounted here: only its own guard can stop the result
    requests[0].release(ok([{ id: "A-1", slug: "a-1", street: "Alpha Palette Street", city: "Exampleville", state: "NC" }]));
    await w.settle();
    assert.doesNotMatch(w.text(), /Alpha Palette Street/, "A's late result is not shown");
    assert.match(w.text(), /No results for/, "the palette is still there, empty");
  } finally {
    await w.unmount();
  }
});

test("command palette control: with no account change the same result IS shown (so the test above discriminates)", async () => {
  const w = mountWorld({ firstUser: A, only: "palette" });
  const requests: { release: (r: QueryResult) => void }[] = [];
  w.backend.handlers.listings = () => new Promise<QueryResult>((release) => requests.push({ release }));
  try {
    await w.mount();
    await w.settle();
    await w.togglePalette();
    await w.settle(5);
    requests[0].release(ok([{ id: "A-1", slug: "a-1", street: "Alpha Palette Street", city: "Exampleville", state: "NC" }]));
    await w.settle();
    assert.match(w.text(), /Alpha Palette Street/);
  } finally {
    await w.unmount();
  }
});

test("command palette inside the layout: opened for A, the account changes, A's late result never appears and B's palette asks for B's data", async () => {
  const w = mountWorld({ firstUser: A, page: "none" });
  const requests: { query: { filters: Record<string, unknown> }; release: (r: QueryResult) => void }[] = [];
  w.backend.handlers.listings = (q) => new Promise<QueryResult>((release) => requests.push({ query: q, release }));
  try {
    await w.mount();
    await w.settle();
    await w.togglePalette();
    await w.settle(5);
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B));
    await w.settle();
    requests[0].release(ok([{ id: "A-1", slug: "a-1", street: "Alpha Palette Street", city: "Exampleville", state: "NC" }]));
    await w.settle();
    assert.doesNotMatch(w.text(), /Alpha Palette Street/);
    await w.togglePalette();
    await w.settle(5);
    assert.equal(requests[1].query.filters.agent_id, B);
    requests[1].release(ok([{ id: "B-1", slug: "b-1", street: "Bravo Palette Street", city: "Exampleville", state: "NC" }]));
    await w.settle();
    assert.match(w.text(), /Bravo Palette Street/);
    assert.doesNotMatch(w.text(), /Alpha Palette Street/);
  } finally {
    await w.unmount();
  }
});

// ---- realtime cleanup outcomes, mounted ----

async function transitionWithRemoval(removeImpl: Parameters<World["backend"]["setRemoveChannel"]>[0]) {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
  process.on("unhandledRejection", onUnhandled);
  const w = mountWorld({ firstUser: A });
  w.backend.hold("listings");
  w.backend.setRemoveChannel(removeImpl);
  try {
    await w.mount();
    await w.settle();
    const aChannels = [...w.backend.activeChannels()];
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B));
    await w.settle();
    await sleep(25);
    const bActive = w.backend.channels.filter((c) => !c.removed && c.handlers[0].filter.filter === `agent_id=eq.${B}`);
    await w.run(() => aChannels[0].handlers[0].cb({ new: { id: "L9", name: "Late-A", created_at: new Date().toISOString() } }));
    const lateShown = /Late-A/.test(w.text());
    return { aChannels, bActive, unhandled: [...unhandled], lateShown };
  } finally {
    await w.unmount();
    process.off("unhandledRejection", onUnhandled);
  }
}

test("channel removal that REJECTS: no unhandled rejection, B's channels open, A's late callbacks stay ignored", async () => {
  const r = await transitionWithRemoval(() => Promise.reject(new Error("realtime socket closed")));
  assert.equal(r.unhandled.length, 0);
  assert.equal(r.bActive.length, 3);
  assert.ok(r.aChannels.every((c) => c.removed), "removal was requested for every A channel");
  assert.equal(r.lateShown, false);
});

test("channel removal that resolves 'timed out' or 'error' (unsuccessful statuses): handled quietly, B's channels open, A's late callbacks stay ignored", async () => {
  for (const status of ["timed out", "error"]) {
    const r = await transitionWithRemoval(() => Promise.resolve(status));
    assert.equal(r.unhandled.length, 0, status);
    assert.equal(r.bActive.length, 3, status);
    assert.equal(r.lateShown, false, status);
  }
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
