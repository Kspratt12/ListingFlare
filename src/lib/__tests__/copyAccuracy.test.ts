import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// MARKETING ACCURACY GUARD. In Production the discretionary buyer sends are paused (NURTURE_SENDS_ENABLED unset: day 1/3/7 follow-ups,
// past-lead notifications, post-showing feedback requests, testimonial requests) and buyer replies are not routed into the inbox
// (INBOUND_REPLY_ROUTING unset). Public copy must not promise those as active. Supported and NOT checked here: the instant AI reply to a
// new lead (with optional Approval Mode), showing confirmations and reminder emails, the weekly report, lead notifications.
// This is a text guard on source files. It does not know what is enabled in Production; if one of these behaviours is enabled and
// approved later, update the guard together with the copy.

const SRC = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

// Phrases that promise a gated behaviour. Competitor descriptions and generic advice are not matched by these.
const FORBIDDEN: Array<[string, RegExp]> = [
  ["day 1, 3 and 7 sequence", /days? 1, 3,? (and|&) 7|1\/3\/7|1, 3, and 7/i],
  ["follow-up sequence", /follow-?up sequence/i],
  ["automated/automatic/auto follow-up", /(automated|automatic|automatically|auto) follow-?ups?/i],
  ["AI follow-up", /AI follow-?ups?/i],
  ["re-engage / past-lead notification", /re-?engage past leads|past leads/i],
  ["auto-feedback / feedback requests", /auto-?feedback|feedback requests?/i],
  ["testimonial requests", /testimonial requests?/i],
  ["drip", /\bdrip\b/i],
  ["two-way inbox", /two-way (threaded )?(conversation )?inbox/i],
  ["exact reminder timing", /24hr \+ 1hr|24-hour (showing )?reminders?/i],
];

const PAGES = [
  "app/HomeClient.tsx",
  "app/about/page.tsx",
  "app/layout.tsx",
  "app/login/page.tsx",
  "app/signup/page.tsx",
  "app/pricing/page.tsx",
  "app/real-estate-ai-chatbot/page.tsx",
  "app/real-estate-lead-capture-software/page.tsx",
  "app/listingflare-vs-rela/page.tsx",
  "app/listingflare-vs-singlepropertysites/page.tsx",
  "app/dashboard/presentation/[listingId]/page.tsx",
];

test("public pages and the seller presentation do not promise paused or non-flowing behaviours", () => {
  const found: string[] = [];
  for (const f of PAGES) {
    read(f).split("\n").forEach((line, i) => {
      if (/^\s*(\/\/|\{\/\*)/.test(line)) return; // code comments are not customer-facing copy
      for (const [name, re] of FORBIDDEN) if (re.test(line)) found.push(`${f}:${i + 1} [${name}] ${line.trim().slice(0, 110)}`);
    });
  }
  assert.deepEqual(found, []);
});

test("blog articles do not attribute the paused behaviours to ListingFlare (sentence level; competitor and generic advice sentences are ignored)", () => {
  const dir = path.join(SRC, "content/articles");
  const found: string[] = [];
  for (const f of fs.readdirSync(dir)) {
    const text = read(`content/articles/${f}`);
    // sentences and list items; only those that name ListingFlare are checked
    for (const s of text.split(/(?<=[.!?])\s+|<\/?(?:p|li)[^>]*>|\n/)) {
      if (!/listingflare/i.test(s)) continue;
      // "drip" is also used for other tools' email drip campaigns in generic advice, so it is checked on the pages only
      for (const [name, re] of FORBIDDEN) if (name !== "drip" && re.test(s)) found.push(`${f} [${name}] ${s.trim().slice(0, 120)}`);
    }
  }
  assert.deepEqual(found, []);
});

test("supported claims were NOT removed: the instant reply, approval mode, showing reminders and the weekly report are still advertised", () => {
  const pricing = read("app/pricing/page.tsx");
  for (const must of ["Instant AI auto-reply to every new lead", "AI Approval Mode (review before sending)", "Showing reminder emails to buyers", "Weekly performance email"]) {
    assert.ok(pricing.includes(must), "pricing still says: " + must);
  }
  assert.ok(read("app/HomeClient.tsx").includes("AI auto-reply to every new lead"));
  assert.ok(read("app/real-estate-lead-capture-software/page.tsx").includes("Instant auto-reply to each new lead, with an optional approval step"));
});

assertNoNetworkAttempts();
