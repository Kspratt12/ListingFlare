import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

test("lead-capture page does not promise instant replies or automatic follow-ups (nurture sends are paused)", () => {
  const page = read("app/real-estate-lead-capture-software/page.tsx");
  assert.doesNotMatch(page, /reply instantly and follow up automatically|Instant auto-reply/i);
  assert.match(page, /AI email replies with optional approval/);
  assert.match(page, /AI email reply to each new lead, with an optional approval step/);
  const descs = page.match(/"Capture buyer leads from listing pages and open houses with a lead inbox[^"]+"/g) || [];
  assert.equal(descs.length, 3);
  for (const d of descs) assert.ok(d.length - 2 <= 160, "description length");
});

test("homepage stat tile no longer says Instant", () => {
  const home = read("app/HomeClient.tsx");
  assert.doesNotMatch(home, /text-gray-900">Instant<\/p>/);
  assert.match(home, /Buyer gets an answer from your details/);
});

test("older articles no longer say ListingFlare generates leads, is the only platform with these features, or sends instant follow-ups", () => {
  const rela = read("content/articles/cribflyer-vs-rela-vs-listingflare.ts");
  assert.doesNotMatch(rela, /actively generates leads|The only platform with an AI chatbot/);
  assert.match(rela, /It does not generate traffic or guarantee leads/);
  const guide = read("content/articles/how-to-create-single-property-website.ts");
  assert.doesNotMatch(guide, /instant follow-up emails/i);
  assert.match(guide, /AI email replies to new leads \(with optional approval before sending\)/);
});

test("builder screenshots are served at the width they are displayed", () => {
  assert.match(read("components/SeoLandingPage.tsx"), /sizes="\(min-width: 768px\) 848px, 100vw"/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
