# ListingFlare product, design and organic growth review (2026-11-12)

Branch `growth-review/product-seo-audit` (worktree `ListingFlare-growth-review`, from origin/main a6e7638).
The main checkout and two other worktrees hold uncommitted work and were NOT touched.

## 0. Coverage, honestly

| Area | What was done | What was NOT done |
|---|---|---|
| Code | Read subscription limits, pricing, showing booking, auto-reply, sitemap/robots, city logic, blog metadata | Full read of every dashboard page |
| Rendered public pages | 15 public routes via Playwright Chromium at **simulated** viewports 390 / 820 / 1440 px (no real device) against a local dev server | Real phones/tablets; Lighthouse/CWV field data |
| Dashboard | Code-level review only | **No live dashboard review**: needs a test account + Supabase. Local `.env.local` points to PRODUCTION Supabase with live Stripe/Resend/Anthropic keys, so it was deliberately not used. |
| Demo | Code/route inventory | No form submits, chat calls or bookings (paid AI / real records) |
| Blog | All 87 articles inventoried by script (dates, words, links, noindex, CTA); internal-link check passed (0 broken) | Deep read of every article. **Deeply reviewed: 0 of 87.** Competitor price/feature claims are not yet fact-checked. |
| Keywords / competitors | Verified that no access exists | No volume, difficulty, rankings or competitor traffic: **no Search Console, GA4, Keyword Planner, Semrush or DataForSEO credentials/MCP are configured on this machine.** Nothing was estimated or invented. |
| Local server errors | Console errors seen were from my deliberately inert Supabase URL (WebSocket to 127.0.0.1:9), not site defects | |

Test suite on clean main: 267 pass / 2 fail (`mountedDashboard`, `mountedTransition`), **pre-existing**, identical with and without my edits (possibly Node 20 here vs engines 22). Typecheck clean.

## 1. Product facts (from code)

- Price $150/month, 14-day trial, no card. Paid: unlimited listings/photos/leads, 10 videos, lead replies, social posts, flyers.
- **Trial (`src/lib/subscription.ts`): 1 listing, 5 photos, 0 videos, 5 leads, no lead replies, no social posts, no flyer, 1 AI description.**
- Audience: listing agents. Not a CRM, not IDX, not lead sales; leads come only from the agent's own pages/open-house QR.
- Journey gaps: pricing page and homepage FAQ promise more than the trial gives (see C1); showing flow over-promises (C2).

## 2. Findings (classified)

Classification key: **Confirmed behavior / Copy inconsistency / Product limitation / Unverified**.

### Pasted themes

| # | Theme | Classification | Evidence | Smallest correction |
|---|---|---|---|---|
| C1 | Trial = "full access to every feature" | **Copy inconsistency (confirmed)** | `pricing/page.tsx` FAQ vs `getSubscriptionLimits`; dashboard itself says "trial allows 1 listing" | FIXED in this branch (FAQ now lists real limits). Owner decision: copy is right to change unless you intend a full trial. |
| C2 | Built-in scheduler vs Calendly | **Confirmed behavior, copy partly inconsistent.** Both exist: built-in 3-step scheduler (`ShowingScheduler`) and an optional Calendly link the AI chat shares (`settings`, `ai/chat`). Homepage says "no Calendly needed" and elsewhere "offers your Calendly link". Not contradictory but unexplained: the AI chat cannot book into the built-in scheduler, it only shares a Calendly URL. | `ai/chat/route.ts:76-91`, `HomeClient.tsx:1340,1566`, `pricing:88` | Copy: explain "chat shares your Calendly link; the page has its own scheduler". Not applied (needs owner wording). |
| C3 | Showing **requests** vs **confirmed bookings** | **Product limitation + copy inconsistency (confirmed)** | Buyer sees "We'll confirm instantly" and "Showing Confirmed!"; buyer email subject "Showing Confirmed" with .ics attached; DB `showings.status` default `'confirmed'`, **no pending/requested state**; no uniqueness or availability check on date/time, so double-booking is possible; the agent never approves. The code itself notes the email "still says confirmed, until the separate showing-request phase" (`showingEmails.ts:11-13`). | Proposed: wording "Showing requested / the agent will confirm" in UI + emails; real fix = `requested` status + agent confirm + slot check. **Needs approval (DB, production behavior).** Not applied. |
| C4 | Guaranteed-sounding lead capture | **Copy inconsistency** | "responds before anyone else can" (home FAQ), "never lose a lead" (`about:127`), "Automation That Never Sleeps", "Every lead goes straight to you", "50+ features" vs pricing "48 features". Auto-reply is skipped when Approval Mode is on (`auto-reply/route.ts:131`). | FIXED: home FAQ "responds before anyone else". Still open: `about:127` "never lose a lead", feature-count mismatch. |
| C5 | Leads vs closed transactions in ROI | **Copy inconsistency** | Pricing: "$5 a day. One closed deal pays for years"; home FAQ "One deal... covers the cost many times over"; `RoiCalculator` defaults to 1 extra closing = "6x return" with a generic estimate note. | FIXED in 3 places (pricing subtitle, home FAQ, calculator caption). Calculator still defaults to 1 extra closing: owner decision (default to 0?). |

### Other confirmed items
- **A1 (Confirmed, minor):** `/listingflare-vs-singlepropertysites` at 390 px: document scrollWidth 496 > 390 (horizontal page scroll). The table itself is inside `overflow-x-auto`, so the cause is something else on the page; **cause not yet isolated** (my diagnostic run was interrupted). Not fixed.
- **A2 (Confirmed, minor):** `/demo` at 820 px: scrollWidth 868, from decorative absolutely-positioned elements (`-right-32` blob / SVG). Cosmetic but causes sideways scroll on tablet.
- **A3:** 8-40 links/buttons per page under 44x44 px on mobile (counts, inline text links included; not all are defects). Needs a filtered review.
- **A4 (Unverified):** pricing "Video uploads (10 per listing)" vs code `maxVideos: 10` (looks account-wide). Check the upload code.
- **A5 (Unverified):** "Google Calendar 2-way sync", "Seller sees live views" (another uncommitted edit in the main checkout already softens that line, so avoid duplicate edits).

### Blog (inventory, not deep review)
87 articles; 77 indexable, 10 `noindex` (4 city market reports, buying-vs-renting, 5 third-party tool reviews). Categories: Lead Generation 22, Listing Marketing 21, Agent Growth 13, Lead Mgmt 9, Home Selling 6, Market Reports 4, Open Houses 4, Social 3, Single Property Sites 3, Home Buying 1, Relocation 1. 0 broken internal blog links; every article has an internal link to a product page.
- **Intent mismatch hypothesis (unverified):** ~8 indexable/related posts target **homeowners/buyers** (how-much-to-sell-a-house, staging tips, what-not-to-fix, first-time-sellers, how-to-choose-an-agent, moving-to-raleigh, sell-fast-in-raleigh) while ListingFlare sells to agents. These carry software CTAs that do not match their reader. No traffic data to decide; do **not** delete or merge. Options: keep as is, re-point CTAs, or noindex after GSC data.
- 6 third-party tool reviews (Descript, ElevenLabs, Surfer, etc.) and 4 "best X" competitor posts need claim/price verification before any rewrite.
- 37 posts are dated 2026-10-22..26 (a recent batch); 40 are 2026-02/03. Age vs indexing cannot be judged without Search Console.

### "Local" pages (what they are)
No tab literally labeled "Local" exists on the live homepage (live HTML checked) or in code. Candidates: (a) `/homes` + `/homes/[city]` "Homes for Sale by City" directory: serves **property visitors**, built from real customers' published listings, hidden until ≥1 public city, city pages noindex under 3 listings, demo agent excluded; (b) NC/Raleigh/Durham/Charlotte/Austin blog posts. Currently zero real public inventory likely means the directory is hidden. **Please confirm which "local" tab you saw.** Recommendation: no change; geographic SEO is not appropriate for the SaaS itself; Google Business Profile eligibility is unverified (requires a staffed physical location or service area; not assumed).

### Calculator evaluation
A calculator **already exists** (`RoiCalculator` on /pricing): commission x assumed extra closings. Options: (1) improve it (default 0 extra closings, show break-even in closings, not "6x"); (2) add a transparent "property-website cost comparison" (user enters listings/month; formulas use verified competitor prices) as a section on the two existing vs-pages; (3) separate tool; (4) nothing. **Recommendation: 1 now (copy-level, low risk), and 2 only after competitor pricing is verified from their pricing pages and Search Console shows people reaching the vs pages.** The vs pages already state "$29/listing (Rela), $25-50 (SPS)" with "check current pricing": unverified today. No evidence of search demand yet, so do not build a separate tool. Needs approval to build.

## 3. Prioritized roadmap

1. **(Done, PR)** Copy accuracy: trial terms, ROI/guarantee wording.
2. Showing request wording (UI + emails) and, separately, requested/confirmed status + slot conflict check. Approval: DB + production behavior.
3. Connect Search Console (read-only) to replace guesses: then decide on homeowner-intent posts, vs-page investment and the calculator.
4. Verify competitor prices/features on the vs pages and "best X" posts (read public pricing pages only).
5. Run a live dashboard review with a dedicated test account on a non-production Supabase project (or approved production test account).
6. Isolate A1/A2 overflow; filter A3 tap targets.

## 4. Consolidated approvals requested

1. Showing flow: reword to "requested" and/or add `requested` status + conflict check (touches DB, emails).
2. Whether the trial should stay limited (copy fixed) or be made full-access (product/billing decision).
3. Read-only Search Console / GA4 OAuth (and say if you hold Semrush or Keyword Planner access).
4. A test account + synthetic data (staging Supabase preferred) for live dashboard and booking/lead E2E tests. Proposed bounded E2E (all synthetic, run only after approval): signup -> create listing -> publish -> submit one lead on own listing -> verify lead + auto-reply (Approval Mode ON, email to an owned inbox) -> one showing request -> verify status/email wording -> delete all rows by exact id.
5. Optional: merge PR after your review of the pricing/trial copy; deploy and verify production revision.

## 5. Measurement plan
After merge: confirm live HTML contains new FAQ text; track /pricing -> /signup clicks and trial-to-activation (first listing published) in GA4 once connected; watch support questions about trial limits.
