import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { getSubscriptionLimits } from "../subscription";
import type { AgentProfile } from "../types";

const future = new Date(Date.now() + 5 * 86400000).toISOString();
const trial = getSubscriptionLimits({ subscription_status: "trialing", trial_ends_at: future, stripe_subscription_id: null } as AgentProfile);
const paid = getSubscriptionLimits({ subscription_status: "active", trial_ends_at: future, stripe_subscription_id: "sub_x" } as AgentProfile);

test("flyers are available during the trial, matching what the product does and what the pricing page lists", () => {
  assert.equal(trial.canGenerateOpenHouseFlyer, true);
  assert.equal(paid.canGenerateOpenHouseFlyer, true);
});

test("there is no lead cap in the plan limits: nothing can hide or drop buyer inquiries by plan", () => {
  assert.equal("maxLeads" in trial, false);
  assert.equal("maxLeads" in paid, false);
});

test("everything else about the trial is unchanged: 1 listing, 5 photos, no video, no dashboard replies, no social pack, 1 AI description", () => {
  assert.equal(trial.maxListings, 1);
  assert.equal(trial.maxPhotos, 5);
  assert.equal(trial.maxVideos, 0);
  assert.equal(trial.canReplyToLeads, false);
  assert.equal(trial.canGenerateSocialPosts, false);
  assert.equal(trial.maxAiDescriptions, 1);
});

test("paid access is unchanged", () => {
  assert.equal(paid.maxListings, Infinity);
  assert.equal(paid.maxPhotos, Infinity);
  assert.equal(paid.maxVideos, 10);
  assert.equal(paid.canReplyToLeads, true);
  assert.equal(paid.canGenerateSocialPosts, true);
  assert.equal(paid.maxAiDescriptions, Infinity);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
