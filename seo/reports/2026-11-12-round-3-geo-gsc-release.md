# Round 3: Search Console data, geographic review, release status (2026-11-12)

## 1. Release verification (the "stale homepage" question)
Production deployment sha = `main` at each check (da368f9, 8c409d0, 42c58ba). The homepage raw HTML on `https://www.listingflare.com/`, the apex `listingflare.com` and `http://listingflare.com` (all resolve to www, HTTP 200) contains none of "50+ features", "before anyone else", "many times over"; fresh and cached (`X-Vercel-Cache: HIT/PRERENDER`, `max-age=0, must-revalidate`) responses agree; a cache-busting query string agrees. No duplicate copy in source. Conclusion: the external retrieval was **stale**, not a deployment discrepancy. Unverified: what that retrieval tool cached or when.

## 2. Search Console (property `sc-domain:listingflare.com`, account kelvinspratt11@gmail.com)
Property exists and was readable (the /welcome page I first opened does not list properties, which is why my first check wrongly saw none). Read-only.

| Metric | Prev 28d (Sep 16-Oct 13) | Latest 28d with data (Oct 14-Nov 10) |
|---|---|---|
| Clicks | 29 | 20 |
| Impressions | 4.77K | 8.81K |
| CTR | 0.6% | 0.2% |
| Avg position | 33.6 | 35.7 |
| Pages with impressions | 42 | 103 |
| Queries | n/a | 953 |

Caveats: tiny numbers; GSC hides some queries; data runs ~2 days behind. Reading: visibility is growing (more pages and impressions), but almost everything ranks around position 30-40, so clicks are near zero and fell. **Branded search is negligible**: 32 impressions, 0 clicks (`listingflare.com`, `listingflare.com alternatives`).
Top pages (latest 28d): `best-single-property-website-builders` 4 clicks / 1,484 imps; `speed-to-lead-real-estate` 2 / 212; homepage 2 / 122; `best-lead-generation-tools-for-real-estate-agents` **1 / 2,757** (largest impressions, lowest CTR; ranks deep); `open-house-sign-in-sheet-template` 1 / 346. Top queries (impressions): "speed to lead real estate" 140, "real estate lead generation" 135, "best real estate website builder" 90, "real estate leads" 84, "lead generation for real estate agents" 83, "single property website(s)" ~80, "open house sign in sheet" 81. These are agent-intent queries, which matches the product; most are broad head terms where a young site ranks ~30+.
Not examined: full query-to-landing-page mapping; commercial vs homebuyer split beyond the top rows (top queries are all agent/commercial-intent); backlinks.
**Indexing:** 102 indexed, 86 not: 28 `noindex` (expected: ~10 noindexed articles plus listing/city pages), **38 crawled-not-indexed** (quality/priority signal; worth a URL-level look), 6 duplicate without user-selected canonical, 6 discovered-not-indexed, 3 other 4xx, 2 x 404, 2 redirects, 1 soft 404.
**404s found:** `/blog/best-lead-generation-tools-real-estate-agents` and `/blog/real-estate-leads-new-agents` (Google found the file-name versions; the real slugs are `...-tools-for-real-estate-agents` and `...-leads-for-new-agents`). Source does not link to the bad ones. Two targeted 301s would recover any link value: **needs approval** (redirect change).

## 3. Geographic review (bounded; nothing created, removed or redirected)
**Linked from the homepage/footer:**
| URL | Where linked | Audience | Real function? | Treatment now | Evidence |
|---|---|---|---|---|---|
| `/homes` | homepage resource card (**unconditional: defect**) and footer "Homes by City" (gated) | property visitors (homebuyers), not software buyers | Yes: a directory generated from real customers' published listings; currently **empty** ("No cities to show yet") | 200, `noindex, follow`, canonical self; not in the 88-URL sitemap; footer link hidden until a city has 3+ real listings | GSC: 0 clicks; city pages `/homes/raleigh-nc` 3 impressions in 90 days, now 404+noindex (no listings) |
| `/homes/<city>` | only from `/homes` | property visitors | Yes when 3+ real listings; otherwise 404/noindex | `noindex` under 3 listings, excluded from sitemap | no traffic |
No other geographic URLs are linked from the homepage or footer.

**Defect fixed (this PR):** the homepage resource card linked `/homes` even while the page is empty and `noindex`; the footer already followed the rule "link only once real customers have published listings" (commit 2cee358). The card now follows the same rule. No page, URL, redirect, canonical or indexing change.

**Geographic blog content (reached via /blog, not the footer):** `moving-to-raleigh-nc-guide` (Relocation, homebuyer/relocation intent), `how-to-sell-your-house-fast-in-raleigh-nc` (homeowner intent), `best-real-estate-marketing-ideas-raleigh-nc` (agents, geo-modified), and four market reports (Raleigh, Durham, Charlotte, Austin: already `noindex, follow`). Raleigh market report had 236 impressions / 0 clicks over 90 days before/while noindexed. These are **homeowner/buyer or generic market content, not software-marketing pages**; they are not city-swapped copies of each other (different cities and data) but they serve an audience ListingFlare doesn't sell to. Claims check (keyword scan, not a full read): no office, "local expert", "licensed in", MLS-compatibility or customer-result claims found; they carry only ListingFlare product mentions. Not verified: factual accuracy of the market statistics in the reports.

**Modifier research (New York, Miami, Los Angeles, Chicago; public web search 2026-11-12, US, no volumes available):** results are the same national vendors for every city (Luxury Presence, HubSpot, The Close, Rechat, AgentFire), plus a competitor (Mixo) running city-name-swapped template pages (the pattern to avoid), local web-design agencies (LA: custom builds), AI call-answering vendors (Miami), and MLS/IDX-specific vendors (Chicago MRED). City intent that does exist is about local services and **MLS/IDX integration, which ListingFlare does not offer** (no MLS pull, no IDX). No evidence of software-buying demand for city-modified queries that ListingFlare can serve distinctively.

**Recommendations:**
- `/homes` and `/homes/<city>`: **keep as a product function, de-emphasize until inventory exists** (done by the card gating); re-evaluate when a city reaches 3+ real listings. No removal, redirect or indexing change.
- Geographic blog posts: **keep as is for now** (noindex market reports stay noindex). Do not delete or merge without data; a later, evidence-based choice is to point their CTAs at property-site pages relevant to the reader or leave them informational. Needs the 38 crawled-not-indexed URL list before any consolidation decision.
- **No geographic expansion needed.** No geographic experiment recommended: no verified software-buying intent and no distinctive local value to offer.
- Navigation after any future removal: footer already keeps Blog, Templates, Pricing, Demo, About, comparison and product pages; nothing would be orphaned because `/homes` is only linked from the (now conditional) card and footer.

## 4. What was and was not covered (honest)
- Public pages: 15 routes, simulated 320/360/390/768/820/1024/1440 px (not physical devices); 320 px overflow fixed on 7 pages.
- Dashboard/demo: mocked Supabase, synthetic data, no production service touched; buyer showing-request flow exercised in a browser (mock), 4 observed steps in ~4.7 s of automation (not a human-time measurement, so no "5-minute" claim is supported).
- Not done in this round: full-page homepage buying-journey rewrite, full-text read of the 87 articles (7 deep, the rest scanned), performance lab/field measurement, keyboard/focus testing of every dialog, the full listing-creation walkthrough (needs real uploads/auth; not possible against the mock), custom-domain/white-label review. These need separate time; none is claimed as done.
- Lab vs field performance: not measured this round (no CrUX/PageSpeed key; GSC Core Web Vitals report exists in the property but was not read).
