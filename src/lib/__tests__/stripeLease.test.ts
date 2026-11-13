import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { processCheckoutRequest, type CheckoutDeps, type CheckoutReservation, type ClaimResult, type SweepResult } from "../stripeCheckout";
import { processStripeEvent, type SubscriptionView, type WebhookDeps } from "../stripeWebhook";

// ---- a fake Stripe account (sessions) and a fake reservation table (migration 042 semantics)
type SessionState = "open" | "complete" | "expired";
function stripeWorld() {
  const sessions = new Map<string, { state: SessionState; attempt?: string }>();
  let seq = 0;
  const opts = { expireFails: new Set<string>(), listThrows: false };
  const api = {
    create: (attempt?: string) => { const id = "cs_" + ++seq; sessions.set(id, { state: "open", attempt }); return id; },
    pay: (id: string) => { const s = sessions.get(id); if (!s || s.state !== "open") return false; s.state = "complete"; return true; },
    expire: (id: string) => { const s = sessions.get(id); if (opts.expireFails.has(id)) throw new Error("stripe expire failed"); if (s && s.state === "open") s.state = "expired"; },
    sweep: async (_customer: string, except?: string): Promise<SweepResult> => {
      if (opts.listThrows) throw new Error("stripe list failed");
      let completedRecently = 0;
      for (const [id, s] of Array.from(sessions.entries())) {
        if (id === except || s.state !== "open") continue;
        try { api.expire(id); } catch { if (sessions.get(id)?.state === "complete") completedRecently++; }
      }
      const stillOpen = Array.from(sessions).filter(([id, s]) => id !== except && s.state === "open").length;
      completedRecently += Array.from(sessions).filter(([id, s]) => id !== except && s.state === "complete").length;
      return { stillOpen, completedRecently };
    },
  };
  return { sessions, api, opts };
}

function reservationStore(clock: { t: number }) {
  type Row = { id: string; status: "creating" | "open" | "completed" | "expired" | "failed"; session?: string; url?: string | null; lease: number };
  const rows: Row[] = []; let n = 0;
  const sweepRows = () => rows.forEach((r) => { if (r.lease < clock.t) { if (r.status === "creating") r.status = "failed"; else if (r.status === "open") r.status = "expired"; } });
  const res: CheckoutReservation = {
    claim: async (): Promise<ClaimResult> => {
      sweepRows();
      const a = rows.find((r) => r.status === "creating" || r.status === "open");
      if (a) return a.status === "open" ? { outcome: "existing_open", attemptId: a.id, sessionId: a.session, url: a.url } : { outcome: "in_progress", attemptId: a.id };
      const r: Row = { id: "att_" + ++n, status: "creating", lease: clock.t + 120_000 }; rows.push(r);
      return { outcome: "claimed", attemptId: r.id };
    },
    record: async (id, s, url, exp) => { const r = rows.find((x) => x.id === id); if (!r || r.status !== "creating") return false; Object.assign(r, { status: "open", session: s, url, lease: exp.getTime() }); return true; },
    fail: async (id) => { const r = rows.find((x) => x.id === id); if (r && r.status === "creating") r.status = "failed"; },
    expireSession: async () => {},
  };
  const complete = (session: string) => { const r = rows.find((x) => x.session === session && (x.status === "open" || x.status === "creating")); if (r) { r.status = "completed"; return true; } return false; };
  return { rows, res, complete };
}

function deps(world: ReturnType<typeof stripeWorld>, store: ReturnType<typeof reservationStore>, over: Partial<CheckoutDeps> = {}, profile: Record<string, unknown> = {}) {
  const logs: string[] = [];
  const d: CheckoutDeps = {
    getUser: async () => ({ id: "u1", email: "a@example.invalid" }),
    getProfile: async () => ({ stripe_customer_id: "cus_1", email: "a@example.invalid", name: "A", stripe_subscription_id: null, subscription_status: "trialing", ...profile }),
    createCustomer: async () => ({ id: "cus_1" }),
    saveCustomerId: async () => ({ rows: [{ id: "u1" }], error: null }),
    isPricingConfigured: () => true,
    sweepOpenSessions: world.api.sweep,
    createCheckoutSession: async (i) => { const id = world.api.create(i.attemptId); return { url: "https://checkout.example/" + id, sessionId: id, expiresAt: new Date(Date.now() + 31 * 60_000) }; },
    reservation: { ...store.res, expireSession: async (s) => world.api.expire(s) },
    log: (m) => { logs.push(m); },
    ...over,
  };
  return { d, logs };
}

// ---- A. lease takeover
test("A1. the original request creates its Stripe session AFTER its lease expired and a successor owns the reservation: the original's session is expired and cannot be paid", async () => {
  const clock = { t: 1_000_000 }; const w = stripeWorld(); const s = reservationStore(clock);
  // original: claims, then stalls before creating its session
  const original = await s.res.claim("u1", "cus_1", "p");
  clock.t += 121_000; // its lease lapses
  const successor = deps(w, s);
  const ok = await processCheckoutRequest(successor.d); // successor takes over and opens ITS session
  assert.equal(ok.status, 200);
  // the original wakes up and now creates its session, then tries to record it
  const orphan = w.api.create(original.attemptId);
  const recorded = await s.res.record(original.attemptId as string, orphan, "u", new Date(clock.t + 1_800_000));
  assert.equal(recorded, false, "its database write is rejected ...");
  assert.equal(w.sessions.get(orphan)?.state, "open", "... but rejecting the write alone does NOT close the Stripe session");
  w.api.expire(orphan); // what the application does next (expireSession) when it loses the claim
  assert.equal(w.sessions.get(orphan)?.state, "expired");
  assert.equal(w.api.pay(orphan), false, "an expired session cannot be paid");
});

test("A2. through the application: a slow owner that loses its claim expires the session it created", async () => {
  const clock = { t: 1_000_000 }; const w = stripeWorld(); const s = reservationStore(clock);
  const slow = deps(w, s, { reservation: { ...s.res, record: async () => false, expireSession: async (id) => w.api.expire(id) } });
  const out = await processCheckoutRequest(slow.d);
  assert.equal(out.status, 409);
  const only = Array.from(w.sessions.keys())[0];
  assert.equal(w.sessions.get(only)?.state, "expired");
});

test("A3. if expiring the lost session ALSO fails, it stays payable: that is stated, logged as an ORPHAN, and the webhook flags it if paid", async () => {
  const clock = { t: 1_000_000 }; const w = stripeWorld(); const s = reservationStore(clock);
  w.opts.expireFails.add("cs_1");
  const slow = deps(w, s, { reservation: { ...s.res, record: async () => false, expireSession: async (id) => w.api.expire(id) } });
  assert.equal((await processCheckoutRequest(slow.d)).status, 409);
  assert.equal(w.sessions.get("cs_1")?.state, "open", "still payable until it expires on its own (~31 minutes)");
  assert.ok(slow.logs.some((m) => /ORPHAN CHECKOUT SESSION may remain payable/.test(m)));
  // If it is paid, the webhook sees a completed session that is not a recorded attempt and says so loudly.
  assert.equal(w.api.pay("cs_1"), true);
  const marks: boolean[] = []; const wlogs: string[] = [];
  const sub: SubscriptionView = { id: "sub_9", status: "active", customerId: "cus_1", priceIds: ["price_lf"], userIdMeta: "u1" };
  const hook: WebhookDeps = {
    configuredPriceId: "price_lf", retrieveSubscription: async () => sub,
    findProfileBySubscription: async () => ({ profile: null, error: false }),
    findProfileById: async () => ({ profile: { id: "u1", stripeSubscriptionId: null, status: "trialing" }, error: false }),
    updateProfile: async () => ({ error: false, rows: 1 }),
    markCheckoutCompleted: async (sid, subId) => { const r = s.complete(sid); marks.push(r); return r; },
    log: (_l, m) => { wlogs.push(m); },
  };
  await processStripeEvent({ id: "e", type: "checkout.session.completed", object: { id: "cs_1", mode: "subscription", subscription: "sub_9", customer: "cus_1", metadata: {} } }, hook);
  assert.deepEqual(marks, [false]);
  assert.ok(wlogs.some((m) => /ORPHAN CHECKOUT PAID/.test(m)));
});

test("A4. a successor's second sweep closes an orphan that a slow predecessor created before the successor recorded its own session", async () => {
  const clock = { t: 1_000_000 }; const w = stripeWorld(); const s = reservationStore(clock);
  let created = 0;
  const d = deps(w, s, { createCheckoutSession: async (i) => {
    const id = w.api.create(i.attemptId);
    if (created++ === 0) w.api.create("late-orphan"); // a predecessor's session appears while we are creating ours
    return { url: "u", sessionId: id, expiresAt: new Date(Date.now() + 31 * 60_000) };
  } });
  assert.equal((await processCheckoutRequest(d.d)).status, 200);
  const states = Array.from(w.sessions.values()).map((x) => x.state);
  assert.deepEqual(states.sort(), ["expired", "open"]); // exactly one payable session remains: the reserved one
});

// ---- B. uncertain expiration
test("B1. an orphan that cannot be confirmed expired: the successor does NOT open another payable session", async () => {
  const clock = { t: 1_000_000 }; const w = stripeWorld(); const s = reservationStore(clock);
  const orphan = w.api.create("old"); w.opts.expireFails.add(orphan);
  const d = deps(w, s);
  const out = await processCheckoutRequest(d.d);
  assert.equal(out.status, 503);
  assert.equal(w.sessions.size, 1, "no new session was created");
  assert.equal(s.rows[0].status, "failed", "the claim was released so a later attempt can retry");
});

test("B2. an orphan that completes DURING expiration: the successor refuses with 'payment processing' and opens nothing", async () => {
  const clock = { t: 1_000_000 }; const w = stripeWorld(); const s = reservationStore(clock);
  const orphan = w.api.create("old");
  const realExpire = w.api.expire;
  w.api.expire = (id: string) => { if (id === orphan) { w.api.pay(id); throw new Error("session already complete"); } return realExpire(id); };
  const d = deps(w, s);
  const out = await processCheckoutRequest(d.d);
  assert.equal(out.status, 409); assert.match(String(out.body.error), /payment for this account may still be processing/);
  assert.equal(w.sessions.size, 1);
});

test("B3. a session completed within the last minutes (webhook not yet processed) also blocks a new session", async () => {
  const clock = { t: 1_000_000 }; const w = stripeWorld(); const s = reservationStore(clock);
  const done = w.api.create("old"); w.api.pay(done);
  const out = await processCheckoutRequest(deps(w, s).d);
  assert.equal(out.status, 409);
  assert.equal(w.sessions.size, 1);
});

test("B4. if Stripe cannot be asked (listing fails) nothing is opened and the claim is released", async () => {
  const clock = { t: 1_000_000 }; const w = stripeWorld(); const s = reservationStore(clock);
  w.opts.listThrows = true;
  const out = await processCheckoutRequest(deps(w, s).d);
  assert.equal(out.status, 503); assert.equal(w.sessions.size, 0); assert.equal(s.rows[0].status, "failed");
});

// ---- C. stored subscription ids
function reconcileDeps(verdict: () => Promise<"live" | "ended" | "missing">, cleared = true) {
  const calls: string[] = [];
  const w = stripeWorld(); const s = reservationStore({ t: 1_000_000 });
  const d = deps(w, s, {
    reconcileSubscription: async (id) => { calls.push("reconcile:" + id); return verdict(); },
    clearSubscription: async (_u, id) => { calls.push("clear:" + id); return cleared; },
  }, { stripe_subscription_id: "sub_old", subscription_status: "active" });
  return { d, calls, w };
}

test("C1. a live stored subscription blocks checkout (409) and is not touched", async () => {
  const r = reconcileDeps(async () => "live");
  assert.equal((await processCheckoutRequest(r.d.d)).status, 409);
  assert.deepEqual(r.calls, ["reconcile:sub_old"]);
});

test("C2. a canceled or incomplete_expired subscription is stale: its id is cleared (conditionally) and the agent may resubscribe", async () => {
  const r = reconcileDeps(async () => "ended");
  assert.equal((await processCheckoutRequest(r.d.d)).status, 200);
  assert.deepEqual(r.calls, ["reconcile:sub_old", "clear:sub_old"]);
});

test("C3. Stripe definitively reports 'no such subscription' for this account and mode: the id is cleared and resubscribing is possible", async () => {
  const r = reconcileDeps(async () => "missing");
  assert.equal((await processCheckoutRequest(r.d.d)).status, 200);
  assert.deepEqual(r.calls, ["reconcile:sub_old", "clear:sub_old"]);
});

test("C4. a TEMPORARY Stripe failure never clears the id and never allows a second subscription (503)", async () => {
  const r = reconcileDeps(async () => { throw new Error("network timeout"); });
  const out = await processCheckoutRequest(r.d.d);
  assert.equal(out.status, 503);
  assert.deepEqual(r.calls, ["reconcile:sub_old"], "no clear call was made");
  assert.equal(r.w.sessions.size, 0);
});

test("C5. if the conditional clear changed nothing (the profile moved on), checkout does not proceed", async () => {
  const r = reconcileDeps(async () => "ended", false);
  assert.equal((await processCheckoutRequest(r.d.d)).status, 409);
  assert.equal(r.w.sessions.size, 0);
});

test("C6. webhook: a stored subscription that is stale in Stripe does not block applying a new one; a transient failure writes nothing and retries", async () => {
  const subs: Record<string, SubscriptionView | null> = {
    sub_old: { id: "sub_old", status: "canceled", customerId: "c", priceIds: ["price_lf"], userIdMeta: "u1" },
    sub_new: { id: "sub_new", status: "active", customerId: "c", priceIds: ["price_lf"], userIdMeta: "u1" },
  };
  const row = { sub: "sub_old", status: "active" as string };
  let throwOnOld = false; const writes: unknown[] = [];
  const hook: WebhookDeps = {
    configuredPriceId: "price_lf",
    retrieveSubscription: async (id) => { if (throwOnOld && id === "sub_old") throw new Error("stripe down"); return subs[id] ?? null; },
    findProfileBySubscription: async () => ({ profile: null, error: false }),
    findProfileById: async () => ({ profile: { id: "u1", stripeSubscriptionId: row.sub, status: row.status }, error: false }),
    updateProfile: async (_i, f) => { writes.push(f); row.sub = String(f.stripe_subscription_id); row.status = String(f.subscription_status); return { error: false, rows: 1 }; },
    log: () => {},
  };
  const ev = { id: "e", type: "checkout.session.completed", object: { id: "cs_1", mode: "subscription", subscription: "sub_new", customer: "c", metadata: {} } };
  throwOnOld = true;
  await assert.rejects(() => processStripeEvent(ev, hook), /stripe down/);
  assert.equal(writes.length, 0);
  throwOnOld = false;
  assert.equal((await processStripeEvent(ev, hook)).body.applied, "active");
  assert.equal(row.sub, "sub_new");
});

// ---- D. pause and flag-off behaviour
test("D1. CHECKOUT_PAUSED: new checkouts get 503 and nothing at all is touched", async () => {
  const w = stripeWorld(); const s = reservationStore({ t: 1_000_000 });
  let profileReads = 0;
  const d = deps(w, s, { paused: () => true, getProfile: async () => { profileReads++; return null; } });
  const out = await processCheckoutRequest(d.d);
  assert.equal(out.status, 503); assert.equal(profileReads, 0); assert.equal(w.sessions.size, 0); assert.equal(s.rows.length, 0);
});

test("D2. with the reservation OFF (flag unset) simultaneous attempts are NOT protected: both sessions are created and payable (the older exposure)", async () => {
  const w = stripeWorld(); const s = reservationStore({ t: 1_000_000 });
  const off = deps(w, s, { reservation: undefined, sweepOpenSessions: undefined, expireOpenSessions: async () => {} });
  const [a, b] = await Promise.all([processCheckoutRequest(off.d), processCheckoutRequest(off.d)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(Array.from(w.sessions.values()).filter((x) => x.state === "open").length, 2);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});

test("C7. an owner/complimentary account never starts checkout and is never reconciled or cleared (409)", async () => {
  const calls: string[] = [];
  const w = stripeWorld(); const s = reservationStore({ t: 1_000_000 });
  const d = deps(w, s, {
    reconcileSubscription: async () => { calls.push("reconcile"); return "missing"; },
    clearSubscription: async () => { calls.push("clear"); return true; },
  }, { complimentary_access: "owner", stripe_subscription_id: "sub_stale", subscription_status: "active" });
  const out = await processCheckoutRequest(d.d);
  assert.equal(out.status, 409);
  assert.deepEqual(calls, []);
  assert.equal(w.sessions.size, 0);
});

test("E1. a stored Stripe customer id from another mode (test id under a live key) is replaced, not used: checkout creates and saves a new customer", async () => {
  const w = stripeWorld(); const s = reservationStore({ t: 1_000_000 });
  let created = 0; const saved: string[] = [];
  const d = deps(w, s, {
    verifyCustomer: async () => "missing",
    createCustomer: async () => { created++; return { id: "cus_live_new" }; },
    saveCustomerId: async (_u, c) => { saved.push(c); return { rows: [{ id: "u1" }], error: null }; },
  }, { stripe_customer_id: "cus_test_old" });
  const out = await processCheckoutRequest(d.d);
  assert.equal(out.status, 200); assert.equal(created, 1); assert.deepEqual(saved, ["cus_live_new"]);
});

test("E2. a transient failure verifying the stored customer refuses checkout and never replaces or creates anything (503)", async () => {
  const w = stripeWorld(); const s = reservationStore({ t: 1_000_000 });
  let created = 0;
  const d = deps(w, s, { verifyCustomer: async () => { throw new Error("rate limited"); }, createCustomer: async () => { created++; return { id: "x" }; } }, { stripe_customer_id: "cus_1" });
  assert.equal((await processCheckoutRequest(d.d)).status, 503);
  assert.equal(created, 0); assert.equal(w.sessions.size, 0);
});

test("E3. webhooks never change an owner/complimentary account, by any event type", async () => {
  const writes: unknown[] = []; const logs: string[] = [];
  const sub: SubscriptionView = { id: "sub_stale", status: "canceled", customerId: "cus_x", priceIds: ["price_lf"], userIdMeta: "owner1" };
  const prof = { id: "owner1", stripeSubscriptionId: "sub_stale", status: "active", complimentary: true };
  const hook: WebhookDeps = {
    configuredPriceId: "price_lf", retrieveSubscription: async () => sub,
    findProfileBySubscription: async () => ({ profile: prof, error: false }),
    findProfileById: async () => ({ profile: prof, error: false }),
    updateProfile: async (_i, f) => { writes.push(f); return { error: false, rows: 1 }; },
    log: (_l, m) => { logs.push(m); },
  };
  for (const ev of [
    { id: "a", type: "customer.subscription.deleted", object: { id: "sub_stale" } },
    { id: "b", type: "customer.subscription.updated", object: { id: "sub_stale" } },
    { id: "c", type: "invoice.payment_failed", object: { parent: { subscription_details: { subscription: "sub_stale" } } } },
    { id: "d", type: "checkout.session.completed", object: { id: "cs", mode: "subscription", subscription: "sub_new", customer: "cus_x", metadata: {} } },
  ]) {
    const r = await processStripeEvent(ev, hook);
    assert.equal(r.status, 200); assert.equal(r.body.ignored, "complimentary_account", ev.type);
  }
  assert.equal(writes.length, 0);
});
