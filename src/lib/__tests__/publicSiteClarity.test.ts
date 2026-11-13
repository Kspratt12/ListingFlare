import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MIN_LISTINGS_TO_INDEX } from "../cities";

const SRC = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

test("homepage states the product category and does not claim every visitor is captured or that the AI schedules", () => {
  const home = read("app/HomeClient.tsx");
  assert.match(home, /Single-property websites\s*<br \/>\s*with a listing-specific AI assistant/);
  assert.match(home, /A branded page for each listing where buyers can explore the property, ask questions, and request a showing/);
  assert.doesNotMatch(home, /You lost them|every visitor who scans|starts a conversation and captures/i);
  assert.match(home, /choose to share their contact details/);
  assert.match(home, /separate scheduling workflow/);
  assert.doesNotMatch(home, /Bedrooms, backyard, neighborhood|passes the showing request to you/);
});

test("auto-reply copy matches the code: sent by email for a lead with an email address unless Approval Mode holds it", () => {
  const home = read("app/HomeClient.tsx");
  assert.match(home, /generates an AI reply for a new lead with an email address and sends it by email unless Approval Mode is enabled/);
  assert.match(home, /With Approval Mode, the reply is held for your review/);
  const route = read("app/api/leads/auto-reply/route.ts");
  assert.match(route, /internal && resendKey && lead\.email && !approvalMode/);
  // no unconditional "instant" reply promise in the visible homepage FAQ answers or the pricing feature list
  const faqBlock = home.slice(home.indexOf("const faqs = ["), home.indexOf("mainEntity: faqs.map"));
  assert.doesNotMatch(faqBlock, /instant AI reply|instant first reply|follow-up response instantly/i);
  const pricing = read("app/pricing/page.tsx");
  assert.match(pricing, /"AI email replies to new leads, with optional approval before sending"/);
  assert.doesNotMatch(pricing, /"Instant AI auto-reply to every new lead"/);
});

test("the visible FAQ and its structured data come from the same list", () => {
  const home = read("app/HomeClient.tsx");
  assert.match(home, /mainEntity: faqs\.map/);
  assert.match(home, /faqs\.map\(\(faq, i\)/);
});

test("open-house sign-in copy refers to submitted sign-ins, and the sign-in page creates a lead on submit", () => {
  assert.match(read("app/pricing/page.tsx"), /turns each submitted sign-in into a lead/);
  assert.match(read("content/articles/open-house-checklist.ts"), /turns each submitted sign-in into a lead/);
  for (const f of ["app/pricing/page.tsx", "content/articles/open-house-checklist.ts"]) {
    assert.doesNotMatch(read(f), /turns each visitor into a lead/);
  }
  assert.match(read("app/open-house/[id]/page.tsx"), /\/api\/leads\/create/);
});

test("city-page wording describes eligibility, and matches the code rule", () => {
  const builder = read("app/single-property-website-builder/page.tsx");
  assert.match(builder, /becomes eligible for search indexing and is added to the sitemap once it contains at least three qualifying published listings/);
  assert.match(builder, /Eligibility does not guarantee that Google will index the page/);
  assert.doesNotMatch(builder, /so thin pages stay out of Google/);
  assert.match(read("app/pricing/page.tsx"), /Public city pages, eligible for search indexing once qualifying inventory requirements are met/);
  // the rule the copy describes
  assert.equal(MIN_LISTINGS_TO_INDEX, 3);
  const city = read("app/homes/[city]/page.tsx");
  assert.match(city, /index: listings\.length >= MIN_LISTINGS_TO_INDEX/);
  assert.match(city, /\.eq\("status", "published"\)/);
  assert.match(city, /!isAgentInactive\(/);
  assert.match(city, /!isDemoAgentId\(/);
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /\.eq\("status", "published"\)/);
  assert.match(sitemap, /< MIN_LISTINGS_TO_INDEX\) return/);
  assert.match(sitemap, /isDemoAgentId\(/);
});

test("demo note: no inquiry is sent in the demo, and a showing request creates a lead on live listings", () => {
  const demo = read("app/demo/page.tsx");
  assert.match(demo, /This is a demonstration: no inquiry is sent to an agent\./);
  assert.match(demo, /submitting an inquiry or showing request creates a lead in the agent&apos;s dashboard/);
  assert.match(demo, /Email notifications and AI replies follow the account&apos;s settings, including Approval Mode/);
  assert.doesNotMatch(demo, /phone notification/i);
  const book = read("app/api/showings/book/route.ts");
  assert.match(book, /async insertLead\(row\)/);
  assert.match(book, /async insertShowing\(row\)/);
});

test("template links: sign-in sheet points to the lead-capture page; marketing plan makes the narrower claim", () => {
  const sheet = read("content/articles/open-house-sign-in-sheet-template.ts");
  assert.match(sheet, /<a href="\/real-estate-lead-capture-software">how the QR sign-in and lead inbox work<\/a>/);
  assert.ok(fs.existsSync(path.join(SRC, "app/real-estate-lead-capture-software/page.tsx")));
  const plan = read("content/articles/listing-marketing-plan-template.ts");
  assert.match(plan, /so several pieces of the plan are ready to use/);
  assert.doesNotMatch(plan, /most of the plan is already built/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
