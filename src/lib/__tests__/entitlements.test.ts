import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { entitlementFor, type ServerEntitlement } from "../entitlements";
import { getSubscriptionLimits } from "../subscription";
import type { AgentProfile } from "../types";

const srcDir = process.env.LF_SRC_DIR as string;
const DAY = 86400000;
const future = new Date(Date.now() + 5 * DAY).toISOString();
const past = new Date(Date.now() - 5 * DAY).toISOString();
const prof = (status: AgentProfile["subscription_status"], trial_ends_at: string, stripe_subscription_id: string | null = null) => ({ subscription_status: status, trial_ends_at, stripe_subscription_id });
const SUB = "sub_synthetic_123";
const KEYS: ServerEntitlement[] = ["replyToLeads", "socialPosts"];

test("PAID ACCESS IS PRESERVED: an active subscriber gets every server entitlement", () => {
  for (const k of KEYS) assert.equal(entitlementFor(prof("active", past), k), true, k);
});

test("a live trial does NOT get the paid-only entitlements (matches the dashboard)", () => {
  for (const k of KEYS) assert.equal(entitlementFor(prof("trialing", future), k), false, k);
});

test("an expired trial, past_due, canceled, unpaid and a missing profile get nothing", () => {
  for (const k of KEYS) {
    assert.equal(entitlementFor(prof("trialing", past), k), false);
    assert.equal(entitlementFor(prof("past_due", future), k), false);
    assert.equal(entitlementFor(prof("canceled", future), k), false);
    assert.equal(entitlementFor(prof("unpaid", future), k), false);
    assert.equal(entitlementFor(null, k), false);
  }
});

// The states this project can actually store: the free app trial ("trialing", no Stripe subscription),
// "active" (checkout completed), and whatever Stripe sends through the webhook (trialing, past_due,
// canceled, unpaid; incomplete states are mapped to "unpaid").
test("a PAID customer on a Stripe-side trial (status trialing, has a Stripe subscription) keeps both entitlements, even when the old free-trial date is long past", () => {
  for (const k of KEYS) {
    assert.equal(entitlementFor(prof("trialing", future, SUB), k), true, k + " live");
    assert.equal(entitlementFor(prof("trialing", past, SUB), k), true, k + " stale free-trial date");
  }
  const lim = getSubscriptionLimits(prof("trialing", past, SUB) as AgentProfile);
  assert.equal(lim.isPaid, true);
  assert.equal(lim.isExpired, false);
  assert.equal(lim.maxListings, Infinity);
});

test("an 'active' customer keeps access whether or not a Stripe id is on the row and whatever the trial date says", () => {
  for (const k of KEYS) {
    assert.equal(entitlementFor(prof("active", past, null), k), true);
    assert.equal(entitlementFor(prof("active", future, SUB), k), true);
  }
});

test("the free app trial (trialing, NO Stripe subscription) is still denied, live or expired", () => {
  for (const k of KEYS) {
    assert.equal(entitlementFor(prof("trialing", future, null), k), false);
    assert.equal(entitlementFor(prof("trialing", past, null), k), false);
  }
});

test("a Stripe subscription id does not unlock access for payment states: past_due, canceled, unpaid stay denied (same as the dashboard)", () => {
  for (const k of KEYS) for (const s of ["past_due", "canceled", "unpaid"] as const) {
    assert.equal(entitlementFor(prof(s, future, SUB), k), false, k + " " + s);
  }
});

test("the server can never differ from the screen: every status gives the same answer as getSubscriptionLimits", () => {
  const statuses: AgentProfile["subscription_status"][] = ["trialing", "active", "past_due", "canceled", "unpaid"];
  for (const s of statuses) for (const t of [future, past]) for (const id of [null, SUB]) {
    const lim = getSubscriptionLimits(prof(s, t, id) as AgentProfile);
    assert.equal(entitlementFor(prof(s, t, id), "replyToLeads"), lim.canReplyToLeads, `${s} ${t === future ? "future" : "past"} ${id}`);
    assert.equal(entitlementFor(prof(s, t, id), "socialPosts"), lim.canGenerateSocialPosts);
  }
});

const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8");

test("static: the lead reply route checks the entitlement before it reads the form's files or sends anything", () => {
  const t = read("app/api/leads/reply/route.ts");
  const gate = t.indexOf('hasEntitlement(user.id, "replyToLeads")');
  assert.ok(gate > 0);
  for (const later of ["new Resend(", "getAll(\"attachments\")", ".from(\"agent_profiles\")", ".emails.send("]) {
    const at = t.indexOf(later);
    if (at >= 0) assert.ok(gate < at, `${later} comes after the gate`);
  }
  assert.match(t, /status: 402/);
});

test("static: social posts and social captions require the paid entitlement before any data is read or AI is called", () => {
  const posts = read("app/api/social-posts/route.ts");
  assert.ok(posts.indexOf('hasEntitlement(user.id, "socialPosts")') > 0);
  assert.ok(posts.indexOf('hasEntitlement(user.id, "socialPosts")') < posts.indexOf('.from("listings")'));
  const cap = read("app/api/ai/social-caption/route.ts");
  const gate = cap.indexOf('hasEntitlement(user.id, "socialPosts")');
  assert.ok(gate > 0);
  for (const later of ["rateLimit({", "messages.create(", "createAnthropic("]) {
    const at = cap.indexOf(later);
    if (at >= 0) assert.ok(gate < at, `${later} comes after the gate`);
  }
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
