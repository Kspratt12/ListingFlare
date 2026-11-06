import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { mountWorld, type World } from "./_mounted";
import type { QueryResult } from "./_fakeBackend";

// MOUNTED-COMPONENT tests. The real dashboard layout, listings page, live alerts and command palette, the real session
// manager and the real cache are mounted with react-dom against a fake account service (see _mounted.ts for exactly what is
// substituted). Fictional users A and B. Each test asserts what is VISIBLE in the rendered tree and who OWNS the cache.
//
// NOT verified here: a real browser (layout, focus, event timing, tab visibility), the real Supabase client's event order and
// realtime behavior, and the widgets/modals the listings page normally renders (stubbed, see _mounted.ts).

const A = "user-A";
const B = "user-B";
const row = (id: string, userId: string, street: string) => ({ id, agent_id: userId, status: "published", slug: id, street, city: "Exampleville", state: "NC", zip: "27000", price: 450000, beds: 3, baths: 2, sqft: 1800, year_built: 2000, lot_size: null, description: "d", features: [], photos: [], videos: [], virtual_tour_url: "", view_count: 0, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
const ok = (rows: unknown[]): QueryResult => ({ data: rows, count: rows.length, error: null });
const cached = (w: World) => JSON.stringify(w.swr.cacheGet("dashboard:listings") ?? null);
const hasActions = (w: World, id: string) => w.container.find((e) => e.getAttribute("data-actions") === id).length > 0;
const listingRequests = (w: World) => w.backend.queries.filter((q) => q.table === "listings" && q.op === "select" && String(q.select).includes("agent_id"));
const channelFilters = (w: World) => w.backend.activeChannels().map((c) => `${c.name}:${String(c.handlers[0]?.filter.filter)}`);
const alertPayload = (id: string, name: string) => ({ new: { id, name, message: "hello", status: "new", created_at: new Date().toISOString(), showing_date: "2026-12-01", showing_time: "10:00", direction: "inbound", body: "hi" } });

async function withWorld(opts: Parameters<typeof mountWorld>[0], fn: (w: World, pending: ReturnType<World["backend"]["hold"]>) => Promise<void>) {
  const w = mountWorld(opts);
  const pending = w.backend.hold("listings");
  try {
    await w.mount();
    await w.settle();
    await fn(w, pending);
  } finally {
    await w.unmount();
  }
}

test("A's request resolving after A -> B: B's rows are shown, A's never appear, the cache belongs to B, and nothing of A's can be acted on", async () => {
  await withWorld({ firstUser: A }, async (w, pending) => {
    assert.equal(pending.length, 1);
    assert.equal(pending[0].query.filters.agent_id, A);
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B));
    await w.settle();
    assert.equal(pending.length, 2, "the remounted page asked for B's listings");
    assert.equal(pending[1].query.filters.agent_id, B);
    pending[1].release(ok([row("B-1", B, "222 Bravo Street")]));
    await w.settle();
    assert.match(w.text(), /222 Bravo Street/);
    pending[0].release(ok([row("A-1", A, "111 Alpha Street")])); // A's slow answer finally arrives
    await w.settle();
    assert.doesNotMatch(w.text(), /111 Alpha Street/);
    assert.match(w.text(), /222 Bravo Street/);
    assert.equal(hasActions(w, "A-1"), false, "no actions for A's listing are rendered");
    assert.equal(hasActions(w, "B-1"), true);
    assert.equal(w.swr.getCacheOwner(), B);
    assert.ok(cached(w).includes("B-1") && !cached(w).includes("A-1"), "the cache holds only B's rows");
  });
});

test("A -> sign-out: a session-unavailable state (never an empty account), A's late rows are dropped, the cache is empty and A's channels are closed", async () => {
  await withWorld({ firstUser: A }, async (w, pending) => {
    assert.equal(w.backend.activeChannels().length, 3, "A's three live channels are open");
    await w.run(() => w.backend.emitAuth("SIGNED_OUT", null));
    await w.settle();
    assert.match(w.text(), /couldn't confirm that you're signed in/);
    assert.doesNotMatch(w.text(), /No listings yet/);
    pending[0].release(ok([row("A-1", A, "111 Alpha Street")]));
    await w.settle();
    assert.doesNotMatch(w.text(), /111 Alpha Street/);
    assert.equal(hasActions(w, "A-1"), false);
    assert.equal(w.swr.getCacheOwner(), null);
    assert.equal(w.swr.cacheGet("dashboard:listings"), undefined);
    assert.equal(w.backend.activeChannels().length, 0, "all of A's channels were removed");
    assert.equal(w.backend.channels.length, 3, "and none were opened for a signed-out session");
  });
});

test("A -> B -> A while the original A request is pending: only the newest request for the current account is shown", async () => {
  await withWorld({ firstUser: A }, async (w, pending) => {
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B));
    await w.settle();
    await w.run(() => w.backend.emitAuth("SIGNED_IN", A));
    await w.settle();
    assert.equal(pending.length, 3);
    assert.deepEqual(pending.map((p) => p.query.filters.agent_id), [A, B, A]);
    pending[0].release(ok([row("A-OLD", A, "333 Oldalpha Street")])); // the ORIGINAL A request, from before the round trip
    pending[1].release(ok([row("B-1", B, "222 Bravo Street")]));
    await w.settle();
    assert.doesNotMatch(w.text(), /333 Oldalpha Street|222 Bravo Street/, "neither stale result is shown while the current request is pending");
    assert.equal(w.swr.cacheGet("dashboard:listings"), undefined, "and neither was cached");
    pending[2].release(ok([row("A-NEW", A, "444 Newalpha Street")]));
    await w.settle();
    assert.match(w.text(), /444 Newalpha Street/);
    assert.equal(hasActions(w, "A-OLD"), false);
    assert.equal(hasActions(w, "B-1"), false);
    assert.equal(w.swr.getCacheOwner(), A);
    assert.ok(cached(w).includes("A-NEW") && !cached(w).includes("A-OLD") && !cached(w).includes("B-1"));
  });
});

test("a realtime callback arriving during the transition is ignored; after it, A's channels are closed, B's are open, and only B's events show", async () => {
  await withWorld({ firstUser: A }, async (w) => {
    const aChannels = [...w.backend.activeChannels()];
    assert.equal(aChannels.length, 3);
    await w.run(() => aChannels[0].handlers[0].cb(alertPayload("L1", "Alice Lead")));
    await w.settle(5);
    assert.match(w.text(), /New lead: Alice Lead/, "before the change A's event is shown");

    // the account changes; the layout has not been told yet (the notification is deferred), and an old event arrives
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B));
    await w.run(() => aChannels[1].handlers[0].cb(alertPayload("S1", "A-Showing")));
    assert.doesNotMatch(w.text(), /A-Showing/, "the late A event is ignored even though the channel is not closed yet");

    await w.settle();
    assert.ok(aChannels.every((c) => c.removed), "A's channels were closed");
    const bChannels = w.backend.activeChannels();
    assert.equal(bChannels.length, 3);
    assert.ok(bChannels.every((c) => c.handlers[0].filter.filter === `agent_id=eq.${B}`), "B's channels are filtered to B");
    assert.doesNotMatch(w.text(), /Alice Lead/, "A's earlier alert did not survive into B's session");
    await w.run(() => aChannels[0].handlers[0].cb(alertPayload("L2", "Late-A-Lead"))); // a callback from a channel that is already closed
    await w.run(() => bChannels[0].handlers[0].cb(alertPayload("L3", "Bob Lead")));
    await w.settle(5);
    assert.doesNotMatch(w.text(), /Late-A-Lead/);
    assert.match(w.text(), /New lead: Bob Lead/);
  });
});

test("same-user token refresh and focus sign-ins: no remount, no refetch, no resubscription, rows and cache unchanged", async () => {
  await withWorld({ firstUser: A }, async (w, pending) => {
    pending[0].release(ok([row("A-1", A, "111 Alpha Street")]));
    await w.settle();
    const before = { text: w.text(), listingReqs: listingRequests(w).length, profileReqs: w.backend.queries.filter((q) => q.table === "agent_profiles").length, channels: w.backend.channels.length, generation: w.session.getSessionGeneration() };
    for (let i = 0; i < 50; i++) await w.run(() => w.backend.emitAuth(i % 3 === 0 ? "TOKEN_REFRESHED" : i % 3 === 1 ? "SIGNED_IN" : "USER_UPDATED", A));
    await w.settle();
    assert.equal(w.text(), before.text, "the rendered tree is unchanged");
    assert.equal(listingRequests(w).length, before.listingReqs, "no refetch");
    assert.equal(w.backend.queries.filter((q) => q.table === "agent_profiles").length, before.profileReqs, "no profile reload");
    assert.equal(w.backend.channels.length, before.channels, "no new channels");
    assert.equal(w.backend.removed.length, 0, "no channel was closed");
    assert.equal(w.session.getSessionGeneration(), before.generation);
    assert.equal(w.swr.getCacheOwner(), A);
    assert.ok(cached(w).includes("A-1"));
  });
});

test("Strict Mode: effects run twice on mount, yet there is exactly one set of live channels, and rows and cache end up correct", async () => {
  await withWorld({ firstUser: A, strict: true }, async (w, pending) => {
    assert.equal(w.backend.channels.length, 3, "the double-invoked effect did not open a second set of channels");
    assert.equal(w.backend.removed.length, 0);
    assert.ok(pending.length >= 1);
    pending.forEach((p, i) => p.release(ok([row("A-1", A, `111 Alpha Street${i ? " (again)" : ""}`)])));
    await w.settle();
    assert.match(w.text(), /111 Alpha Street/);
    assert.equal(w.swr.getCacheOwner(), A);
    // and an account change under Strict Mode still ends with only B's channels live
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B));
    await w.settle();
    assert.equal(channelFilters(w).length, 3);
    assert.ok(w.backend.activeChannels().every((c) => c.handlers[0].filter.filter === `agent_id=eq.${B}`));
    assert.equal(w.backend.channels.filter((c) => c.handlers[0].filter.filter === `agent_id=eq.${A}`).every((c) => c.removed), true, "every channel ever opened for A is closed");
  });
});

const offer = (id: string, userId: string, buyer: string) => ({ id, listing_id: "L", agent_id: userId, buyer_name: buyer, offer_price: 400000, contingencies: [], status: "submitted", received_at: "2026-01-02T00:00:00Z", created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", listing: { id: "L", street: "9 Fictional Way", city: "Exampleville", state: "NC" } });
const cachedKey = (w: World, key: string) => JSON.stringify(w.swr.cacheGet(key) ?? null);

test("OFFERS TAB (a patched tab, mounted): A's late offers neither appear for B nor enter B's cache, and A's late write-back is refused", async () => {
  const w = mountWorld({ firstUser: A, page: "offers" });
  const pending = w.backend.hold("offers");
  w.backend.handlers.listings = () => ({ data: [], error: null });
  try {
    await w.mount();
    await w.settle();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].query.filters.agent_id, A);
    await w.run(() => w.backend.emitAuth("SIGNED_IN", B));
    await w.settle();
    assert.equal(pending.length, 2, "the remounted tab asked for B's offers");
    assert.equal(pending[1].query.filters.agent_id, B);
    pending[1].release(ok([offer("B-offer-1", B, "Bob Buyer")]));
    await w.settle();
    assert.match(w.text(), /Bob Buyer/);
    pending[0].release(ok([offer("A-offer-1", A, "Alice Buyer")])); // A's slow answer
    await w.settle();
    assert.doesNotMatch(w.text(), /Alice Buyer/, "A's offer is never shown to B");
    assert.match(w.text(), /Bob Buyer/);
    assert.equal(w.swr.getCacheOwner(), B);
    assert.ok(cachedKey(w, "offers").includes("B-offer-1") && !cachedKey(w, "offers").includes("A-offer-1"), "the cache holds only B's offers");
  } finally {
    await w.unmount();
  }
});

test("OFFERS TAB: sign-out while A's request is pending leaves nothing for A in the tab or the cache", async () => {
  const w = mountWorld({ firstUser: A, page: "offers" });
  const pending = w.backend.hold("offers");
  w.backend.handlers.listings = () => ({ data: [], error: null });
  try {
    await w.mount();
    await w.settle();
    await w.run(() => w.backend.emitAuth("SIGNED_OUT", null));
    await w.settle();
    pending[0].release(ok([offer("A-offer-1", A, "Alice Buyer")]));
    await w.settle();
    assert.doesNotMatch(w.text(), /Alice Buyer/);
    assert.equal(w.swr.getCacheOwner(), null);
    assert.equal(w.swr.cacheGet("offers"), undefined);
  } finally {
    await w.unmount();
  }
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
