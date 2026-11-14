# Round 2: completion report (2026-11-12)

Builds on `2026-11-12-product-seo-growth-review.md`. Existing worktrees and uncommitted work (main checkout, `-a1-wt`, `-dash-wt`) were not touched.

## 1. Shipped to production (verified live)

| PR | Content | Production |
|---|---|---|
| #42 | Trial/ROI/guarantee copy corrections (+ round-1 report) | merged b1a13d3, live text verified |
| #44 | Overflow fixes: landing H1 (390 px) and demo mortgage card (768/820 px) | merged d74e71d, live H1 class verified |
| #45 | Competitor price corrections on both comparison pages + false custom-domain claim removed from builders roundup | merged da368f9, live text verified |

Release process honesty: the repo has **no CI test workflow and no branch protection**; Vercel is the only check and it passed on each PR. The full test suite is **not green**: `npm test` = 2 failures (`mountedDashboard`, `mountedTransition`), reproduced identically on clean main before any of my changes. Cause: `ERR_INVALID_ARG_TYPE` ("paths[0] ... Received undefined") under Node 20.20 on Windows; the repo declares Node 22. Exact line not isolated; no test was disabled or skipped. Whether they pass on Node 22 is unverified.

## 2. Trial enforcement (what is really enforced)

| Limit (in `subscription.ts`) | Client UI | Server / DB |
|---|---|---|
| 1 listing | enforced (create page + dashboard) | **not enforced** (listings inserted straight from the browser; no DB trigger found) |
| 5 photos | enforced (create + edit) | **not enforced** (browser storage upload) |
| 0 videos | enforced | not enforced |
| Reply to leads | reply box hidden | **`/api/leads/reply` has no plan check** |
| Social posts | button hidden | `/api/social-posts` allows trialing users |
| 5 leads | **not enforced anywhere** | not enforced |
| Flyer | **not enforced anywhere** | n/a |
| 1 AI description | **not enforced anywhere** | AI routes allow trialing users |
| Expired trial | listing page hidden (server check) | follow-ups skipped (server) |

Public copy now claims only what the UI enforces (1 listing, up to 5 photos; video, dashboard lead replies, social posts are paid). Closing the server gaps is a billing/permissions change: **not done, needs approval**; low priority for a $150 product unless abuse appears.

**Can a trial user experience the core value before paying? Yes, mostly.** A trial agent can publish one branded listing page with the AI chat, capture leads (unlimited in practice), have the instant first-reply go to buyers (not plan-gated in the reviewed code; skipped only if Approval Mode is on), and receive showing requests. What is withheld is replying from the dashboard, which is the visible "upgrade moment". Unverified end to end (needs a live test account).
Entitlement recommendation (separate, **not made**): keep limits for now. Hypothesis to test later: allow dashboard replies to the first few leads during trial, because the follow-up step is part of the core value and its absence may hurt conversion. Needs conversion data first.

## 3. Showing requests (PR #43, DRAFT, not merged)

Implemented and tested in isolation: request status, request-only emails, no invite/Google/follow-up at request, agent confirm/decline endpoint, duplicate + conflict handling, dashboard "Requests to answer" tab (opens there when any are pending), migration 041 **written, not applied**. 287/289 tests pass (same 2 baseline failures). All fakes; nothing sent.
Existing data: historical `confirmed` rows untouched and cannot be declined via the new endpoint. Consumers audited: reminders, feedback requests, briefing, upcoming list, command palette already filter `confirmed`. Count-only consumers (public stats, monthly ROI, seller report/portal, analytics email, presentation) count requests/declined too: needs a decision.
Timezone: none stored. Confirmed existing bug: the Google event uses the server timezone (UTC on Vercel). Not fixed; needs a timezone column.
Unverified: "Busy times block showing slots" (Google Calendar settings copy): the scheduler has no availability check; no code path found that hides busy times from buyers.

## 4. Local dashboard and demo review (mocked, NOT integration)

Setup: a ~100-line mock Supabase (auth + REST, synthetic data, logs write attempts, stores nothing) + local `next dev`; no Stripe/Resend/Anthropic keys exist in that environment. Production `.env.local` was never copied. Playwright Chromium, simulated viewports 390 and 1440.
Findings:
- 11 routes (10 dashboard + demo) rendered at both widths, empty and populated: no horizontal overflow; next action obvious on the empty dashboard (A: no defect).
- Confirmed (fixed in #43): checklist said "Instant confirmations to both of you".
- Usability (fixed in #43): pending request easy to miss; mobile showing card cramped.
- Usability (open): address/email truncate in narrow cards; 4-25 controls per page under 40 px height (counted, not triaged); no tablet width exercised for the dashboard.
- Not tested (mock cannot): real auth, listing creation submit, image upload, Stripe, email, AI, RLS. The only outside hosts contacted: Vercel analytics script and the demo's public Matterport/Unsplash assets.
- Demo: renders at 390/1440; forms and chat not submitted. Chat prompt tells the model never to invent details and to offer to ask the agent when it lacks info (code-verified; model behaviour untested, needs paid AI). The persona is "texting like a human" but discloses AI when sincerely asked.
- Remaining known overflow at 320 px: `/` by 28 px, comparison page by 10 px (outside the reported two).

## 5. SEO and public research

**Access:** Chrome is signed in to a Google account but Search Console lists **no properties**; `listingflare.com` is not registered there. GA4/Keyword Planner/Semrush/DataForSEO: none configured. Site traffic is likely visible only in the Vercel Analytics dashboard (not checked). **Minimal login step:** in Search Console, add `https://www.listingflare.com` as a URL-prefix property and verify (DNS TXT or HTML tag), or tell me you want to use the Vercel Analytics dashboard. Until then there is no impressions/click/index data.

**Public research (2026-11-12, US, standard web search, no volumes or rankings available):**
- Query "single property website for real estate listing agents": results are dominated by vendor and trade pages (Luxury Presence, AgentFire, Virtuance, HubSpot, PhotoUp, The Close, Rechat, Sierra). Intent is agent evaluation (informational/commercial). ListingFlare's `/single-property-website-builder` and builders roundup target this; whether they rank is unknown.
- Competitor pricing: **SinglePropertySites own pricing page** (read once, extractor): free tier; $12/mo for 1 active listing, $29 for 5, $49 for 10, $97 for 100; add-ons separate. **Rela**: own page returned 403; third-party snapshots (xpay, May 2026) suggest tiers around $24-29/mo (1 listing), $49-59 (5), $99-119 (25): **unverified**. Implication: ListingFlare's $150 flat is not cheaper at typical volumes; positioning must be AI chat + lead handling, not price. Fixed on both comparison pages (#45).
- Open house / lead capture: tools listed at $20-25/month (Spacio, Open House Pro, per a vendor-style comparison; unverified) and free tiers; chatbot pages are mostly vendor-authored. Differentiator worth testing: answers only from entered details.
- Homebuyers vs agents: the "Home Selling"/"Relocation"/market-report posts target homeowners/buyers.

**Articles, deeply reviewed (7 of 87):** single-property-website-cost, listingflare-review, best-single-property-website-builders, cribflyer-vs-rela-vs-listingflare, best-showing-scheduling-software-real-estate, how-to-stop-losing-leads-to-zillow, best-rela-alternatives-single-property-websites (targeted claim scan against code facts, not full reads). Result: one confirmed false claim fixed (custom domain, #45). **Still open:** `cribflyer-vs-rela-vs-listingflare` and `best-rela-alternatives...` contain per-listing price crossover tables (flat $150 vs per-listing) that likely mislead given tiered pricing; `how-to-stop-losing-leads-to-zillow` contains a Google Ads vs Zillow cost-per-deal claim without a source. Broad rewrites need approval. The other 80 articles are script-inventoried only (dates, words, links, noindex, CTA).
No homeowner article was deleted or changed.

**Homes by City / "local":** purpose = a public directory for **property visitors**, built only from real customers' published listings (demo agent excluded), shown only when a city has at least 3. Live check: `/homes` returns 200, `noindex, follow`, says "No cities to show yet"; the 88-URL sitemap contains no `/homes` and no `/listing/` URLs. Conclusion: zero real public inventory today, so it's inert. **Left unchanged**, pending evidence (once customers publish ≥3 listings in a city, re-evaluate). Geographic SEO is not appropriate for the SaaS itself; Google Business Profile eligibility is unverified and not recommended.

**Existing ROI calculator (pricing page), review only:**
- Inputs: home price (150k-1.5M, default 400k), commission 2.5%, "extra closings per year" **minimum 1** (cannot choose 0), so it always outputs a positive return ("6x", "66 days").
- Treats gross commission as income (no brokerage split, taxes, or costs), while the FAQ elsewhere says "before splits".
- Assumes closings are attributable to ListingFlare; I changed the caption to say they are not guaranteed.
- No CTA or measurement inside the component.
- Recommended small changes (not made): allow 0; show "closings needed to cover $1,800/year at your net commission" instead of a multiple; add net-of-split input; CTA to demo/trial; track interaction with the existing analytics. No new calculator.

## 6. Open items and approvals

Required decisions (see final message): showing-request migration/email/booking go-ahead; Search Console property verification (or Vercel Analytics access); broad article price-table rewrites; server-side trial enforcement and any entitlement change; timezone column.
