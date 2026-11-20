// Flyer customization, seller report accuracy, and custom-domain validation. Fictional data only.
import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_FLYER_OPTIONS,
  FLYER_LIMITS,
  formatEventLabel,
  qrDestination,
  sanitizeFlyerOptions,
  timeRangeProblem,
} from "../flyerOptions";
import { buildSellerReport } from "../sellerReport";
import { downloadBox, TEMPLATES } from "../../content/templates";
import { checkCustomDomain, customDomainsConfigured, normalizeDomainInput, stateFromProvider } from "../customDomain";

const src = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(src, rel), "utf8").replace(/\r\n/g, "\n");

// ---------- flyer ----------

test("flyer options: unknown or unsafe values fall back to safe defaults", () => {
  assert.deepEqual(sanitizeFlyerOptions(null), DEFAULT_FLYER_OPTIONS);
  const o = sanitizeFlyerOptions({
    layout: "<script>",
    accent: "red; background:url(x)",
    headline: "x".repeat(200),
    eventDate: "2026-02-30",
    startTime: "25:00",
    qrTarget: "https://evil.example",
    showFeatures: "yes",
  });
  assert.equal(o.layout, "classic");
  assert.equal(o.accent, null);
  assert.equal(o.headline.length, FLYER_LIMITS.headline);
  assert.equal(o.eventDate, "", "impossible date rejected");
  assert.equal(o.startTime, "");
  assert.equal(o.qrTarget, "listing");
  assert.equal(o.showFeatures, true);
  const good = sanitizeFlyerOptions({ layout: "modern", accent: "#1e3a8a", eventDate: "2026-11-21", startTime: "13:00", endTime: "16:00", qrTarget: "signin", showAgentPhoto: false });
  assert.equal(good.layout, "modern");
  assert.equal(good.accent, "#1e3a8a");
  assert.equal(good.qrTarget, "signin");
  assert.equal(good.showAgentPhoto, false);
  assert.equal(sanitizeFlyerOptions({ headline: "" }).headline, "", "an agent can remove the headline");
});

test("flyer date/time label is written as entered, in property-local time", () => {
  assert.equal(formatEventLabel({ eventDate: "2026-11-21", startTime: "13:00", endTime: "16:00" }), "Saturday, November 21 · 1 – 4 PM");
  assert.equal(formatEventLabel({ eventDate: "2026-11-21", startTime: "11:30", endTime: "14:00" }), "Saturday, November 21 · 11:30 AM – 2 PM");
  assert.equal(formatEventLabel({ eventDate: "", startTime: "10:00", endTime: "" }), "from 10 AM");
  assert.equal(formatEventLabel({ eventDate: "", startTime: "", endTime: "" }), null);
  assert.ok(timeRangeProblem({ startTime: "16:00", endTime: "13:00" }));
  assert.equal(timeRangeProblem({ startTime: "13:00", endTime: "16:00" }), null);
});

test("flyer QR destinations are exact, and a scan is never described as a lead", () => {
  const l = { id: "00000000-0000-4000-8000-000000000001", slug: "1-fictional-way" };
  assert.equal(qrDestination("https://www.listingflare.com/", l, "listing"), "https://www.listingflare.com/listing/1-fictional-way?src=flyer");
  assert.equal(qrDestination("https://www.listingflare.com", { id: l.id, slug: "" }, "listing"), `https://www.listingflare.com/listing/${l.id}?src=flyer`);
  assert.equal(qrDestination("https://www.listingflare.com", l, "signin"), `https://www.listingflare.com/open-house/${l.id}`);
  const modal = read("components/FlyerModal.tsx");
  assert.match(modal, /Nobody is identified or added as a lead unless they submit a form/);
  const route = read("app/api/listings/[id]/flyer/route.ts");
  assert.match(route, /qrDestination\(appUrl, listing, "listing"\)/);
  assert.match(route, /qrDestination\(appUrl, listing, "signin"\)/);
  assert.match(route, /\.eq\("agent_id", user\.id\)/, "only the signed-in agent's own listing");
});

test("source: the flyer never prints zero or blank facts and has no video claims", () => {
  const flyer = read("components/OpenHouseFlyer.tsx");
  assert.match(flyer, /visibleFacts\(/);
  assert.ok(!/video/i.test(flyer));
  assert.ok(!/dangerouslySetInnerHTML/.test(flyer));
});

test("flyer gallery: three designs, each with a labelled sample preview and its own three downloads; other templates unchanged", () => {
  const box = downloadBox("open-house-flyer-template");
  const pub = path.join(src, "..", "public");
  const flyer = TEMPLATES.find((x) => x.id === "open-house-flyer-template")!;
  assert.deepEqual(flyer.designs!.map((d) => d.name), ["Classic", "Modern", "Minimal"]);
  for (const d of flyer.designs!) {
    assert.deepEqual(d.files.map((f) => f.label), ["PDF", "Fillable PDF", "Word"], d.name);
    for (const f of d.files) {
      assert.ok(box.includes('href="' + f.href + '" download'), f.href);
      assert.ok(fs.existsSync(path.join(pub, f.href)), f.href + " exists");
    }
    const pdf = d.files[0].href.replace(/\./g, "\\.");
    assert.match(box, new RegExp('<a href="' + pdf + '"[^>]*><img src="' + d.preview.src.replace(/\./g, "\\.") + '"[^>]*width="826" height="1069" loading="lazy"'));
    assert.ok(fs.statSync(path.join(pub, d.preview.src)).size < 200 * 1024, "preview stays light");
    assert.ok(d.preview.alt.length > 60, "descriptive alt");
  }
  assert.equal(box.match(/>Sample preview</g)!.length, 3);
  assert.match(box, /fictional sample text and illustrations/);
  assert.match(box, /downloads are blank/);
  assert.match(box, /US Letter 8\.5 &times; 11 in/);
  assert.match(box, /<a href="\/signup"[^>]*>Customize a flyer online/);
  assert.match(box, /needs a ListingFlare account; the 14-day free trial needs no credit card/);
  assert.ok(!fs.existsSync(path.join(pub, "templates", "open-house-flyer-template-preview.jpg")), "old single preview removed");
  for (const t of TEMPLATES.filter((x) => x.id !== "open-house-flyer-template")) assert.ok(!/<img/.test(downloadBox(t.id)), t.id);
});

// ---------- seller report ----------

const NOW = new Date("2026-11-19T12:00:00Z");
const baseInput = {
  now: NOW,
  listing: { created_at: "2026-10-01T00:00:00Z", published_at: "2026-10-02T00:00:00Z", status: "published", view_count: 120 },
  leadCreatedAt: ["2026-11-18T00:00:00Z", "2026-11-13T00:00:00Z", "2026-10-21T00:00:00Z"],
  showings: [
    { status: "requested", created_at: "2026-11-17T00:00:00Z" },
    { status: "confirmed", created_at: "2026-11-15T00:00:00Z" },
    { status: "declined", created_at: "2026-11-16T00:00:00Z" },
    { status: "canceled", created_at: "2026-11-16T00:00:00Z" },
    { status: "completed", created_at: "2026-10-25T00:00:00Z" },
  ],
  automation: { aiChatOn: true, calendarConnected: false, followUpEmailsOn: false, approvalMode: false },
};
const metric = (r: ReturnType<typeof buildSellerReport>, key: string) => r.metrics.find((m) => m.key === key)!.value;

test("seller report: every count has a stated period; declined and canceled showings are excluded", () => {
  const r = buildSellerReport(baseInput);
  assert.equal(r.period.days, 7);
  assert.equal(r.period.label, "Nov 12, 2026 – Nov 19, 2026");
  assert.equal(metric(r, "inquiries_period"), 2);
  assert.equal(metric(r, "inquiries_total"), 3);
  assert.equal(metric(r, "showings_requested_period"), 2, "requested + confirmed, not declined/canceled");
  assert.equal(metric(r, "showings_confirmed_total"), 2, "confirmed + completed");
  assert.equal(metric(r, "views_total"), 120);
  for (const m of r.metrics) assert.ok(m.definition.length > 20, `${m.key} has a definition`);
  assert.ok(!r.metrics.some((m) => /week/i.test(m.label) && m.key.startsWith("views")), "no per-week views figure is invented");
  const thirty = buildSellerReport({ ...baseInput, periodDays: 30 });
  assert.equal(metric(thirty, "inquiries_period"), 3);
});

test("seller report: truthful zero and not-live states", () => {
  const zero = buildSellerReport({ ...baseInput, listing: { ...baseInput.listing, view_count: 0 }, leadCreatedAt: [], showings: [] });
  assert.match(zero.summary, /No views or inquiries have been recorded yet/);
  assert.ok(zero.metrics.every((m) => m.value === 0));
  const draft = buildSellerReport({ ...baseInput, listing: { ...baseInput.listing, status: "draft" } });
  assert.match(draft.summary, /not public yet/);
});

test("seller report: only automations that are actually on are listed; no buyer identities", () => {
  const r = buildSellerReport(baseInput);
  assert.ok(!r.running.some((x) => /calendar/i.test(x)), "calendar not connected");
  assert.ok(!r.running.some((x) => /follow-up/i.test(x)), "nurture paused");
  const on = buildSellerReport({ ...baseInput, automation: { aiChatOn: false, calendarConnected: true, followUpEmailsOn: true, approvalMode: false } });
  assert.ok(on.running.some((x) => /Google Calendar/.test(x)));
  assert.ok(on.running.some((x) => /follow-up emails/.test(x)));
  assert.ok(!on.running.some((x) => /AI assistant/.test(x)));
  assert.ok(r.notes.some((n) => /names, contact details and conversations are not included/.test(n)));
  const route = read("app/api/reports/seller/route.ts");
  assert.match(route, /from\("leads"\)\.select\("created_at"\)/, "leads: timestamps only");
  assert.ok(!/google_refresh_token: agent/.test(route) && !/\.\.\.agent/.test(route), "calendar token never returned");
  const page = read("app/reports/[listingId]/page.tsx");
  for (const banned of [/qualified inquiries/i, /Every buyer who looked/i, /day 1, 3, and 7/i, /avgViewsPerWeek/, /This week/]) {
    assert.ok(!banned.test(page), `report page no longer says ${banned}`);
  }
});

// ---------- custom domains ----------

test("custom domains: off unless the flag and provider credentials are all set; honest validation", () => {
  assert.equal(customDomainsConfigured({}), false);
  assert.equal(customDomainsConfigured({ CUSTOM_DOMAINS_ENABLED: "1" }), false, "flag without credentials stays off");
  assert.equal(customDomainsConfigured({ CUSTOM_DOMAINS_ENABLED: "true", VERCEL_API_TOKEN: "t", VERCEL_PROJECT_ID: "p" }), false, "only exactly 1 enables");
  assert.equal(customDomainsConfigured({ CUSTOM_DOMAINS_ENABLED: "1", VERCEL_API_TOKEN: "t", VERCEL_PROJECT_ID: "p" }), true);
  assert.equal(normalizeDomainInput("  HTTPS://Homes.JaneSmith.com:443/path?q=1 "), "homes.janesmith.com");
  assert.deepEqual(checkCustomDomain("homes.janesmith.com"), { ok: true, domain: "homes.janesmith.com", kind: "subdomain" });
  assert.deepEqual(checkCustomDomain("janesmith.com"), { ok: true, domain: "janesmith.com", kind: "apex" });
  assert.deepEqual(checkCustomDomain("janesmith.co.uk"), { ok: true, domain: "janesmith.co.uk", kind: "apex" });
  for (const bad of ["", "localhost", "192.168.1.1", "jane..com", "-jane.com", "jane.c", "jane.listingflare.com", "listingflare.com", "x.vercel.app", "home.test", "jäne.com", "co.uk"]) {
    assert.equal(checkCustomDomain(bad).ok, false, bad);
  }
});

test("custom domains: connected only when the provider reports verified AND configured", () => {
  assert.equal(stateFromProvider({ verified: false, misconfigured: false, verification: [], routing: [] }), "verifying");
  assert.equal(stateFromProvider({ verified: true, misconfigured: true, verification: [], routing: [] }), "configuration_needed");
  assert.equal(stateFromProvider({ verified: true, misconfigured: false, verification: [], routing: [] }), "connected");
  const card = read("components/CustomDomainCard.tsx");
  assert.match(card, /isn&apos;t available yet/, "still says so when the server reports it unavailable");
  assert.match(card, /You keep the domain at your registrar/);
  assert.ok(!/one[- ]click|instant/i.test(card));
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
