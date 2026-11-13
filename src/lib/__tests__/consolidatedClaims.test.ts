import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

test("the homepage makes no unverified claims about how Zillow or other portals treat listings or inquiries", () => {
  const home = read("app/HomeClient.tsx");
  assert.doesNotMatch(home, /Why agents stop relying on Zillow|On Zillow|competitor ads|routed to other agents|zero competing agents/i);
  // the FAQ describes only what ListingFlare is and does
  assert.match(home, /does not syndicate your listing to the MLS or to portals/);
});

test("cost-to-sell: only the hypothetical worked example carries dollar assumptions; no unsourced per-item price ranges remain", () => {
  const a = read("content/articles/how-much-does-it-cost-to-sell-a-house.ts");
  // any "$x to $y" price range (escaped dollar signs in the template literal) is a market-style range without a cited basis
  assert.doesNotMatch(a, /\\\$[0-9,]+\s+to\s+\\\$[0-9,]+/);
  assert.doesNotMatch(a, /\\\$[0-9,]+–\\\$[0-9,]+/);
  assert.doesNotMatch(a, /rough planning figure|Budget <strong>|growing number of sellers/i);
  assert.match(a, /hypothetical/i);
  // the example's assumptions are explicit and the arithmetic matches the table
  assert.equal(0.05 * 400000 + 0.02 * 400000 + 5000, 33000);
  assert.match(a, /\\\$33,000/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
