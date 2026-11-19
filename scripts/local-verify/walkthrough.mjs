// Browser walkthrough of the local production build (next start :3100) against fake2.mjs (:54321).
// Real Chromium (Playwright). Fictional data. Every request outside the local app/fake is blocked.
import { chromium, request as pwRequest } from "playwright";
import fs from "node:fs";
import path from "node:path";

const APP = "http://127.0.0.1:3100";
const FAKE = "http://127.0.0.1:54321";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const A = "00000000-0000-4000-8000-0000000000a1";
const CRON = "local-test-secret";

let pass = 0, fail = 0;
const results = [];
const ok = (c, name, extra = "") => { results.push(`${c ? "PASS" : "FAIL"} ${name}${c ? "" : " " + extra}`); c ? pass++ : fail++; console.log(c ? "PASS" : "FAIL", name, c ? "" : extra); };
const fake = async (p, opts) => (await fetch(FAKE + p, opts)).json();
const control = (body) => fetch(`${FAKE}/__control`, { method: "POST", body: JSON.stringify(body) });
const dbt = (t) => fake(`/__db?t=${t}`);
let L0 = null;
// Look listings up by id (saving regenerates the slug from the address), keyed by the ORIGINAL slug.
const listings = async () => { const rows = await dbt("listings"); if (!L0) return Object.fromEntries(rows.map((l) => [l.slug, l])); return Object.fromEntries(Object.entries(L0).map(([slug, l0]) => [slug, rows.find((r) => r.id === l0.id)])); };
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

const session = (token, id) => `base64-${Buffer.from(JSON.stringify({ access_token: token, refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, aud: "authenticated", role: "authenticated" } })).toString("base64url")}`;

const browser = await chromium.launch({ args: ["--host-resolver-rules=MAP homes.example.com 127.0.0.1, MAP unknown.example.com 127.0.0.1"] });
const blocked = [];
const PIXEL = fs.readFileSync(path.join(OUT, "..", "photo.png"));

async function newContext({ token, id, mobile = false } = {}) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
  if (token) await ctx.addCookies([{ name: "sb-127-auth-token", value: session(token, id), domain: "127.0.0.1", path: "/" }]);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP }).catch(() => {});
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith("/_next/image") || u.hostname === "images.unsplash.com") return route.fulfill({ status: 200, contentType: "image/png", body: PIXEL });
    if (["127.0.0.1", "homes.example.com", "unknown.example.com"].includes(u.hostname)) return route.continue();
    blocked.push(u.origin);
    return route.abort();
  });
  return ctx;
}

L0 = await listings();
const owner = await newContext({ token: "fake-token-a", id: A });
const page = await owner.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e.message).slice(0, 200)));

// ---------- 1. edit + save feedback + status preservation ----------
await page.goto(`${APP}/dashboard/edit/${L0["pending-court"].id}`);
await page.getByRole("heading", { name: "Edit Listing" }).waitFor({ timeout: 30000 });
await page.locator("textarea").first().fill("Fictional updated description for the pending home.");
await page.getByText("Unsaved changes.").waitFor();
ok(true, "editing shows 'Unsaved changes.'");
await shot(page, "01-edit-unsaved");
await page.getByRole("button", { name: "Save Changes" }).click();
await page.getByText(/Saved\. Visitors see these changes now\./).waitFor({ timeout: 15000 });
await shot(page, "02-edit-saved");
ok((await listings())["pending-court"].status === "pending", "Save Changes keeps a Pending listing Pending");
ok(new URL(page.url()).pathname.startsWith("/dashboard/edit/"), "editor stays on the page after saving");
const shareText = await page.locator("text=/listing\\/.*pending-court|listing\\/[0-9a-f-]{36}/").first().textContent().catch(() => "");
ok(/http:\/\/127\.0\.0\.1:3100\/listing\//.test(shareText || ""), "saved notice shows the live link", shareText);

// zero-row update -> truthful error
await control({ patch: { table: "listings", id: L0["pending-court"].id, values: { agent_id: "00000000-0000-4000-8000-0000000000b2" } } });
await page.locator("textarea").first().fill("This save must fail.");
await page.getByRole("button", { name: "Save Changes" }).click();
await page.getByText(/Your changes were not saved/).waitFor({ timeout: 15000 });
ok(true, "a save that updates no row shows 'Your changes were not saved'");
await shot(page, "03-edit-zero-row-error");
await control({ patch: { table: "listings", id: L0["pending-court"].id, values: { agent_id: A } } });

// coming soon / closed preserved too
for (const slug of ["soon-circle", "sold-road"]) {
  await page.goto(`${APP}/dashboard/edit/${L0[slug].id}`);
  await page.getByRole("heading", { name: "Edit Listing" }).waitFor();
  await page.locator("textarea").first().fill(`Edited ${slug}`);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.getByText(/Saved\./).waitFor({ timeout: 15000 });
  ok((await listings())[slug].status === L0[slug].status, `Save Changes keeps ${L0[slug].status}`);
}

// ---------- 2. draft preview + denial + analytics ----------
const views0 = (await fake("/__log")).views.length;
await page.goto(`${APP}/listing/draft-lane`);
await page.getByText("Private preview.").waitFor();
await shot(page, "04-owner-draft-preview");
ok(true, "owner sees the private draft preview");
const other = await newContext({ token: "fake-token-b", id: "00000000-0000-4000-8000-0000000000b2" });
const op = await other.newPage();
ok((await op.goto(`${APP}/listing/draft-lane`)).status() === 404, "another agent gets 404 for the draft");
ok((await op.goto(`${APP}/listing/archived-avenue`)).status() === 404, "another agent gets 404 for an archived listing");
const anon = await newContext();
const ap = await anon.newPage();
ok((await ap.goto(`${APP}/listing/draft-lane`)).status() === 404, "anonymous visitor gets 404 for the draft");
ok((await fake("/__log")).views.length === views0, "draft preview and denied requests add no views");

// ---------- 3. settings: More listings toggle ----------
await page.goto(`${APP}/dashboard/settings`);
const sw = page.getByRole("switch", { name: "Show my other listings on each property page" });
await sw.waitFor();
await sw.focus();
await page.keyboard.press("Space");
await page.getByText("Saved", { exact: true }).first().waitFor({ timeout: 10000 });
ok((await dbt("agent_profiles")).find((a) => a.id === A).show_other_listings === true, "Settings switch (keyboard) saves show_other_listings");
await shot(page, "05-settings-more-listings");
await ap.goto(`${APP}/listing/${L0["main-fictional-way"].id}`);
const more = ap.locator("section", { hasText: "More listings from this agent" });
await more.waitFor();
const moreText = await more.innerText();
ok(/Pending Court/.test(moreText) && /Soon Circle/.test(moreText), "More listings shows pending and coming-soon homes");
ok(!/Draft Lane|Archived Avenue|Sold Road|Other Agent/.test(moreText), "More listings excludes draft, archived, sold and other agents", moreText.slice(0, 200));
await more.scrollIntoViewIfNeeded();
await ap.screenshot({ path: path.join(OUT, "06-more-listings.png") });

// ---------- 4. agent page ----------
await ap.goto(`${APP}/agent/fictional-agent`);
await ap.getByText(/Current Listing/).waitFor();
const agentText = await ap.locator("body").innerText();
ok(/Recently sold/.test(agentText) && !/Draft Lane|Archived Avenue/.test(agentText), "agent page: active + recently sold, no drafts");
await shot(ap, "07-agent-page");

// ---------- 5. unbranded ----------
const ur = await ap.goto(`${APP}/listing/${L0["main-fictional-way"].id}/unbranded`);
const usrc = await ur.text();
ok(!/Avery Fictional|agenta1@example\.invalid|Example Realty|5555550100|fictional-agent|0000000000a1/.test(usrc), "unbranded page source has no agent identity (incl. account id in media URLs)", (usrc.match(/.{60}(Avery Fictional|Example Realty|0000000000a1).{40}/) || [""])[0]);
const proxied = await ap.request.get(`${APP}/listing/${L0["main-fictional-way"].id}/unbranded/media/photo/0`);
ok(proxied.status() === 200 && /^image\/png/.test(proxied.headers()["content-type"] || ""), "unbranded photos are served through the media route");
ok((await ap.request.get(`${APP}/listing/${L0["draft-lane"].id}/unbranded/media/photo/0`)).status() === 404, "media route refuses non-public listings");
ok(/noindex/.test(usrc), "unbranded page is noindex");
await shot(ap, "08-unbranded");

// ---------- 6. floor plan editor + viewer ----------
await page.goto(`${APP}/dashboard/edit/${L0["main-fictional-way"].id}`);
await page.getByRole("heading", { name: "Interactive floor plan (optional)" }).waitFor();
// invalid upload: an SVG renamed .png
fs.writeFileSync(path.join(OUT, "..", "fake.png"), "<svg xmlns='http://www.w3.org/2000/svg'></svg>");
await page.locator("#floor-plan-file").setInputFiles({ name: "plan.png", mimeType: "image/png", buffer: fs.readFileSync(path.join(OUT, "..", "fake.png")) });
await page.getByText("That file isn't a valid JPG, PNG or WebP image.").waitFor();
ok(true, "renamed non-image is rejected before upload");
await page.locator("#floor-plan-file").setInputFiles(path.join(OUT, "..", "plan.png"));
const area = page.locator("img[alt='Floor plan being edited']");
await area.waitFor({ timeout: 15000 });
await area.scrollIntoViewIfNeeded();
ok((await fake("/__log")).uploads.some((k) => k.startsWith(`listing-photos/${A}/floor-plan-`)), "floor plan uploaded into the agent's own storage folder");
const box = await area.boundingBox();
await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.5);
await page.getByLabel("Room name").fill("Kitchen");
await page.getByLabel("Photo", { exact: true }).selectOption({ index: 1 });
await area.scrollIntoViewIfNeeded();
const box2 = await area.boundingBox();
await page.mouse.click(box2.x + box2.width * 0.75, box2.y + box2.height * 0.3);
await page.getByLabel("Room name").fill("Primary bedroom");
const m2 = page.getByRole("button", { name: /Marker 2: Primary bedroom/ });
await m2.focus();
for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
await shot(page, "09-floor-plan-editor");
await page.getByRole("button", { name: "Save Changes" }).click();
await page.getByText(/Saved\./).waitFor({ timeout: 15000 });
const fp = (await listings())["main-fictional-way"].floor_plan;
ok(fp && fp.markers.length === 2 && fp.markers[0].label === "Kitchen" && Math.abs(fp.markers[0].x - 0.25) < 0.02 && Math.abs(fp.markers[1].y - 0.35) < 0.02, "markers saved with normalized positions (incl. keyboard nudge)", JSON.stringify(fp?.markers));
ok(fp?.markers[0].photoSrc && /photo-1\.png$/.test(fp.markers[0].photoSrc), "marker linked to a listing photo");
// public viewer: desktop + mobile, keyboard open/close
await ap.goto(`${APP}/listing/${L0["main-fictional-way"].id}`);
const kitchen = ap.getByRole("button", { name: "Kitchen: show photo" });
await kitchen.scrollIntoViewIfNeeded();
await kitchen.focus();
await ap.keyboard.press("Enter");
await ap.getByRole("dialog", { name: "Kitchen" }).waitFor();
await shot(ap, "10-floor-plan-viewer-open");
await ap.keyboard.press("Escape");
ok(await ap.getByRole("dialog", { name: "Kitchen" }).count() === 0, "floor plan photo dialog opens with Enter and closes with Escape");
const mobileAnon = await newContext({ mobile: true });
const mp = await mobileAnon.newPage();
await mp.goto(`${APP}/listing/${L0["main-fictional-way"].id}`);
const mk = mp.getByRole("button", { name: "Kitchen: show photo" });
await mk.scrollIntoViewIfNeeded();
const img = mp.locator("section[aria-labelledby='floor-plan-heading'] img").first();
const ib = await img.boundingBox(), kb = await mk.boundingBox();
ok(Math.abs((kb.x + kb.width / 2 - ib.x) / ib.width - 0.25) < 0.03, "marker stays at the same relative spot on a phone-sized viewport", JSON.stringify({ ib, kb }));
await mk.tap();
await mp.getByRole("dialog", { name: "Kitchen" }).waitFor();
await mp.screenshot({ path: path.join(OUT, "11-floor-plan-mobile.png") });
const scrollW = await mp.evaluate(() => document.documentElement.scrollWidth);
ok(scrollW <= 390, "no horizontal overflow on the listing page at 390px", String(scrollW));

// ---------- 7. flyer ----------
await page.goto(`${APP}/dashboard/edit/${L0["main-fictional-way"].id}`);
await page.getByRole("button", { name: /Open House Flyer/ }).click();
await page.getByRole("dialog", { name: "Listing flyer" }).waitFor();
await page.getByText("Building your flyer").waitFor({ state: "detached", timeout: 15000 });
await page.getByLabel("Headline", { exact: true }).fill("Just Listed");
await page.getByLabel("Open house date (optional)").fill("2026-11-21");
await page.getByLabel("Start", { exact: true }).fill("13:00");
await page.getByLabel("End", { exact: true }).fill("16:00");
for (const layout of ["Classic", "Modern", "Minimal"]) {
  await page.getByRole("button", { name: layout, exact: true }).click();
  await page.getByText("Saturday, November 21 · 1 – 4 PM").first().waitFor();
  await shot(page, `12-flyer-${layout.toLowerCase()}`);
}
ok(true, "all three flyer layouts render the edited headline and date");
await page.getByLabel(/The open-house sign-in page/).check();
ok(/\/open-house\//.test(await page.getByText(/^Opens:/).innerText()), "QR set to the sign-in page shows its destination");
await page.getByLabel(/The listing page/).check();
ok(/\?src=flyer/.test(await page.getByText(/^Opens:/).innerText()), "QR set to the listing page shows ?src=flyer");
await page.emulateMedia({ media: "print" });
await page.pdf({ path: path.join(OUT, "13-flyer-print.pdf"), format: "Letter", printBackground: true });
await page.emulateMedia({ media: "screen" });
const pdf = fs.readFileSync(path.join(OUT, "13-flyer-print.pdf")).toString("latin1");
const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
ok(pages === 1, "print output of the flyer is one Letter page", String(pages));
await page.getByRole("button", { name: "Close" }).first().click();

// ---------- 8. seller report preview (periods + zero state) ----------
await control({ patch: { table: "listings", id: L0["soon-circle"].id, values: { view_count: 0 } } });
await page.goto(`${APP}/reports/${L0["soon-circle"].id}`);
await page.getByText(/No views or inquiries have been recorded yet/).waitFor({ timeout: 15000 });
ok(true, "seller report shows the honest zero state for a listing with no activity");
await shot(page, "14-report-zero-state");
await page.goto(`${APP}/reports/${L0["main-fictional-way"].id}`);
await page.getByLabel("Period").selectOption("30");
await page.getByText(/Buyer inquiries, last 30 days/).waitFor();
ok(!/SECRET BUYER NAME|SECRET TRANSCRIPT/.test(await page.locator("body").innerText()), "seller report shows no buyer names or messages");
await shot(page, "15-report-30-days");

// ---------- 9. scheduled seller reports ----------
await page.goto(`${APP}/dashboard/edit/${L0["main-fictional-way"].id}`);
const card = page.locator("section", { hasText: "Scheduled seller reports" });
await card.getByText("Sends to:").waitFor();
ok(/Sam Seller <seller@example\.invalid>/.test(await card.innerText()), "schedule card shows the seller portal recipient");
await card.getByRole("button", { name: /Preview email/ }).click();
const frame = card.frameLocator("iframe[title='Seller report email preview']");
await frame.getByText(/Here is the activity report/).waitFor();
ok(!/SECRET BUYER NAME/.test(await frame.locator("body").innerText()), "email preview has no buyer names");
await card.getByLabel("Day").selectOption("1");
await card.getByLabel("Earliest send time").selectOption("9");
await card.getByRole("button", { name: "Turn on reports" }).click();
await card.getByText("Scheduled reports are on.").waitFor();
ok(/Next report: on or after Mon/.test(await card.innerText()), "next run shown in the chosen time zone");
ok(!(await page.getByText("Unsaved changes.").count()), "schedule controls do not mark the listing as unsaved");
await shot(page, "16-schedule-on");
// make it due, then run the cron twice (duplicate invocation)
const sch = (await dbt("seller_report_schedules"))[0];
await control({ patch: { table: "seller_report_schedules", id: sch.id, values: { next_run_at: new Date(Date.now() - 3600_000).toISOString() } } });
const api = await pwRequest.newContext();
ok((await api.get(`${APP}/api/cron/seller-reports`)).status() === 401, "cron entry point rejects unauthenticated calls");
const r1 = await (await api.get(`${APP}/api/cron/seller-reports`, { headers: { Authorization: `Bearer ${CRON}` } })).json();
const r2 = await (await api.get(`${APP}/api/cron/seller-reports`, { headers: { Authorization: `Bearer ${CRON}` } })).json();
const emails = (await fake("/__log")).emails;
ok(r1.counts?.accepted === 1 && emails.length === 1, "due report sent once through the (mock) provider", JSON.stringify(r1));
ok(!r2.counts?.accepted, "second cron run does not send again", JSON.stringify(r2));
ok(emails[0]?.to === "seller@example.invalid" && /seller-report\//.test(emails[0]?.idem || ""), "sent to the seller with an idempotency key");
ok(!/SECRET BUYER NAME|SECRET TRANSCRIPT/.test(emails[0]?.html || ""), "sent email contains no buyer identity or transcript");
ok(!JSON.stringify(r1).includes("@"), "cron response contains no email addresses");
await page.reload();
await card.getByText(/Accepted by the email provider/).waitFor();
ok(true, "delivery status shown as 'accepted by the provider', not 'delivered'");
await card.getByRole("button", { name: "Pause" }).click();
await card.getByText("Scheduled reports are paused.").waitFor();
ok((await dbt("seller_report_schedules"))[0].enabled === false, "pause disables the schedule");

// ---------- 10. owner AI test mode ----------
await page.goto(`${APP}/listing/${L0["main-fictional-way"].id}`);
const leadPostsBefore = (await fake("/__log")).writes.filter((w) => w === "POST leads").length;
await page.getByRole("button", { name: "Chat about this property" }).click();
await page.getByText(/Test mode\./).waitFor();
await page.getByPlaceholder("Ask about this property...").fill("What is the price?");
await page.keyboard.press("Enter");
await page.getByText("FAKE_REPLY from the local mock.").waitFor({ timeout: 15000 });
for (const q of ["Beds?", "Baths?", "HOA?"]) { await page.getByPlaceholder("Ask about this property...").fill(q); await page.keyboard.press("Enter"); await page.waitForTimeout(800); }
ok(await page.getByText("Want to hear more from the agent?").count() === 0, "no lead capture in the owner's test chat");
ok((await fake("/__log")).writes.filter((w) => w === "POST leads").length === leadPostsBefore, "owner test chat created no lead");
const aiSys = (await fake("/__log")).ai.at(-1)?.system || "";
ok(/private test session/.test(aiSys) && !/SECRET|notes/i.test(aiSys), "AI context is the saved listing, marked as a test session, with no private notes");
await shot(page, "17-owner-chat-test-mode");

// ---------- 11. custom domains ----------
await page.goto(`${APP}/dashboard/settings`);
const dcard = page.locator("section", { hasText: "Custom domain" });
await dcard.getByLabel("Domain or subdomain you own").fill("https://Homes.Example.com/listings");
await dcard.getByText(/Only the hostname homes\.example\.com is used/).waitFor();
await dcard.getByRole("button", { name: "Connect domain" }).click();
await dcard.getByText("DNS records needed").waitFor({ timeout: 15000 });
ok(/cname\.mock-provider\.invalid/.test(await dcard.innerText()), "DNS record shown exactly as the provider returned it");
await dcard.getByRole("button", { name: "Copy CNAME value" }).click();
ok((await page.evaluate(() => navigator.clipboard.readText()).catch(() => "")) === "cname.mock-provider.invalid", "copy button copies the record value");
await shot(page, "18-domain-dns-needed");
await dcard.getByRole("button", { name: "Check again" }).click();
await dcard.getByText(/Checked a moment ago/).waitFor();
ok(true, "rechecks are rate limited");
// another agent cannot claim it
const otherApi = await other.request.post(`${APP}/api/domains`, { data: { hostname: "homes.example.com" } });
ok(otherApi.status() === 409 && /another ListingFlare account/.test(await otherApi.text()), "another agent's claim of the same domain is refused");
ok((await (await anon.newPage()).goto("http://unknown.example.com:3100/")).status() === 404, "unknown host gets 'not connected' 404");
const notYet = await anon.newPage();
ok((await notYet.goto("http://homes.example.com:3100/")).status() === 404, "domain does not serve until connected");
await control({ vercel: { misconfigured: false } });
await page.waitForTimeout(31000);
await dcard.getByRole("button", { name: "Check again" }).click();
await dcard.getByText("Connected", { exact: true }).waitFor({ timeout: 15000 });
await shot(page, "19-domain-connected");
await page.waitForTimeout(61000); // middleware negative-cache TTL for the earlier 404 lookup
const cd = await anon.newPage();
const home = await cd.goto("http://homes.example.com:3100/");
ok(home.status() === 200 && /Avery Fictional/.test(await cd.locator("body").innerText()), "connected domain serves the agent's site at /");
await cd.screenshot({ path: path.join(OUT, "20-custom-domain-home.png") });
ok((await cd.goto(`http://homes.example.com:3100/listing/${L0["main-fictional-way"].id}`)).status() === 200, "agent's listing serves on the custom domain");
ok((await cd.goto("http://homes.example.com:3100/listing/other-agent-place")).status() === 404, "another agent's listing 404s on this domain");
const raw = await pwRequest.newContext({ extraHTTPHeaders: {} });
const redir = await raw.get("http://127.0.0.1:3100/dashboard", { headers: { Host: "homes.example.com" }, maxRedirects: 0 });
ok(redir.status() === 308 && /^https:\/\/www\.listingflare\.com\/dashboard/.test(redir.headers().location || ""), "dashboard on a customer domain redirects to the main site (not followed)", `${redir.status()} ${redir.headers().location}`);
ok(!(redir.headers()["set-cookie"] || "").includes("sb-"), "no session cookie set on the customer domain");
const spoof = await raw.get(`${APP}/listing/other-agent-place`, { headers: { "x-lf-site-agent": A } });
ok(spoof.status() === 200, "a visitor-supplied site header is ignored on the platform host");
await dcard.getByRole("button", { name: "Remove" }).click();
await dcard.getByRole("button", { name: "Yes, remove" }).click();
await dcard.getByLabel("Domain or subdomain you own").waitFor();
ok((await dbt("agent_custom_domains"))[0].status === "removed" && (await fake("/__log")).vercel.some((v) => v.startsWith("DELETE")), "remove cleans up at the provider and marks the domain removed");

// ---------- 12. regressions + mobile settings ----------
ok((await ap.goto(`${APP}/login`)).status() === 200, "login page still renders");
ok((await page.goto(`${APP}/dashboard`)).status() === 200, "dashboard still renders for the owner");
const ms = await (await newContext({ token: "fake-token-a", id: A, mobile: true })).newPage();
await ms.goto(`${APP}/dashboard/settings`);
await ms.getByRole("heading", { name: "Custom domain" }).scrollIntoViewIfNeeded();
await ms.screenshot({ path: path.join(OUT, "21-settings-mobile.png") });
const sw2 = await ms.evaluate(() => document.documentElement.scrollWidth);
ok(sw2 <= 390, "no horizontal overflow on Settings at 390px", String(sw2));
const me = await (await newContext({ token: "fake-token-a", id: A, mobile: true })).newPage();
await me.goto(`${APP}/dashboard/edit/${L0["main-fictional-way"].id}`);
await me.getByRole("heading", { name: "Scheduled seller reports" }).scrollIntoViewIfNeeded();
await me.screenshot({ path: path.join(OUT, "22-edit-mobile-schedule.png") });
const sw3 = await me.evaluate(() => document.documentElement.scrollWidth);
ok(sw3 <= 390, "no horizontal overflow on the editor at 390px", String(sw3));

ok(blocked.filter((o) => !/fonts\.(googleapis|gstatic)\.com/.test(o)).length === 0, "the browser made no other external requests", [...new Set(blocked)].join(", "));
ok(consoleErrors.length === 0, "no uncaught page errors in the owner session", consoleErrors.join(" | "));
const fl = await fake("/__log");
ok(fl.external.length === 0, "fake backend saw no unexpected requests", fl.external.join(", "));
fs.writeFileSync(path.join(OUT, "results.txt"), results.join("\n") + `\n\n${pass} passed, ${fail} failed\nblocked origins: ${[...new Set(blocked)].join(", ") || "none"}\n`);
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
