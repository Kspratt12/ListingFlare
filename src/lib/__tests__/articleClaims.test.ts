import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { getAllPosts } from "../blog";

const posts = getAllPosts();

// Unconditional promises about what ListingFlare sends or answers. Replies are AI-written emails sent unless Approval Mode is on,
// and the chatbot answers only from the listing details the agent entered.
const BANNED: RegExp[] = [
  /instant AI(-drafted)? repl/i,
  /instant first repl/i,
  /instant follow-up email/i,
  /instant auto-reply/i,
  /actively generates leads/i,
  /every chat conversation becomes a lead/i,
  /chatbot (gives|provides) an? (accurate, )?instant/i,
  /answers? (buyer )?questions? instantly with accurate/i,
];

test("no article makes an unconditional instant-reply, instant-follow-up or lead-generation promise about ListingFlare", () => {
  const hits: string[] = [];
  for (const p of posts) {
    for (const re of BANNED) if (re.test(p.content) || re.test(p.description) || re.test(p.title)) hits.push(`${p.slug}: ${re}`);
  }
  assert.deepEqual(hits, []);
});

test("the rewritten reply wording still says approval mode where a reply is described as sent", () => {
  const guide = posts.find((p) => p.slug === "how-to-create-a-single-property-website");
  assert.ok(guide);
  assert.match(guide!.content, /unless you hold it for approval/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
