import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getSubscriptionLimits } from "../subscription";
import { mapStripeStatus, processStripeEvent, type SubscriptionView, type WebhookDeps } from "../stripeWebhook";
import { processCheckoutRequest, type CheckoutDeps } from "../stripeCheckout";

// ---- Stripe status -> stored status -> application access (a deliberate table)
const FUTURE = new Date(Date.now() + 5 * 86_400_000).toISOString();
const access = (stripeStatus: string, subId: string | null) =>
  getSubscriptionLimits({ subscription_status: mapStripeStatus(stripeStatus), stripe_subscription_id: subId, trial_ends_at: FUTURE } as never);

test("each Stripe status maps deliberately to access: only active, and a Stripe-side trial, grant paid access", () => {
  const paid = (s: string, id: string | null) => access(s, id).isPaid;
  assert.equal(paid("active", "sub_1"), true);
  assert.equal(paid("trialing", "sub_1"), true);     // Stripe-side trial with a subscription (paid plan)
  assert.equal(paid("incomplete", "sub_1"), false);  // delayed payment not yet confirmed
  assert.equal(paid("incomplete_expired", "sub_1"), false);
  assert.equal(paid("unpaid", "sub_1"), false);
  assert.equal(paid("past_due", "sub_1"), false);    // existing behavior: paid access pauses while payment is overdue
  assert.equal(paid("paused", "sub_1"), false);
  assert.equal(paid("canceled", null), false);
  // None of the non-paid states shows the app free-trial banner either (only a genuine app trial does).
  for (const s of ["incomplete", "unpaid", "past_due", "paused", "canceled"]) assert.equal(access(s, s === "canceled" ? null : "sub_1").isTrialing, false, s);
  // The app-side trial (no Stripe subscription) is unchanged.
  assert.equal(getSubscriptionLimits({ subscription_status: "trialing", stripe_subscription_id: null, trial_ends_at: FUTURE } as never).isTrialing, true);
});

// ---- helpers for webhook scenarios
const PRICE = "price_lf";
function webhookWorld(subs: Record<string, SubscriptionView | null>, row: { id: string; sub: string | null; status: string }, opts: { retrieveThrows?: boolean } = {}) {
  const writes: Array<Record<string, unknown>> = [];
  const logs: Array<{ level: string; message: string }> = [];
  const deps: WebhookDeps = {
    configuredPriceId: PRICE,
    retrieveSubscription: async (id) => { if (opts.retrieveThrows) throw new Error("stripe unavailable"); return subs[id] ?? null; },
    findProfileBySubscription: async (s) => ({ profile: row.sub === s ? { id: row.id, stripeSubscriptionId: row.sub, status: row.status } : null, error: false }),
    findProfileById: async (id) => ({ profile: id === row.id ? { id: row.id, stripeSubscriptionId: row.sub, status: row.status } : null, error: false }),
    updateProfile: async (_id, fields, only) => {
      if (typeof only === "string" && row.sub !== only) return { error: false, rows: 0 };
      if (only === null && row.sub !== null) return { error: false, rows: 0 };
      writes.push(fields);
      if ("subscription_status" in fields) row.status = String(fields.subscription_status);
      if ("stripe_subscription_id" in fields) row.sub = (fields.stripe_subscription_id as string | null);
      return { error: false, rows: 1 };
    },
    log: (level, message) => logs.push({ level, message }),
  };
  return { deps, writes, logs, row };
}
const S = (id: string, status: string, price = PRICE): SubscriptionView => ({ id, status, customerId: "cus_1", priceIds: [price], userIdMeta: "u1" });
const done = (id: string) => ({ id: "evt_" + id, type: "checkout.session.completed", object: { mode: "subscription", subscription: id, customer: "cus_1", metadata: {} } });

test("a failure to read the subscription's current state throws (so Stripe retries) and writes NOTHING: access is neither revoked nor granted", async () => {
  for (const ev of [done("sub_1"), { id: "e", type: "customer.subscription.updated", object: { id: "sub_1" } }, { id: "e2", type: "invoice.payment_failed", object: { parent: { subscription_details: { subscription: "sub_1" } } } }, { id: "e3", type: "customer.subscription.deleted", object: { id: "sub_1" } }]) {
    const w = webhookWorld({ sub_1: S("sub_1", "active") }, { id: "u1", sub: "sub_1", status: "active" }, { retrieveThrows: true });
    await assert.rejects(() => processStripeEvent(ev, w.deps), /stripe unavailable/, ev.type);
    assert.equal(w.writes.length, 0, ev.type);
    assert.equal(w.row.status, "active");
  }
});

test("access is granted only from a signed Stripe event: the success page parameter is display-only and the webhook rejects unsigned calls", () => {
  const billing = fs.readFileSync(path.join(process.env.LF_SRC_DIR as string, "app/dashboard/billing/BillingContent.tsx"), "utf8");
  assert.doesNotMatch(billing, /supabase[^;]*update|\.from\("agent_profiles"\)\s*\.update/);
  const hook = fs.readFileSync(path.join(process.env.LF_SRC_DIR as string, "app/api/stripe/webhook/route.ts"), "utf8");
  assert.ok(hook.indexOf("constructEvent(") > 0 && hook.indexOf("constructEvent(") < hook.indexOf("processStripeEvent("));
  assert.match(hook, /status: 400/);
});

test("the intended price is accepted and an unrelated product is excluded; an event for an old subscription cannot replace the current one", async () => {
  const w = webhookWorld({ sub_old: S("sub_old", "canceled"), sub_cur: S("sub_cur", "active"), sub_x: S("sub_x", "active", "price_other") }, { id: "u1", sub: "sub_cur", status: "active" });
  assert.equal((await processStripeEvent({ id: "a", type: "customer.subscription.deleted", object: { id: "sub_old" } }, w.deps)).body.ignored, "no_matching_profile");
  assert.equal((await processStripeEvent({ id: "b", type: "customer.subscription.updated", object: { id: "sub_x" } }, w.deps)).body.ignored, "other_product");
  assert.equal((await processStripeEvent({ id: "c", type: "customer.subscription.updated", object: { id: "sub_cur" } }, w.deps)).body.applied, "active");
  assert.equal(w.row.sub, "sub_cur");
});

// ---- two checkout attempts opened before the first webhook
function checkoutWorld() {
  const open = new Set<string>(); const completed: string[] = []; let n = 0;
  const deps: CheckoutDeps = {
    getUser: async () => ({ id: "u1", email: "a@example.invalid" }),
    getProfile: async () => ({ stripe_customer_id: "cus_1", email: "a@example.invalid", name: "A", stripe_subscription_id: null, subscription_status: "trialing" }),
    createCustomer: async () => ({ id: "cus_1" }),
    saveCustomerId: async () => ({ rows: [{ id: "u1" }], error: null }),
    isPricingConfigured: () => true,
    expireOpenSessions: async () => { open.clear(); },
    createCheckoutSession: async () => { const id = "cs_" + ++n; open.add(id); return { url: id }; },
    log: () => {},
  };
  const pay = (id: string) => { if (!open.has(id)) return false; open.delete(id); completed.push(id); return true; };
  return { deps, open, pay, completed };
}

test("two checkout attempts opened one after the other (before any webhook): the earlier session is expired, so only one can be paid", async () => {
  const c = checkoutWorld();
  const a = await processCheckoutRequest(c.deps); const b = await processCheckoutRequest(c.deps);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(c.pay(a.body.url as string), false, "the first session was expired and cannot be paid");
  assert.equal(c.pay(b.body.url as string), true);
  assert.equal(c.completed.length, 1);
});

test("RESIDUAL RISK, stated plainly: two attempts created at the same instant can both stay open; if both are paid, two subscriptions bill, and the webhook can only LOG the second", async () => {
  const c = checkoutWorld();
  // Both attempts run their expire step before either session exists (a true race), so neither expires the other.
  const racing: CheckoutDeps = { ...c.deps, expireOpenSessions: async () => {} };
  const [a, b] = await Promise.all([processCheckoutRequest(racing), processCheckoutRequest(racing)]);
  assert.equal(c.pay(a.body.url as string), true);
  assert.equal(c.pay(b.body.url as string), true);
  assert.equal(c.completed.length, 2, "both were payable: this is NOT prevented");
  // The webhook then sees two live subscriptions for one agent: it applies the first and only logs the second.
  const w = webhookWorld({ sub_1: S("sub_1", "active"), sub_2: S("sub_2", "active") }, { id: "u1", sub: null, status: "trialing" });
  await processStripeEvent(done("sub_1"), w.deps);
  const second = await processStripeEvent(done("sub_2"), w.deps);
  assert.equal(second.body.ignored, "duplicate_subscription");
  assert.equal(w.row.sub, "sub_1");
  assert.ok(w.logs.some((l) => l.level === "error" && /DUPLICATE/.test(l.message)), "logged for the owner; billing for sub_2 is NOT stopped by this code");
});

test("a second checkout on a different ListingFlare price is not recognised as ListingFlare's by the single-price filter (only one price is configured today)", async () => {
  const w = webhookWorld({ sub_1: S("sub_1", "active"), sub_2: S("sub_2", "active", "price_listingflare_annual") }, { id: "u1", sub: "sub_1", status: "active" });
  const r = await processStripeEvent(done("sub_2"), w.deps);
  assert.equal(r.body.ignored, "other_product"); // neither applied nor logged as a duplicate: a gap if a second price is ever sold
});

test("if expiring earlier sessions fails, checkout still proceeds (and logs) rather than blocking a paying customer", async () => {
  const c = checkoutWorld(); const logs: string[] = [];
  const deps: CheckoutDeps = { ...c.deps, expireOpenSessions: async () => { throw new Error("stripe list failed"); }, log: (m) => logs.push(m) };
  assert.equal((await processCheckoutRequest(deps)).status, 200);
  assert.ok(logs.some((m) => /expire earlier open checkout/.test(m)));
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
