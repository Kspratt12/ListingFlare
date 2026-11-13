import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// CONTEXT-AWARE COPY GUARD for blog articles. Production does not run the day 1/3/7 follow-up sequence, visitor
// re-engagement emails, post-showing feedback requests or testimonial requests, and does not route buyer replies into an
// inbox. The older guard only checks sentences that NAME ListingFlare, so it missed feature promises written as "It also
// schedules..." or as a bullet or table cell under a ListingFlare section. This guard attributes a block to ListingFlare when:
//   * the block names ListingFlare, or
//   * it sits under an h2/h3 whose title names ListingFlare, or
//   * it is a table cell in the column whose header names ListingFlare.
// It does NOT flag: blocks that say the work is manual ("yours to send", "by hand", "manual"), blocks about another vendor
// (named, without ListingFlare), or generic advice outside ListingFlare sections.

export const PROMISES: Array<[string, RegExp]> = [
  ["day 1, 3 and 7 sequence", /days? 1, 3,? (and|&) 7|day 1, day 3 (and|&) day 7|1\/3\/7/i],
  ["follow-up sequence", /follow-?up (email )?sequence/i],
  ["automatic follow-up", /(automated|automatic|automatically|auto) follow-?ups?/i],
  ["follow-up started automatically", /(start|send|trigger|schedule)s?\s+(the\s+|a\s+)?follow-?ups?\s+(email\s+)?(automatically|on (its|their) own)/i],
  ["re-engagement", /re-?engage/i],
  ["feedback / testimonial requests", /feedback requests?|testimonial requests?|asks? (them |buyers )?for feedback automatically/i],
  ["past-lead notification", /past leads/i],
  ["drip", /\bdrip\b/i],
  ["two-way inbox", /two-way (threaded )?(conversation )?inbox/i],
];
const MANUAL = /\b(yours to send|by hand|manual(ly)?|you (can )?send|you send|you still|send (these|them) yourself|if you would rather not)\b/i;
const OTHER_VENDORS = /\b(RealBird|Keap|Real Geeks|Mojo|kvCORE|BoomTown|Rela|CribFlyer|SinglePropertySites|Spiro|HDphotohub|Placester|Follow Up Boss|FUB|Lofty|Ylopo|Zillow|Realtor\.com|Calendly|ShowingTime|Mailchimp|Listings to Leads|PropertySimple|Aragon|Descript|ManyChat|Trainual|Surfer|ElevenLabs|Restream)\b/i;

const strip = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&rsquo;|&lsquo;/g, "'").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

export function findImpliedPromises(html: string): string[] {
  const found: string[] = [];
  let inLfSection = false;
  let lfCol = -1;
  const re = /<h[23][^>]*>([\s\S]*?)<\/h[23]>|<(p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\2>|<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) { inLfSection = /listingflare/i.test(strip(m[1])); lfCol = -1; continue; }
    if (m[4] !== undefined) {
      const cells = Array.from(m[4].matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/g)).map((c) => ({ tag: c[1], text: strip(c[2]) }));
      if (cells.some((c) => c.tag === "th")) { lfCol = cells.findIndex((c) => /listingflare/i.test(c.text)); continue; }
      if (lfCol >= 0 && cells[lfCol]) {
        const cell = cells[lfCol].text;
        for (const [name, rx] of PROMISES) if (rx.test(cell) && !MANUAL.test(cell)) found.push(`[${name}] (table, ListingFlare column) ${cell.slice(0, 100)}`);
      }
      continue;
    }
    const text = strip(m[3]);
    const names = /listingflare/i.test(text);
    if (!names && !inLfSection) continue;
    if (!names && OTHER_VENDORS.test(text)) continue;
    if (MANUAL.test(text)) continue;
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      for (const [name, rx] of PROMISES) {
        const mm = rx.exec(sentence);
        if (!mm) continue;
        // Who owns the promise? The nearest vendor named BEFORE the match in the sentence; with none, the section owner.
        const before = sentence.slice(0, mm.index);
        const lf = before.toLowerCase().lastIndexOf("listingflare");
        let other = -1;
        const ov = new RegExp(OTHER_VENDORS.source, "gi");
        let v: RegExpExecArray | null;
        while ((v = ov.exec(before))) other = v.index;
        if (other > lf) continue; // a competitor owns it
        if (lf < 0 && !inLfSection) continue;
        found.push(`[${name}] ${sentence.slice(0, 220)}`);
      }
    }
  }
  return found;
}

// ---- regression fixtures: the misses fixed in PR #64 and the new finding (all must be caught)
test("regression: promises written without naming ListingFlare are caught under a ListingFlare section", () => {
  const cases = [
    `<h2>Automating the Sequence With ListingFlare</h2><p>It also schedules a day 1, day 3 and day 7 follow-up email sequence, with a separate sequence for people who have been to a showing.</p>`,
    `<h2>How the open house flow works</h2><p>When someone signs in, ListingFlare does this:</p><ul><li>Emails you a notification</li></ul><h3>With ListingFlare</h3><ul><li>Schedules a follow-up email sequence for day 1, day 3 and day 7</li></ul>`,
    `<h2>1. ListingFlare</h2><p>You also get automatic follow-up emails, so if a buyer visits your page but does not fill out a form, the system re-engages them.</p>`,
    `<h2>ListingFlare</h2><p>It sends automatic follow-up emails on your behalf.</p>`,
    `<table><tr><th>Feature</th><th>ListingFlare</th><th>Rela</th></tr><tr><td>Automated Follow-Up</td><td>Yes, automatic follow-up emails</td><td>No</td></tr></table>`,
    `<p>ListingFlare&rsquo;s QR sign-in creates the lead, notifies you and starts the follow-up automatically.</p>`,
    `<p>ListingFlare asks buyers for feedback requests after each showing.</p>`,
  ];
  for (let i = 0; i < cases.length; i++) assert.ok(findImpliedPromises(cases[i]).length > 0, `case ${i} should be flagged`);
});

test("not flagged: manual follow-up advice, generic advice, other vendors, and accurate ListingFlare behaviour", () => {
  const ok = [
    `<h2>Automating the Sequence With ListingFlare</h2><p>The later follow-ups (day 1, day 3, day 7) are yours to send; the templates above are written for that.</p>`,
    `<h2>The Sequence at a Glance</h2><table><tr><th>When</th><th>What</th></tr><tr><td>Day 3</td><td>Add value with automatic follow-up emails</td></tr></table>`,
    `<p>A common pattern is follow-ups around day 1, day 3 and day 7.</p>`,
    `<h2>Follow Up Boss</h2><p>Follow Up Boss sends automatic follow-up emails and action plans.</p>`,
    `<h2>1. Rela vs ListingFlare</h2><p>Rela offers automatic follow-up emails on its higher plan.</p>`,
    `<table><tr><th>Feature</th><th>ListingFlare</th><th>Rela</th></tr><tr><td>Automated Follow-Up</td><td>Instant AI reply to each new lead; later follow-ups are manual</td><td>Yes, automatic follow-up emails</td></tr></table>`,
    `<p>ListingFlare sends an instant AI reply to a new lead, with approval mode if you want to review it first.</p>`,
    `<p>Many tools can schedule drip campaigns; check consent rules before you send any.</p>`,
  ];
  for (let i = 0; i < ok.length; i++) assert.deepEqual(findImpliedPromises(ok[i]), [], `case ${i} should not be flagged`);
});

test("blog articles contain no implied ListingFlare feature promises for behaviours that are not active in Production", () => {
  const dir = path.join(process.env.LF_SRC_DIR as string, "content/articles");
  const found: string[] = [];
  for (const f of fs.readdirSync(dir)) {
    const hits = findImpliedPromises(fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n"));
    for (const h of hits) found.push(`${f} ${h}`);
  }
  assert.deepEqual(found, []);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
