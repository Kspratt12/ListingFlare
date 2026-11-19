// Scheduled seller reports, interactive floor plans, and custom domains. Fictional data only; the
// database, email provider and hosting provider are fakes passed in. _isolation blocks the network.
import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  advanceSchedule,
  checkEligibility,
  nextRunAfter,
  renderReportEmail,
  runScheduledReport,
  sellerReportsEnabled,
  validateScheduleInput,
  type RunDeps,
  type ScheduleRow,
  type SendContext,
  type ReportEmail,
} from "../sellerReportSchedule";
import { buildSellerReport } from "../sellerReport";
import {
  checkDimensions,
  floorPlanFileProblem,
  nudge,
  resolveMarkerPhoto,
  sanitizeFloorPlan,
  sniffImageType,
  toNormalized,
} from "../floorPlan";
import { isPlatformHost, routeCustomHostPath, siteAgentFor, type ProviderDomainStatus } from "../customDomain";
import { connectDomain, recheckDomain, removeDomain, type DomainRow, type DomainStore } from "../customDomainService";
import { DomainProviderError, createVercelProvider, type DomainProvider } from "../domainProvider";
import { createHarness, type Component } from "./_componentHarness";

const src = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(src, rel), "utf8").replace(/\r\n/g, "\n");
const AGENT = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000b2";

// ===================== scheduled seller reports =====================

const weekly = { cadence: "weekly" as const, send_weekday: 1, send_hour: 9, timezone: "America/New_York" };

test("schedule: next run is the chosen weekday and local hour, in the chosen time zone (EST and EDT)", () => {
  // Thu 2026-11-19 12:00Z -> Mon 2026-11-23 09:00 EST = 14:00Z
  assert.equal(nextRunAfter(new Date("2026-11-19T12:00:00Z"), weekly).toISOString(), "2026-11-23T14:00:00.000Z");
  // Mon 2026-03-02 15:00Z (after 9am that day) -> Mon 2026-03-09 09:00 EDT (DST started Mar 8) = 13:00Z
  assert.equal(nextRunAfter(new Date("2026-03-02T15:00:00Z"), weekly).toISOString(), "2026-03-09T13:00:00.000Z");
  // same day, before the hour -> today
  assert.equal(nextRunAfter(new Date("2026-11-23T13:00:00Z"), weekly).toISOString(), "2026-11-23T14:00:00.000Z");
  // Pacific
  assert.equal(nextRunAfter(new Date("2026-11-19T12:00:00Z"), { ...weekly, timezone: "America/Los_Angeles" }).toISOString(), "2026-11-23T17:00:00.000Z");
  // monthly: 1st of next month 09:00 EST
  assert.equal(nextRunAfter(new Date("2026-11-19T12:00:00Z"), { ...weekly, cadence: "monthly" }).toISOString(), "2026-12-01T14:00:00.000Z");
  // biweekly skips a week after a send
  assert.equal(advanceSchedule(new Date("2026-11-23T14:00:00Z"), { ...weekly, cadence: "biweekly" }).toISOString(), "2026-12-07T14:00:00.000Z");
  assert.equal(advanceSchedule(new Date("2026-11-23T14:00:00Z"), weekly).toISOString(), "2026-11-30T14:00:00.000Z");
});

test("schedule input validation and time-zone fallback", () => {
  const ok = validateScheduleInput({ cadence: "weekly", send_weekday: 2, send_hour: 8 }, null);
  assert.ok(ok.ok && ok.value.timezone === "America/New_York", "fallback zone when the account has none");
  const agentTz = validateScheduleInput({ cadence: "weekly", send_weekday: 2, send_hour: 8 }, "America/Chicago");
  assert.ok(agentTz.ok && agentTz.value.timezone === "America/Chicago");
  for (const bad of [{ cadence: "daily", send_weekday: 1, send_hour: 9 }, { cadence: "weekly", send_weekday: 7, send_hour: 9 }, { cadence: "weekly", send_weekday: 1, send_hour: 24 }, { cadence: "weekly", send_weekday: 1, send_hour: 9, timezone: "Mars/Base" }]) {
    assert.equal(validateScheduleInput(bad, null).ok, false, JSON.stringify(bad));
  }
  assert.equal(sellerReportsEnabled({}), false);
  assert.equal(sellerReportsEnabled({ SELLER_REPORTS_ENABLED: "true" }), false);
  assert.equal(sellerReportsEnabled({ SELLER_REPORTS_ENABLED: "1" }), true);
});

const ctx = (over: Partial<SendContext> = {}): SendContext => ({
  listing: { id: "L1", status: "published", street: "1 Fictional Way", city: "Exampleville", state: "NC", view_count: 40, created_at: "2026-10-01T00:00:00Z", published_at: "2026-10-02T00:00:00Z", ai_chat_enabled: true },
  agent: { id: AGENT, name: "Fiction Agent", email: "agent@example.invalid", phone: "5555550100", brokerage: "Example Realty", brand_color: "#123456", subscription_status: "active", trial_ends_at: "2030-01-01T00:00:00Z", google_refresh_token: null, ai_approval_mode: false },
  portal: { id: "P1", active: true, seller_name: "Sam Seller", seller_email: "seller@example.invalid", access_token: "tok_abc" },
  ...over,
});

test("eligibility: inactive listing, revoked portal, missing/invalid seller and inactive account all stop sending", () => {
  const s = { enabled: true, seller_portal_id: "P1" };
  assert.deepEqual(checkEligibility(s, ctx()), { ok: true });
  assert.equal((checkEligibility({ ...s, enabled: false }, ctx()) as { reason: string }).reason, "disabled");
  assert.equal((checkEligibility(s, ctx({ listing: { ...ctx().listing!, status: "draft" } })) as { reason: string }).reason, "listing_not_public");
  assert.equal((checkEligibility(s, ctx({ portal: { ...ctx().portal!, active: false } })) as { reason: string }).reason, "seller_removed");
  assert.equal((checkEligibility(s, ctx({ portal: { ...ctx().portal!, seller_email: "not-an-email" } })) as { reason: string }).reason, "invalid_recipient");
  assert.equal((checkEligibility({ ...s, seller_portal_id: null }, ctx()) as { reason: string }).reason, "no_seller");
  assert.equal((checkEligibility(s, ctx({ agent: { ...ctx().agent!, subscription_status: "trialing", trial_ends_at: "2020-01-01T00:00:00Z" } })) as { reason: string }).reason, "agent_inactive");
  assert.deepEqual(checkEligibility(s, ctx({ listing: { ...ctx().listing!, status: "closed" } })), { ok: true }, "a sold listing can still get its report");
});

// In-memory send log with the same unique (schedule, period_end) rule as migration 047.
function fakeRun(over: Partial<RunDeps> & { context?: SendContext; sendFails?: number } = {}) {
  const rows = new Map<string, { status: string; attempts: number; claimedAt: number; provider_message_id?: string | null; last_error?: string | null }>();
  const sent: ReportEmail[] = [];
  const scheduleUpdates: Array<Record<string, unknown>> = [];
  let failuresLeft = over.sendFails ?? 0;
  const deps: RunDeps = {
    now: new Date("2026-11-23T15:00:00Z"),
    appUrl: "https://www.listingflare.com",
    nurtureOn: false,
    loadContext: async () => over.context ?? ctx(),
    loadActivity: async () => ({
      leadCreatedAt: ["2026-11-20T00:00:00Z", "2026-11-23T14:30:00Z" /* after the period end */],
      showings: [{ status: "requested", created_at: "2026-11-21T00:00:00Z" }, { status: "declined", created_at: "2026-11-21T00:00:00Z" }],
    }),
    async claim(s, _ps, pe, at) {
      const key = `${s.id}|${pe.toISOString()}`;
      const r = rows.get(key);
      if (!r) {
        rows.set(key, { status: "sending", attempts: 1, claimedAt: at.getTime() });
        return 1;
      }
      const age = at.getTime() - r.claimedAt;
      const retryable = (r.status === "failed" && age >= 3600_000) || (r.status === "sending" && age >= 900_000);
      if (!retryable || r.attempts >= 3) return null;
      r.status = "sending";
      r.attempts += 1;
      r.claimedAt = at.getTime();
      return r.attempts;
    },
    async markSend(id, pe, patch) {
      Object.assign(rows.get(`${id}|${pe.toISOString()}`)!, patch);
    },
    async updateSchedule(_id, patch) {
      scheduleUpdates.push(patch);
    },
    async send(email) {
      if (failuresLeft > 0) {
        failuresLeft--;
        throw new Error("provider_500");
      }
      sent.push(email);
      return { id: `msg_${sent.length}` };
    },
    ...over,
  };
  return { deps, rows, sent, scheduleUpdates };
}

const schedule = (over: Partial<ScheduleRow> = {}): ScheduleRow => ({
  id: "S1", listing_id: "L1", agent_id: AGENT, seller_portal_id: "P1", enabled: true, include_portal_link: true,
  next_run_at: "2026-11-23T14:00:00.000Z", last_period_end: null, ...weekly, ...over,
});

test("run: a due report is sent once, with the period's numbers only, and the schedule advances", async () => {
  const f = fakeRun();
  assert.equal(await runScheduledReport(schedule(), f.deps), "accepted");
  assert.equal(f.sent.length, 1);
  const e = f.sent[0];
  assert.equal(e.to, "seller@example.invalid");
  assert.equal(e.replyTo, "agent@example.invalid");
  assert.match(e.subject, /1 Fictional Way/);
  assert.match(e.text, /Buyer inquiries, last 7 days: 1/, "the inquiry after the period end is not counted");
  assert.match(e.text, /Showing requests, last 7 days: 1/, "declined showing excluded");
  assert.match(e.html, /https:\/\/www\.listingflare\.com\/seller\/tok_abc/);
  assert.equal(f.rows.get("S1|2026-11-23T14:00:00.000Z")!.status, "accepted");
  assert.equal(f.scheduleUpdates.at(-1)!.next_run_at, "2026-11-30T14:00:00.000Z");
  // a second call for the same period (duplicate cron invocation) does not send again
  assert.equal(await runScheduledReport(schedule(), f.deps), "already_claimed");
  assert.equal(f.sent.length, 1);
});

test("run: two overlapping runs for the same period send exactly one email", async () => {
  const f = fakeRun();
  const results = await Promise.all([runScheduledReport(schedule(), f.deps), runScheduledReport(schedule(), f.deps)]);
  assert.deepEqual(results.sort(), ["accepted", "already_claimed"]);
  assert.equal(f.sent.length, 1);
});

test("run: a failed send is retried after the delay for the same period, then gives up after 3 attempts", async () => {
  const f = fakeRun({ sendFails: 5 });
  assert.equal(await runScheduledReport(schedule(), f.deps), "retry_scheduled");
  assert.equal(f.scheduleUpdates.at(-1)!.next_run_at, "2026-11-23T14:00:00.000Z", "still due for the same period");
  assert.equal(await runScheduledReport(schedule(), f.deps), "already_claimed", "no retry before the delay");
  f.deps.now = new Date("2026-11-23T16:01:00Z");
  assert.equal(await runScheduledReport(schedule(), f.deps), "retry_scheduled");
  f.deps.now = new Date("2026-11-23T17:02:00Z");
  assert.equal(await runScheduledReport(schedule(), f.deps), "failed");
  assert.equal(f.rows.get("S1|2026-11-23T14:00:00.000Z")!.attempts, 3);
  assert.equal(f.scheduleUpdates.at(-1)!.next_run_at, "2026-11-30T14:00:00.000Z", "moves on to the next period");
  assert.equal(f.sent.length, 0);
});

test("run: an ineligible schedule records one skip and moves on without sending; not-due and disabled do nothing", async () => {
  const f = fakeRun({ context: ctx({ portal: { ...ctx().portal!, active: false } }) });
  assert.equal(await runScheduledReport(schedule(), f.deps), "skipped:seller_removed");
  assert.equal(f.sent.length, 0);
  assert.equal(f.rows.get("S1|2026-11-23T14:00:00.000Z")!.status, "skipped");
  assert.equal(f.scheduleUpdates.at(-1)!.paused_reason, "seller_removed");
  const g = fakeRun();
  assert.equal(await runScheduledReport(schedule({ next_run_at: "2026-11-30T14:00:00.000Z" }), g.deps), "not_due");
  assert.equal(await runScheduledReport(schedule({ enabled: false }), g.deps), "skipped:disabled");
  assert.equal(g.sent.length + g.scheduleUpdates.length, 0);
});

test("email: escapes seller/agent text, omits the portal link when asked, never includes buyer identities", () => {
  const c = ctx({ portal: { ...ctx().portal!, seller_name: "<script>alert(1)</script>" }, agent: { ...ctx().agent!, name: "Agent <b>X</b>", brand_color: "red;background:url(x)" } });
  const report = buildSellerReport({ now: new Date("2026-11-23T14:00:00Z"), periodDays: 7, listing: { created_at: "2026-10-01T00:00:00Z", status: "published", view_count: 0 }, leadCreatedAt: [], showings: [], automation: { aiChatOn: true, calendarConnected: false, followUpEmailsOn: false, approvalMode: false } });
  const e = renderReportEmail({ report, context: c, tz: "America/New_York", periodStart: new Date("2026-11-16T14:00:00Z"), periodEnd: new Date("2026-11-23T14:00:00Z"), portalUrl: null });
  assert.ok(!/<script>/.test(e.html));
  assert.match(e.html, /&lt;script&gt;/);
  assert.ok(!/<b>X<\/b>/.test(e.html));
  assert.ok(!/url\(x\)/.test(e.html), "unsafe brand color is replaced");
  assert.ok(!/\/seller\//.test(e.html + e.text));
  assert.match(e.text, /No views or inquiries have been recorded yet/, "honest zero state");
  assert.match(e.html, /Nov 16, 2026 – Nov 23, 2026/);
  assert.ok(!/[<>"\r\n]/.test(e.fromName), "sender name cannot inject headers");
});

test("source: the cron entry point authenticates, is off by default, and is not scheduled in vercel.json", () => {
  const route = read("app/api/cron/seller-reports/route.ts");
  const auth = route.indexOf("isCronAuthorized(req)");
  const flag = route.indexOf("sellerReportsEnabled()");
  const dbRead = route.indexOf('.from("seller_report_schedules")');
  assert.ok(auth > 0 && auth < flag && flag < dbRead, "auth, then the flag, before any database read");
  assert.ok(!/seller-reports/.test(fs.readFileSync(path.join(src, "..", "vercel.json"), "utf8")), "activation is a separate step");
  const store = read("lib/sellerReportStore.ts");
  assert.match(store, /"Idempotency-Key": idempotencyKey/, "provider-level duplicate protection");
  assert.match(store, /\.eq\("attempts", r\.attempts\)/, "re-claims are conditional");
  assert.ok(!/console\.(log|error)\([^)]*(email|html|seller)/i.test(store + route), "no addresses or bodies in logs");
  const sql = fs.readFileSync(path.join(src, "..", "supabase-migration-047-seller-report-schedules.sql"), "utf8");
  assert.match(sql, /unique \(schedule_id, period_end\)/);
  assert.match(sql, /revoke all on public\.seller_report_schedules from anon, authenticated/);
});

// ===================== floor plans =====================

const plan = (over: Record<string, unknown> = {}) => ({
  image: { src: "https://cdn.example.invalid/plan.png", width: 1200, height: 800, alt: "Plan" },
  markers: [
    { id: "m-1", label: "Kitchen", x: 0.25, y: 0.5, photoSrc: "https://cdn.example.invalid/kitchen.jpg" },
    { id: "m-2", label: "  Primary   bedroom ", x: 1.4, y: -0.2, photoSrc: null },
  ],
  ...over,
});

test("floor plan: sanitizing keeps valid markers, clamps positions, drops unsafe or duplicate data", () => {
  const p = sanitizeFloorPlan(plan())!;
  assert.equal(p.markers.length, 2);
  assert.deepEqual([p.markers[1].x, p.markers[1].y, p.markers[1].label], [1, 0, "Primary bedroom"]);
  assert.equal(sanitizeFloorPlan(plan({ image: { src: "javascript:alert(1)", width: 10, height: 10 } })), null);
  assert.equal(sanitizeFloorPlan(plan({ image: { src: "http://cdn.example.invalid/p.png", width: 10, height: 10 } })), null, "https only");
  assert.equal(sanitizeFloorPlan(plan({ image: { src: "https://cdn.example.invalid/p.png", width: 0, height: 10 } })), null);
  const dup = sanitizeFloorPlan(plan({ markers: [{ id: "a", label: "A", x: 0.1, y: 0.1 }, { id: "a", label: "B", x: 0.2, y: 0.2 }, { id: "b", label: "", x: 0.3, y: 0.3 }, { id: "bad id!", label: "C", x: 0, y: 0 }] }))!;
  assert.deepEqual(dup.markers.map((m) => [m.id, m.label]), [["a", "A"], ["b", "Room"]]);
  const many = sanitizeFloorPlan(plan({ markers: Array.from({ length: 60 }, (_, i) => ({ id: `m${i}`, label: `R${i}`, x: 0.5, y: 0.5 })) }))!;
  assert.equal(many.markers.length, 40);
  assert.equal(sanitizeFloorPlan(null), null);
});

test("floor plan: links to removed photos are cleared on save, and show 'no longer available' on render", () => {
  const saved = sanitizeFloorPlan(plan(), ["https://cdn.example.invalid/other.jpg"])!;
  assert.equal(saved.markers[0].photoSrc, null, "photo no longer on the listing is unlinked");
  const p = sanitizeFloorPlan(plan())!;
  assert.equal(resolveMarkerPhoto(p.markers[0], [{ src: "https://cdn.example.invalid/kitchen.jpg" }])?.src, "https://cdn.example.invalid/kitchen.jpg");
  assert.equal(resolveMarkerPhoto(p.markers[0], []), null);
  assert.equal(resolveMarkerPhoto(p.markers[0], [{ src: "https://cdn.example.invalid/x.jpg" }, { src: "https://cdn.example.invalid/kitchen.jpg" }])?.src, "https://cdn.example.invalid/kitchen.jpg", "reordering photos keeps the link");
});

test("floor plan: normalized positions are the same at any display size; keyboard nudging stays in bounds", () => {
  const a = toNormalized(100 + 300, 50 + 100, { left: 100, top: 50, width: 1200, height: 400 });
  const b = toNormalized(10 + 75, 20 + 25, { left: 10, top: 20, width: 300, height: 100 });
  assert.deepEqual(a, b);
  assert.deepEqual(a, { x: 0.25, y: 0.25 });
  assert.deepEqual(toNormalized(0, 0, { left: 0, top: 0, width: 0, height: 0 }), { x: 0.5, y: 0.5 });
  assert.deepEqual(nudge({ x: 0.995, y: 0.5 }, "ArrowRight", false), { x: 1, y: 0.5 });
  assert.deepEqual(nudge({ x: 0.5, y: 0.5 }, "ArrowUp", true), { x: 0.5, y: 0.45 });
  assert.equal(nudge({ x: 0.5, y: 0.5 }, "Enter", false), null);
});

test("floor plan uploads: type, size and real file format are checked", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const svg = new Uint8Array(Buffer.from("<svg xmlns="));
  assert.equal(sniffImageType(png), "image/png");
  assert.equal(sniffImageType(jpg), "image/jpeg");
  assert.equal(sniffImageType(webp), "image/webp");
  assert.equal(sniffImageType(svg), null);
  assert.equal(floorPlanFileProblem({ type: "image/png", size: 1000, name: "p.png" }, png), null);
  assert.match(floorPlanFileProblem({ type: "image/png", size: 1000, name: "p.png" }, svg)!, /isn't a valid/, "renamed SVG rejected");
  assert.match(floorPlanFileProblem({ type: "image/svg+xml", size: 1000, name: "p.svg" }, svg)!, /JPG, PNG or WebP/);
  assert.match(floorPlanFileProblem({ type: "image/heic", size: 1000, name: "p.heic" }, jpg)!, /JPG, PNG or WebP/);
  assert.match(floorPlanFileProblem({ type: "image/png", size: 11 * 1024 * 1024, name: "p.png" }, png)!, /10 MB/);
  assert.match(floorPlanFileProblem({ type: "image/png", size: 0, name: "p.png" }, png)!, /empty/);
  assert.equal(checkDimensions(1200, 800), null);
  assert.ok(checkDimensions(100, 800));
  assert.ok(checkDimensions(20000, 800));
  assert.ok(checkDimensions(0, 0));
});

test("floor plan viewer renders positioned, labelled buttons and a room list; nothing without a plan", () => {
  const H = createHarness("floorplan");
  const Viewer = H.load("components/FloorPlanViewer.tsx") as Component;
  const html = H.h(Viewer, { floorPlan: sanitizeFloorPlan(plan()), photos: [{ src: "https://cdn.example.invalid/kitchen.jpg" }] });
  assert.match(html, /aria-label="Kitchen: show photo"/);
  assert.match(html, /left:25%;top:50%/);
  assert.match(html, /aspect-ratio:1200 \/ 800/);
  assert.match(html, /Primary bedroom/);
  assert.equal(H.h(Viewer, { floorPlan: null, photos: [] }), "");
});

test("source: the floor plan is loaded separately (missing column = no section) and ownership uses the listing row", () => {
  const data = read("app/listing/[id]/listingData.ts");
  assert.match(data, /select\("floor_plan"\)/);
  assert.match(data, /if \(error \|\| !data\) return null/);
  assert.ok(!/floor_plan/.test(data.slice(data.indexOf("LISTING_PAGE_COLUMNS ="), data.indexOf("export const isUUIDFormat"))), "not in the main select");
  const page = read("app/listing/[id]/page.tsx");
  assert.ok(page.indexOf("if (isNonPublic && !isOwner) notFound()") < page.indexOf("loadFloorPlan("), "drafts are rejected before the floor plan is read");
  const sql = fs.readFileSync(path.join(src, "..", "supabase-migration-048-floor-plans.sql"), "utf8");
  assert.match(sql, /jsonb_array_length\(floor_plan -> 'markers'\) <= 40/);
});

// ===================== custom domains =====================

test("hosts: platform hosts keep the normal site; everything else is a possible customer domain", () => {
  for (const h of ["www.listingflare.com", "listingflare.com", "kelvin.listingflare.com", "localhost:3000", "127.0.0.1:3100", "my-app-git-x.vercel.app", "LISTINGFLARE.COM."]) assert.equal(isPlatformHost(h, {}), true, h);
  for (const h of ["homes.janesmith.com", "janesmith.com", "listingflare.com.evil.example"]) assert.equal(isPlatformHost(h, {}), false, h);
  assert.equal(isPlatformHost("staging.example.com", { PLATFORM_HOSTS: "staging.example.com" }), true);
});

test("customer-domain paths: site pages and the public APIs they call; dashboard, auth and other APIs go to the main site", () => {
  assert.equal(routeCustomHostPath("/").kind, "agent_home");
  assert.equal(routeCustomHostPath("/listing/1-fictional-way").kind, "listing");
  assert.equal(routeCustomHostPath("/listing/1-fictional-way/unbranded").kind, "listing");
  assert.equal(routeCustomHostPath("/_next/static/chunk.js").kind, "asset");
  for (const p of ["/api/ai/chat", "/api/leads/create", "/api/showings/book"]) assert.equal(routeCustomHostPath(p).kind, "api", p);
  for (const p of ["/dashboard", "/dashboard/settings", "/login", "/signup", "/api/domains", "/api/settings", "/api/reports/seller", "/agent/other", "/blog/x", "/listing/a/b/c"]) {
    assert.equal(routeCustomHostPath(p).kind, "platform_redirect", p);
  }
});

test("site header is only honoured on customer domains with the feature on", () => {
  const on = { CUSTOM_DOMAINS_ENABLED: "1" };
  assert.equal(siteAgentFor("www.listingflare.com", AGENT, on), null, "visitor-supplied header ignored on the platform");
  assert.equal(siteAgentFor("homes.janesmith.com", AGENT, {}), null, "feature off");
  assert.equal(siteAgentFor("homes.janesmith.com", AGENT, on), AGENT);
  assert.equal(siteAgentFor("homes.janesmith.com", "not-a-uuid", on), null);
});

function fakeStore() {
  const rows: DomainRow[] = [];
  let n = 0;
  const store: DomainStore = {
    async current(agentId) { return rows.find((r) => r.agent_id === agentId && r.status !== "removed") ?? null; },
    async insert(agentId, hostname) {
      // partial unique indexes from migration 046
      if (rows.some((r) => r.status !== "removed" && (r.hostname === hostname || r.agent_id === agentId))) return "conflict";
      const row: DomainRow = { id: `d${++n}`, agent_id: agentId, hostname, status: "pending", dns_records: [], last_error: null, last_checked_at: null, check_count: 0, connected_at: null };
      rows.push(row);
      return { ...row };
    },
    async ownerOf(h) { return rows.find((r) => r.hostname === h && r.status !== "removed")?.agent_id ?? null; },
    async update(id, patch) { const r = rows.find((x) => x.id === id)!; Object.assign(r, patch); return { ...r }; },
  };
  return { rows, store };
}

function fakeProvider(status: Partial<ProviderDomainStatus> = {}, opts: { addError?: DomainProviderError; removeError?: DomainProviderError } = {}) {
  const calls: string[] = [];
  const provider: DomainProvider = {
    async add(h) { calls.push(`add ${h}`); if (opts.addError) throw opts.addError; },
    async status(h) { calls.push(`status ${h}`); return { verified: true, misconfigured: true, verification: [], routing: [{ type: "CNAME", name: "homes", value: "cname.provider.example" }], ...status }; },
    async remove(h) { calls.push(`remove ${h}`); if (opts.removeError) throw opts.removeError; },
  };
  return { calls, provider };
}

test("domains: connect shows the provider's records; connected only when the provider says so", async () => {
  const { store } = fakeStore();
  const { provider, calls } = fakeProvider();
  const r = await connectDomain(AGENT, " https://Homes.JaneSmith.com/listings ", store, provider, new Date("2026-11-19T12:00:00Z"));
  assert.ok(r.ok && r.domain);
  assert.equal(r.domain!.hostname, "homes.janesmith.com", "full URL reduced to the hostname");
  assert.equal(r.domain!.status, "configuration_needed");
  assert.deepEqual(r.domain!.dns_records, [{ type: "CNAME", name: "homes", value: "cname.provider.example" }]);
  assert.deepEqual(calls, ["add homes.janesmith.com", "status homes.janesmith.com"]);
  const ok = fakeProvider({ misconfigured: false });
  const c = await recheckDomain(AGENT, store, ok.provider, new Date("2026-11-19T12:01:00Z"));
  assert.ok(c.ok && c.domain!.status === "connected" && c.domain!.connected_at);
});

test("domains: claims cannot collide across agents, platform hosts are refused, one domain per agent", async () => {
  const { store } = fakeStore();
  const { provider } = fakeProvider();
  await connectDomain(AGENT, "homes.janesmith.com", store, provider);
  const other = await connectDomain(OTHER, "homes.janesmith.com", store, provider);
  assert.ok(!other.ok && other.status === 409 && /another ListingFlare account/.test(other.error));
  const second = await connectDomain(AGENT, "other.janesmith.com", store, provider);
  assert.ok(!second.ok && /Remove homes\.janesmith\.com/.test(second.error));
  const again = await connectDomain(AGENT, "homes.janesmith.com", store, provider);
  assert.ok(again.ok, "same agent, same domain: idempotent");
  for (const bad of ["www.listingflare.com", "x.vercel.app", "localhost", "jane..com"]) {
    const res = await connectDomain(OTHER, bad, store, provider);
    assert.ok(!res.ok && res.status === 400, bad);
  }
});

test("domains: provider errors, ownership verification, rate-limited rechecks and removal", async () => {
  const s1 = fakeStore();
  const bad = fakeProvider({}, { addError: new DomainProviderError("invalid_domain") });
  const r1 = await connectDomain(AGENT, "homes.janesmith.com", s1.store, bad.provider);
  assert.ok(r1.ok && r1.domain!.status === "error" && r1.domain!.last_error === "invalid_domain");

  const s2 = fakeStore();
  const elsewhere = fakeProvider({ verified: false, verification: [{ type: "TXT", name: "_vercel.janesmith.com", value: "vc-domain-verify=abc" }] }, { addError: new DomainProviderError("in_use_elsewhere") });
  const r2 = await connectDomain(AGENT, "homes.janesmith.com", s2.store, elsewhere.provider, new Date("2026-11-19T12:00:00Z"));
  assert.ok(r2.ok && r2.domain!.status === "verifying");
  assert.equal(r2.domain!.dns_records[0].type, "TXT", "the TXT ownership record from the provider is shown");

  const early = await recheckDomain(AGENT, s2.store, elsewhere.provider, new Date("2026-11-19T12:00:10Z"));
  assert.ok(!early.ok && early.status === 429);

  const down = fakeProvider();
  down.provider.status = async () => { throw new DomainProviderError("provider_unavailable"); };
  const kept = await recheckDomain(AGENT, s2.store, down.provider, new Date("2026-11-19T12:01:00Z"));
  assert.ok(kept.ok && kept.domain!.status === "verifying", "a provider outage keeps the last known state");

  const failRemove = fakeProvider({}, { removeError: new DomainProviderError("provider_unavailable") });
  const rm = await removeDomain(AGENT, s2.store, failRemove.provider);
  assert.ok(!rm.ok && rm.status === 502);
  assert.equal(s2.rows[0].status, "removing", "no longer served while clean-up is retried");
  const rm2 = await removeDomain(AGENT, s2.store, fakeProvider().provider);
  assert.ok(rm2.ok);
  assert.equal(s2.rows[0].status, "removed");
  const reclaim = await connectDomain(OTHER, "homes.janesmith.com", s2.store, fakeProvider().provider);
  assert.ok(reclaim.ok, "a removed hostname can be claimed again");
});

test("Vercel adapter: documented endpoints, bearer token, team scope, and cautious parsing", async () => {
  const calls: Array<{ method: string; url: string; auth: string | null }> = [];
  const responses: Record<string, [number, unknown]> = {
    "POST /v10/projects/prj_1/domains": [200, { name: "homes.janesmith.com" }],
    "GET /v9/projects/prj_1/domains/homes.janesmith.com": [200, { name: "homes.janesmith.com", apexName: "janesmith.com", verified: true }],
    "GET /v6/domains/homes.janesmith.com/config": [200, { recommendedCNAME: [{ rank: 2, value: "b.example." }, { rank: 1, value: "a.example." }] }],
    "DELETE /v9/projects/prj_1/domains/homes.janesmith.com": [404, {}],
  };
  const fakeFetch = (async (input: string, init?: RequestInit) => {
    const u = new URL(input);
    const key = `${init?.method} ${u.pathname}`;
    calls.push({ method: String(init?.method), url: input, auth: (init?.headers as Record<string, string>)?.Authorization ?? null });
    const [status, body] = responses[key] ?? [500, {}];
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const p = createVercelProvider({ VERCEL_API_TOKEN: "test-token", VERCEL_PROJECT_ID: "prj_1", VERCEL_TEAM_ID: "team_1", VERCEL_API_BASE_URL: "https://mock.invalid" }, fakeFetch);
  await p.add("homes.janesmith.com");
  const st = await p.status("homes.janesmith.com");
  assert.equal(st.verified, true);
  assert.equal(st.misconfigured, true, "a missing misconfigured field is never read as configured");
  assert.deepEqual(st.routing, [{ type: "CNAME", name: "homes", value: "a.example" }], "best-ranked provider value, as returned");
  await p.remove("homes.janesmith.com");
  assert.ok(calls.every((c) => c.auth === "Bearer test-token" && c.url.includes("teamId=team_1")));
  assert.throws(() => createVercelProvider({}, fakeFetch), DomainProviderError);
  responses["POST /v10/projects/prj_1/domains"] = [409, { error: { code: "domain_already_in_use" } }];
  await assert.rejects(p.add("homes.janesmith.com"), (e: unknown) => e instanceof DomainProviderError && e.code === "in_use_elsewhere");
});

test("source: middleware leaves platform hosts as before and only routes customer hosts when switched on", () => {
  const mw = read("middleware.ts");
  assert.match(mw, /if \(customDomainsEnabledFlag\(\) && !isPlatformHost\(host\)\)/);
  assert.match(mw, /if \(!needsSession\(pathname\)\) return NextResponse\.next\(\);/);
  assert.match(mw, /headers\.set\(SITE_AGENT_HEADER, site\.agentId\)/, "the site header is always set by the middleware");
  assert.ok(!/x-forwarded-host/i.test(mw.replace(/\/\/.*$/gm, "")), "forwarded host is not used for routing");
  for (const rel of ["app/listing/[id]/page.tsx", "app/listing/[id]/unbranded/page.tsx", "app/agent/[id]/page.tsx"]) {
    assert.match(read(rel), /siteAgentFor\(headers\(\)\.get\("host"\), headers\(\)\.get\(SITE_AGENT_HEADER\)\)/, rel);
  }
  const sql = fs.readFileSync(path.join(src, "..", "supabase-migration-046-custom-domains.sql"), "utf8");
  assert.match(sql, /on public\.agent_custom_domains \(hostname\) where status <> 'removed'/);
  assert.match(sql, /where d\.hostname = lower\(p_host\) and d\.status = 'connected'/);
  assert.match(sql, /security definer\s+set search_path = public, pg_temp/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
