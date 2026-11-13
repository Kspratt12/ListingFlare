import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { mapStripeStatus, processStripeEvent, type SubscriptionView, type WebhookDeps } from "../stripeWebhook";

const PRICE = "price_listingflare";
const OTHER = "price_other_product";

interface Row { id: string; stripe_subscription_id: string | null; subscription_status: string; stripe_customer_id?: string | null; setup_fee_paid?: boolean }

function world(opts: { rows: Row[]; subs: Record<string, SubscriptionView | null>; failUpdate?: boolean; failLookup?: boolean; price?: string | null }) {
  const logs: Array<{ level: string; message: string }> = [];
  const writes: Array<{ userId: string; fields: Record<string, unknown> }> = [];
  const deps: WebhookDeps = {
    configuredPriceId: opts.price === undefined ? PRICE : opts.price,
    retrieveSubscription: async (id) => opts.subs[id] ?? null,
    findProfileBySubscription: async (subId) => {
      if (opts.failLookup) return { profile: null, error: true };
      const r = opts.rows.find((x) => x.stripe_subscription_id === subId);
      return { profile: r ? { id: r.id, stripeSubscriptionId: r.stripe_subscription_id, status: r.subscription_status } : null, error: false };
    },
    findProfileById: async (id) => {
      if (opts.failLookup) return { profile: null, error: true };
      const r = opts.rows.find((x) => x.id === id);
      return { profile: r ? { id: r.id, stripeSubscriptionId: r.stripe_subscription_id, status: r.subscription_status } : null, error: false };
    },
    updateProfile: async (userId, fields, only) => {
      if (opts.failUpdate) return { error: true, rows: 0 };
      const r = opts.rows.find((x) => x.id === userId);
      if (!r) return { error: false, rows: 0 };
      if (typeof only === "string" && r.stripe_subscription_id !== only) return { error: false, rows: 0 };
      if (only === null && r.stripe_subscription_id !== null) return { error: false, rows: 0 };
      writes.push({ userId, fields });
      Object.assign(r, fields);
      return { error: false, rows: 1 };
    },
    log: (level, message) => { logs.push({ level, message }); },
  };
  return { deps, rows: opts.rows, writes, logs };
}
const sub = (id: string, status: string, user: string | null = "u1", price = PRICE): SubscriptionView => ({ id, status, customerId: "cus_1", priceIds: [price], userIdMeta: user });
const checkout = (subId: string | null, mode = "subscription") => ({ id: "evt_c", type: "checkout.session.completed", object: { mode, subscription: subId, customer: "cus_1", metadata: {} } });
const updated = (id: string) => ({ id: "evt_u", type: "customer.subscription.updated", object: { id } });
const deleted = (id: string) => ({ id: "evt_d", type: "customer.subscription.deleted", object: { id } });
const failedInvoice = (subId: string) => ({ id: "evt_f", type: "invoice.payment_failed", object: { parent: { subscription_details: { subscription: subId } } } });
const row = (over: Partial<Row> = {}): Row => ({ id: "u1", stripe_subscription_id: null, subscription_status: "trialing", ...over });

test("status mapping fits the database CHECK constraint (paused and incomplete become unpaid)", () => {
  for (const s of ["trialing", "active", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired", "paused", "something_new"]) {
    assert.ok(["trialing", "active", "past_due", "canceled", "unpaid"].includes(mapStripeStatus(s)), s);
  }
  assert.equal(mapStripeStatus("paused"), "unpaid");
  assert.equal(mapStripeStatus("incomplete"), "unpaid");
});

test("a paid checkout activates the profile and stores the customer and subscription", async () => {
  const w = world({ rows: [row()], subs: { sub_1: sub("sub_1", "active") } });
  const r = await processStripeEvent(checkout("sub_1"), w.deps);
  assert.equal(r.status, 200);
  assert.deepEqual([w.rows[0].subscription_status, w.rows[0].stripe_subscription_id, w.rows[0].stripe_customer_id, w.rows[0].setup_fee_paid], ["active", "sub_1", "cus_1", true]);
});

test("a legitimate Stripe trial stays trialing (not forced to active) and keeps its subscription id", async () => {
  const w = world({ rows: [row({ subscription_status: "trialing" })], subs: { sub_t: sub("sub_t", "trialing") } });
  await processStripeEvent(checkout("sub_t"), w.deps);
  assert.deepEqual([w.rows[0].subscription_status, w.rows[0].stripe_subscription_id], ["trialing", "sub_t"]);
});

test("a delayed payment (incomplete) is NOT activated at checkout completion, and becomes active when Stripe says so", async () => {
  const subs: Record<string, SubscriptionView | null> = { sub_d: sub("sub_d", "incomplete") };
  const w = world({ rows: [row()], subs });
  await processStripeEvent(checkout("sub_d"), w.deps);
  assert.equal(w.rows[0].subscription_status, "unpaid");
  assert.equal(w.rows[0].stripe_subscription_id, "sub_d");
  subs.sub_d = sub("sub_d", "active");
  await processStripeEvent(updated("sub_d"), w.deps);
  assert.equal(w.rows[0].subscription_status, "active");
});

test("events about another product in the shared Stripe account are ignored", async () => {
  const w = world({ rows: [row({ stripe_subscription_id: "sub_x", subscription_status: "active" })], subs: { sub_x: sub("sub_x", "canceled", null, OTHER) } });
  for (const ev of [updated("sub_x"), deleted("sub_x"), checkout("sub_x"), failedInvoice("sub_x")]) {
    const r = await processStripeEvent(ev, w.deps);
    assert.equal(r.status, 200); assert.equal(r.body.ignored, "other_product", ev.type);
  }
  assert.equal(w.writes.length, 0);
  assert.equal(w.rows[0].subscription_status, "active");
});

test("a ListingFlare-marked subscription on an unrecognised price is NOT applied and NOT silent (logged at error level)", async () => {
  const w = world({ rows: [row({ stripe_subscription_id: "sub_1", subscription_status: "active" })], subs: { sub_9: sub("sub_9", "active", "u1", OTHER) } });
  for (const ev of [checkout("sub_9"), updated("sub_9"), deleted("sub_9")]) {
    const r = await processStripeEvent(ev, w.deps);
    assert.equal(r.body.ignored, "unknown_price", ev.type);
  }
  assert.equal(w.writes.length, 0);
  assert.ok(w.logs.filter((l) => l.level === "error" && /UNRECOGNISED PRICE/.test(l.message)).length === 3);
});

test("non-subscription checkouts and unknown users are ignored without writing", async () => {
  const w = world({ rows: [row()], subs: { sub_1: sub("sub_1", "active", "ghost") } });
  assert.equal((await processStripeEvent(checkout(null, "payment"), w.deps)).body.ignored, "not_a_subscription_checkout");
  assert.equal((await processStripeEvent(checkout("sub_1"), w.deps)).body.ignored, "unknown_profile");
  assert.equal(w.writes.length, 0);
});

test("replaying the same event is harmless (absolute writes)", async () => {
  const w = world({ rows: [row()], subs: { sub_1: sub("sub_1", "active") } });
  await processStripeEvent(checkout("sub_1"), w.deps);
  const first = JSON.stringify(w.rows[0]);
  await processStripeEvent(checkout("sub_1"), w.deps);
  await processStripeEvent(updated("sub_1"), w.deps);
  await processStripeEvent(updated("sub_1"), w.deps);
  assert.equal(JSON.stringify(w.rows[0]), first);
});

test("out-of-order delivery: status comes from the subscription's current state, not a stale payload", async () => {
  // The payload of the old event would say past_due, but Stripe's current state is active.
  const w = world({ rows: [row({ stripe_subscription_id: "sub_1", subscription_status: "past_due" })], subs: { sub_1: sub("sub_1", "active") } });
  await processStripeEvent({ id: "evt_old", type: "customer.subscription.updated", object: { id: "sub_1", status: "past_due" } }, w.deps);
  assert.equal(w.rows[0].subscription_status, "active");
  // A late payment_failed invoice does not regress a subscription that has since been paid.
  await processStripeEvent(failedInvoice("sub_1"), w.deps);
  assert.equal(w.rows[0].subscription_status, "active");
});

test("payment failure marks past_due when Stripe's current state is past_due", async () => {
  const w = world({ rows: [row({ stripe_subscription_id: "sub_1", subscription_status: "active" })], subs: { sub_1: sub("sub_1", "past_due") } });
  await processStripeEvent(failedInvoice("sub_1"), w.deps);
  assert.equal(w.rows[0].subscription_status, "past_due");
});

test("a stale deletion of an OLD subscription cannot cancel the NEWER one", async () => {
  const w = world({ rows: [row({ stripe_subscription_id: "sub_new", subscription_status: "active" })], subs: { sub_old: sub("sub_old", "canceled"), sub_new: sub("sub_new", "active") } });
  const r = await processStripeEvent(deleted("sub_old"), w.deps);
  assert.equal(r.body.ignored, "no_matching_profile");
  assert.deepEqual([w.rows[0].subscription_status, w.rows[0].stripe_subscription_id], ["active", "sub_new"]);
});

test("deleting the current subscription cancels it and clears the id; resubscribing afterwards works", async () => {
  const w = world({ rows: [row({ stripe_subscription_id: "sub_1", subscription_status: "active" })], subs: { sub_1: sub("sub_1", "canceled"), sub_2: sub("sub_2", "active") } });
  await processStripeEvent(deleted("sub_1"), w.deps);
  assert.deepEqual([w.rows[0].subscription_status, w.rows[0].stripe_subscription_id], ["canceled", null]);
  await processStripeEvent(checkout("sub_2"), w.deps);
  assert.deepEqual([w.rows[0].subscription_status, w.rows[0].stripe_subscription_id], ["active", "sub_2"]);
});

test("a second checkout completing while a live subscription exists is NOT applied and is logged loudly (no cancel or refund)", async () => {
  const w = world({ rows: [row({ stripe_subscription_id: "sub_1", subscription_status: "active" })], subs: { sub_1: sub("sub_1", "active"), sub_2: sub("sub_2", "active") } });
  const r = await processStripeEvent(checkout("sub_2"), w.deps);
  assert.equal(r.body.ignored, "duplicate_subscription");
  assert.equal(w.rows[0].stripe_subscription_id, "sub_1");
  assert.ok(w.logs.some((l) => l.level === "error" && /DUPLICATE SUBSCRIPTION/.test(l.message)));
});

test("an updated event that arrives before checkout completion links nothing but can set status only when the profile has no subscription", async () => {
  const w = world({ rows: [row({ stripe_subscription_id: null, subscription_status: "trialing" })], subs: { sub_1: sub("sub_1", "active") } });
  await processStripeEvent(updated("sub_1"), w.deps);
  assert.equal(w.rows[0].subscription_status, "active");
  assert.equal(w.rows[0].stripe_subscription_id, null);
  // A profile that already holds a different subscription is not touched by an unknown subscription's event.
  const w2 = world({ rows: [row({ stripe_subscription_id: "sub_keep", subscription_status: "active" })], subs: { sub_1: sub("sub_1", "canceled") } });
  const r = await processStripeEvent(updated("sub_1"), w2.deps);
  assert.equal(r.body.ignored, "no_matching_profile");
  assert.equal(w2.rows[0].subscription_status, "active");
});

test("database failures return 500 so Stripe retries (they were previously swallowed)", async () => {
  const subs = { sub_1: sub("sub_1", "active") };
  const a = world({ rows: [row()], subs, failUpdate: true });
  assert.equal((await processStripeEvent(checkout("sub_1"), a.deps)).status, 500);
  const b = world({ rows: [row({ stripe_subscription_id: "sub_1" })], subs, failUpdate: true });
  assert.equal((await processStripeEvent(updated("sub_1"), b.deps)).status, 500);
  assert.equal((await processStripeEvent(deleted("sub_1"), b.deps)).status, 500);
  const c = world({ rows: [row()], subs, failLookup: true });
  assert.equal((await processStripeEvent(checkout("sub_1"), c.deps)).status, 500);
});

test("with no configured price, nothing is ignored as another product (old behavior preserved)", async () => {
  const w = world({ rows: [row({ stripe_subscription_id: "sub_x", subscription_status: "active" })], subs: { sub_x: sub("sub_x", "past_due", "u1", OTHER) }, price: null });
  await processStripeEvent(updated("sub_x"), w.deps);
  assert.equal(w.rows[0].subscription_status, "past_due");
});

test("unhandled event types are acknowledged", async () => {
  const w = world({ rows: [row()], subs: {} });
  assert.deepEqual(await processStripeEvent({ id: "e", type: "charge.refunded", object: {} }, w.deps), { status: 200, body: { received: true, ignored: "unhandled_type" } });
});

const srcDir = process.env.LF_SRC_DIR as string;
const route = fs.readFileSync(path.join(srcDir, "app/api/stripe/webhook/route.ts"), "utf8");
test("static: the route verifies the signature, delegates to the handler, and logs ids only", () => {
  assert.match(route, /constructEvent\(/);
  assert.match(route, /processStripeEvent\(/);
  assert.match(route, /STRIPE_MONTHLY_PRICE_ID/);
  assert.doesNotMatch(route, /console\.(log|error|warn)\([^)]*(email|payload|event\.data)/i);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
