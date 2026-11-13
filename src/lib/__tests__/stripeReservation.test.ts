import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { processCheckoutRequest, type CheckoutDeps, type CheckoutReservation, type ClaimResult } from "../stripeCheckout";
import { processStripeEvent, type SubscriptionView, type WebhookDeps } from "../stripeWebhook";

// An in-memory model of migration 042's semantics (the SQL itself is exercised against a real PostgreSQL by the
// scratch concurrency script; here the orchestration around it is tested with synthetic fixtures).
function store(now = () => Date.now()) {
  type Row = { id: string; agent: string; status: "creating" | "open" | "completed" | "expired" | "failed"; session?: string; url?: string | null; lease: number };
  const rows: Row[] = []; let n = 0;
  const sweep = (agent: string) => rows.forEach((r) => { if (r.agent === agent && r.lease < now()) { if (r.status === "creating") r.status = "failed"; else if (r.status === "open") r.status = "expired"; } });
  const active = (agent: string) => rows.find((r) => r.agent === agent && (r.status === "creating" || r.status === "open"));
  const res: CheckoutReservation = {
    claim: async (agent): Promise<ClaimResult> => {
      sweep(agent);
      const a = active(agent);
      if (a) return a.status === "open" ? { outcome: "existing_open", attemptId: a.id, sessionId: a.session, url: a.url } : { outcome: "in_progress", attemptId: a.id };
      const r: Row = { id: "att_" + ++n, agent, status: "creating", lease: now() + 120_000 }; rows.push(r);
      return { outcome: "claimed", attemptId: r.id };
    },
    record: async (id, session, url, exp) => { const r = rows.find((x) => x.id === id); if (!r || r.status !== "creating") return false; r.status = "open"; r.session = session; r.url = url; r.lease = exp.getTime(); return true; },
    fail: async (id) => { const r = rows.find((x) => x.id === id); if (r && r.status === "creating") r.status = "failed"; },
    expireSession: async (s) => { expired.push(s); },
  };
  const expired: string[] = [];
  return { rows, res, expired, setNow: (f: () => number) => { now = f; } };
}

function deps(res: CheckoutReservation | undefined, over: Partial<CheckoutDeps> = {}, profile: Record<string, unknown> = {}) {
  const created: Array<{ attemptId?: string }> = []; let seq = 0;
  const d: CheckoutDeps = {
    getUser: async () => ({ id: "u1", email: "a@example.invalid" }),
    getProfile: async () => ({ stripe_customer_id: "cus_1", email: "a@example.invalid", name: "A", stripe_subscription_id: null, subscription_status: "trialing", ...profile }),
    createCustomer: async () => ({ id: "cus_1" }),
    saveCustomerId: async () => ({ rows: [{ id: "u1" }], error: null }),
    isPricingConfigured: () => true,
    createCheckoutSession: async (i) => { created.push({ attemptId: i.attemptId }); const id = "cs_" + ++seq; return { url: "https://checkout.example/" + id, sessionId: id, expiresAt: new Date(Date.now() + 31 * 60_000) }; },
    reservation: res,
    log: () => {},
    ...over,
  };
  return { d, created };
}

test("concurrent attempts (same or different plan) create exactly one session; the others wait or reuse it", async () => {
  const s = store();
  const a = deps(s.res), b = deps(s.res), c = deps(s.res);
  const out = await Promise.all([processCheckoutRequest(a.d), processCheckoutRequest(b.d), processCheckoutRequest(c.d)]);
  const sessions = a.created.length + b.created.length + c.created.length;
  assert.equal(sessions, 1);
  assert.equal(out.filter((o) => o.status === 200).length, 1);
  assert.equal(out.filter((o) => o.status === 409).length, 2);
});

test("a double click or retry after the session exists returns the SAME checkout URL (also when the first response was lost)", async () => {
  const s = store(); const x = deps(s.res);
  const first = await processCheckoutRequest(x.d); // the response "is lost" on the way to the browser
  const retry = await processCheckoutRequest(x.d);
  assert.equal(retry.status, 200); assert.equal(retry.body.url, first.body.url);
  assert.equal(x.created.length, 1);
});

test("a paid session whose webhook has not arrived yet does not allow a second session", async () => {
  const s = store(); const x = deps(s.res);
  const first = await processCheckoutRequest(x.d);
  // The buyer pays; the reservation row is still 'open' because the webhook has not run.
  const click = await processCheckoutRequest(x.d);
  assert.equal(click.body.url, first.body.url); assert.equal(x.created.length, 1);
});

test("session creation failing releases the claim immediately and the error propagates; the retry succeeds", async () => {
  const s = store(); let boom = true;
  const x = deps(s.res, { createCheckoutSession: async () => { if (boom) { boom = false; throw new Error("stripe down"); } return { url: "u", sessionId: "cs_ok", expiresAt: new Date(Date.now() + 31 * 60_000) }; } });
  await assert.rejects(() => processCheckoutRequest(x.d), /stripe down/);
  assert.equal(s.rows[0].status, "failed");
  assert.equal((await processCheckoutRequest(x.d)).status, 200);
});

test("crash recovery: after the lease lapses a new request takes over; the slow original cannot record and its session is expired", async () => {
  let t = 1_000_000; const s = store(() => t);
  // Request 1 claims, then "crashes" before recording (we never call create/record for it).
  const stale = await s.res.claim("u1", "cus_1", "p");
  assert.equal(stale.outcome, "claimed");
  const x = deps(s.res);
  assert.equal((await processCheckoutRequest(x.d)).status, 409, "within the lease the second request waits");
  t += 121_000; // lease lapsed
  const ok = await processCheckoutRequest(x.d);
  assert.equal(ok.status, 200);
  // The slow original wakes up and tries to record: refused, so its caller must expire its own session.
  assert.equal(await s.res.record(stale.attemptId as string, "cs_slow", "u", new Date(t + 1_800_000)), false);
});

test("a slow request whose claim was swept expires the session it created and returns 409 (no unowned payable session)", async () => {
  const s = store();
  const slow = deps({ ...s.res, record: async () => false });
  const out = await processCheckoutRequest(slow.d);
  assert.equal(out.status, 409);
  assert.deepEqual(s.expired, ["cs_1"]);
});

test("abandoned or expired sessions release the reservation; completed and expired rows are not active", async () => {
  let t = 5_000_000; const s = store(() => t); let k = 0;
  const x = deps(s.res, { createCheckoutSession: async () => { const id = "cs_" + ++k; return { url: "https://checkout.example/" + id, sessionId: id, expiresAt: new Date(t + 31 * 60_000) }; } });
  const first = await processCheckoutRequest(x.d);
  assert.equal(first.status, 200);
  t += 32 * 60_000; // past the Stripe session expiry
  const next = await processCheckoutRequest(x.d);
  assert.equal(next.status, 200); assert.notEqual(next.body.url, first.body.url);
  assert.equal(s.rows[0].status, "expired");
});

test("the reservation is authoritative: reservation errors fail closed (503) and never create a session", async () => {
  const s = store(); const x = deps({ ...s.res, claim: async () => { throw new Error("db down"); } });
  const out = await processCheckoutRequest(x.d);
  assert.equal(out.status, 503); assert.equal(x.created.length, 0);
});

test("the attempt id is passed to Stripe so a retried creation is idempotent", async () => {
  const s = store(); const x = deps(s.res);
  await processCheckoutRequest(x.d);
  assert.equal(x.created[0].attemptId, "att_1");
});

test("a stored Stripe subscription of ANY status blocks a second checkout (portal or payment fix instead); a cleared id may resubscribe", async () => {
  for (const status of ["active", "past_due", "trialing", "unpaid"]) {
    const s = store(); const x = deps(s.res, {}, { stripe_subscription_id: "sub_1", subscription_status: status });
    assert.equal((await processCheckoutRequest(x.d)).status, 409, status);
    assert.equal(x.created.length, 0);
  }
  const s = store(); const x = deps(s.res, {}, { stripe_subscription_id: null, subscription_status: "canceled" });
  assert.equal((await processCheckoutRequest(x.d)).status, 200);
});

// ---- webhook side
const PRICE = "price_lf";
const subView = (id: string, status: string): SubscriptionView => ({ id, status, customerId: "cus_1", priceIds: [PRICE], userIdMeta: "u1" });
function hookWorld(sub: SubscriptionView, row: { sub: string | null; status: string }) {
  const marks: string[] = [];
  const w: WebhookDeps = {
    configuredPriceId: PRICE,
    retrieveSubscription: async () => sub,
    findProfileBySubscription: async (s) => ({ profile: row.sub === s ? { id: "u1", stripeSubscriptionId: row.sub, status: row.status } : null, error: false }),
    findProfileById: async () => ({ profile: { id: "u1", stripeSubscriptionId: row.sub, status: row.status }, error: false }),
    updateProfile: async (_i, f, only) => { if (typeof only === "string" && row.sub !== only) return { error: false, rows: 0 }; Object.assign(row, { sub: "stripe_subscription_id" in f ? f.stripe_subscription_id : row.sub, status: f.subscription_status ?? row.status }); return { error: false, rows: 1 }; },
    markCheckoutCompleted: async (s, sub2) => { marks.push("completed:" + s + ":" + sub2); },
    markCheckoutExpired: async (s) => { marks.push("expired:" + s); },
    log: () => {},
  };
  return { w, marks, row };
}

test("webhook: completion marks the attempt completed; session.expired marks it expired; a failure to mark never fails the webhook", async () => {
  const h = hookWorld(subView("sub_1", "active"), { sub: null, status: "trialing" });
  await processStripeEvent({ id: "e1", type: "checkout.session.completed", object: { id: "cs_9", mode: "subscription", subscription: "sub_1", customer: "cus_1", metadata: {} } }, h.w);
  assert.deepEqual(h.marks, ["completed:cs_9:sub_1"]);
  await processStripeEvent({ id: "e2", type: "checkout.session.expired", object: { id: "cs_10" } }, h.w);
  assert.deepEqual(h.marks, ["completed:cs_9:sub_1", "expired:cs_10"]);
  const failing: WebhookDeps = { ...h.w, markCheckoutCompleted: async () => { throw new Error("rpc down"); } };
  const h2 = hookWorld(subView("sub_2", "active"), { sub: null, status: "trialing" });
  const r = await processStripeEvent({ id: "e3", type: "checkout.session.completed", object: { id: "cs_11", mode: "subscription", subscription: "sub_2", customer: "cus_1", metadata: {} } }, { ...h2.w, markCheckoutCompleted: failing.markCheckoutCompleted });
  assert.equal(r.status, 200);
});

test("webhook: a subscription that ends without a 'deleted' event (incomplete_expired) frees the profile so the agent can check out again", async () => {
  const h = hookWorld(subView("sub_1", "incomplete_expired"), { sub: "sub_1", status: "unpaid" });
  await processStripeEvent({ id: "e", type: "customer.subscription.updated", object: { id: "sub_1" } }, h.w);
  assert.deepEqual([h.row.sub, h.row.status], [null, "canceled"]);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
