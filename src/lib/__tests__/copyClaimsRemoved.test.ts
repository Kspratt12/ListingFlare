import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Regression guard for marketing claims that were removed because the product does not do them (or they were unsourced).
const SRC = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

const PUBLIC_FILES = [
  "app/HomeClient.tsx",
  "app/pricing/page.tsx",
  "app/real-estate-lead-capture-software/page.tsx",
  "app/real-estate-ai-chatbot/page.tsx",
  "app/single-property-website-builder/page.tsx",
  "components/PipelineAnimation.tsx",
  "components/LiveLeadForm.tsx",
  "components/DemoLeadForm.tsx",
];

const REMOVED: Array<[string, RegExp]> = [
  ["automatic booking (showings are requests the agent confirms)", /books the showing|Showing on your calendar|showing booked, every follow-up/i],
  ["two-way / synced Google Calendar", /2-way sync|synced to your Google Calendar/i],
  ["auto-updating pipeline on showings or closed deals", /Auto-updates when a showing is booked or a deal closes/i],
  ["unsupported chatbot advice guarantee", /does not negotiate or give legal/i],
  ["unsourced 47-minute industry benchmark", /47-minute|47 minutes|industryAvg/i],
  ["unsupported publishing-time promise", /publishing takes a few minutes/i],
  ["24-hour contact promise", /in touch within 24 hours|will be in touch shortly/i],
  ["threaded inbox for buyer replies", /Replies come back into a threaded inbox/i],
];

test("removed marketing claims do not come back on public pages or components", () => {
  const found: string[] = [];
  for (const f of PUBLIC_FILES) {
    const text = read(f);
    for (const [name, rx] of REMOVED) if (rx.test(text)) found.push(`${f} [${name}]`);
  }
  assert.deepEqual(found, []);
});

test("the dashboard speed route and component keep the customer's own measurement but no industry benchmark", () => {
  const route = read("app/api/dashboard/speed/route.ts");
  assert.match(route, /avgSeconds/);
  assert.doesNotMatch(route, /INDUSTRY_AVG|industryAvg/);
  assert.doesNotMatch(read("components/SpeedToLead.tsx"), /industryAvg/);
});

test("the homepage has no competitor feature comparison (competitor claims could not be verified from first-party sources)", () => {
  const home = read("app/HomeClient.tsx");
  assert.doesNotMatch(home, /Feature Comparison|How we stack up|kvCORE|ComparisonCell/);
});

test("the leads page and API expose an implemented agent reply action (so the conversation-thread wording is accurate)", () => {
  assert.match(read("components/LeadMessageThread.tsx"), /\/api\/messages\/send/);
  assert.match(read("app/api/messages/send/route.ts"), /export async function POST/);
});

test("P7 wording does not promise a time", () => {
  const p = read("app/single-property-website-builder/page.tsx");
  assert.match(p, /you create a listing with its details and photos/);
  assert.doesNotMatch(p, /takes a few minutes|short form/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
