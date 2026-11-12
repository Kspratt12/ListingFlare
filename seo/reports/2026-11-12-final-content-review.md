# Final content and search-appearance review (2026-11-12)

Live site, read-only. Scope: homepage, blog index, the main commercial landing page, pricing, demo, and all 87 published articles (94 URLs). Not a rewrite: only confirmed small issues were fixed.

## 1. What "reviewed" means here (labels are strict)
| Level | Count | Meaning |
|---|---|---|
| **Automated checks** | all 94 | HTTP status, indexing and canonical, title and description present and unique, H1 count, word count, image alt, internal and external link status, JSON-LD parses, Open Graph tags. A script: it does not judge accuracy or usefulness. |
| **Partial read** | 24 | A targeted claim scan, or (for the 7 landing pages) metadata, opening and key claims read. Specific claims were checked against product code or outside sources; the rest of the text was not read. |
| **Full editorial read** | 1 | `speed-to-lead-real-estate` read end to end. |
| Not read | 69 articles | Automated only. They are NOT accuracy-reviewed. |
Unverified-claim indicators in the table (percent / dollar / "according to" counts) are regex counts of things that would need verifying, not findings.

## 2. Automated results (all 94 URLs)
All return 200. No canonical mismatches, no duplicate titles or descriptions, no missing titles or descriptions, exactly one H1 per page, no broken internal links (128 targets), no broken images (127), JSON-LD valid on every page, Open Graph present. 10 articles are `noindex` by design (market reports, buying-vs-renting, third-party tool reviews). Title lengths 43-63 characters; no length rule was applied. External links: 49 checked; 1 real failure found (see below); `frase.io` timed out in the script but loads normally; a ManyChat partner link returns 403 to scripts only (affiliate link, bot handling).
`/demo` has two images with `alt=""`: intentional (decorative), not a defect.

## 3. Confirmed issues and what was fixed (this PR unless noted)
| Issue | Evidence | Fix |
|---|---|---|
| Schools link on every public listing page led to "no results" | Real-browser check: GreatSchools returns "did not find any results" for a full street address; a ZIP query loads | Link now uses ZIP (else city, state). Map, Walk Score and directions links take the full address and work, so unchanged. |
| "in minutes" in the landing page title, description and social tags, and one homepage benefit line | Unmeasured time claim (same class removed elsewhere) | Reworded without a time promise. |
| Absolute "ListingFlare is the only platform / builder with an AI chatbot" claims (8 sentences in two articles, including the page with the most impressions), plus unverified statements about every competitor ("every other platform relies on static forms", "captures leads every other platform misses", "within seconds", "significantly lower conversion rates") | A 2026-11-12 search shows at least four other vendors advertising AI on listing pages | Each sentence now states only what ListingFlare does and tells readers to compare current vendor features. |
| Articles materially edited today still showed old "updated" dates | `updated` feeds the visible date, JSON-LD `dateModified` and the sitemap | Set to 2026-11-12 on the 4 edited articles. |
Earlier in this assignment (already live): trial/ROI/guarantee copy, calculator, price tables from vendor pages, lead-is-not-a-closing paragraph, custom-domain claim, 404 redirects, listing-form accessibility.
**Checked and fine (no change needed):** the visible byline ("Written by Kelvin Spratt") matches the JSON-LD author; `/about` states the founder role; no ratings or reviews are invented in structured data; every article links to a product or landing page (no article lacks a next step).

## 4. Homepage and landing-page intent
Published: homepage title "ListingFlare: Single Property Websites & AI Lead Capture", H1 "Real Estate Software for Listing Agents / Last night, a buyer asked about your listing. You lost them."; landing page "Single Property Website Builder for Agents | ListingFlare". The two pages have different jobs (broad product vs the "single property website builder" term) and different openings. **No keyword-cannibalization is demonstrated**: Search Console shows the homepage with 2 clicks / 122 impressions, and for queries containing "single property website" (296 impressions, 0 clicks, position about 33.5) Google surfaces blog articles (roundup 243 impressions, Zillow-showcase comparison 79, template 31), not either commercial page. I could not retrieve the landing page's own Search Console rows (the browser tab stuck on the previous filter): **unretrieved**.
Demonstrated gaps only: (a) the unmeasured "in minutes" wording (fixed); (b) the competitive AI claims (fixed in articles; commercial pages already avoid "only"). The H1 opener is rhetorical, not a product claim; left as is. Recently corrected pricing, trial and privacy copy was not touched.

## 5. Search appearance (three things kept separate)
- **Published metadata** (raw HTML = rendered, verified): unique titles and descriptions, self canonicals, Open Graph, JSON-LD (Organization, WebSite, SoftwareApplication, FAQPage on the homepage; BreadcrumbList and FAQPage on landing pages; BlogPosting with the real author on articles; CollectionPage on the blog index).
- **Simulated preview:** none generated as evidence; Google may rewrite titles and snippets, and no exact title or description is promised.
- **Observed in search:** query "listingflare.com single property websites AI lead capture", 2026-11-12, US, one search via the available web-search tool: **no listingflare.com result appeared** among 17 results; competitors with AI on listings did. Branded impressions in Search Console are negligible (32 in 28 days). No snippet of our pages was observed, so nothing is claimed about how they display.
- **Structured data:** FAQPage rich results are not expected for most commercial sites and are not promised; SoftwareApplication carries no ratings (verified by an existing test); BlogPosting author is accurate.

## 6. Recommendations (at most five, by evidence and value; none implemented without approval)
1. **Confirm the landing page is indexed and see which queries it gets** (URL Inspection plus its own Search Console rows). Evidence: head-term impressions go to articles, not the landing page. Effort: minutes. Dependency: owner Search Console access (available). Decide any change only after this.
2. **Add a short "what the AI does and does not do" block to the landing page** (answers only from entered details, can be wrong if details are incomplete, no MLS/IDX, no custom domain), keeping the differentiation honest now that rivals advertise AI. Evidence: the SERP check and your own limits list. Needs approval (new section).
3. **Verify or date the statistics in indexable homeowner and market articles** (`how-to-sell-your-house-fast-in-raleigh-nc` 15 percent claims, `first-time-home-sellers-guide` 14, `moving-to-raleigh-nc-guide` 9), or soften them. Evidence: claim indicators; stale-statistics risk. Effort: medium, specialist.
4. **Do not rewrite or delete the 38 crawled-not-indexed pages yet.** Sample read: 2 homeowner articles, 5 broad agent how-to guides (overlap with the roundup and landing page topics), a template download and 2 CSS files (assets, not an SEO problem). Re-check indexing in 28 days; consider consolidating overlapping guides only if still unindexed and clearly duplicative. Needs approval for any change.
5. **Add a recheck cadence for price-comparison articles** (vendor prices carry an as-of date; re-verify quarterly). Evidence: Rela, CribFlyer and SinglePropertySites all differed from earlier text. Low effort.

## 7. Specialist-verification gaps (exact claims, not patched)
- `speed-to-lead-real-estate`: "About half of buyers say they found the home they bought online (NAR Profile of Home Buyers and Sellers)": 43% (2013), 51% (2016), 50% (2018) are the editions I could confirm; the **current edition's figure is unverified** and the sentence names no year.
- Another article cites "NAR's 2025 report, 97% of home buyers use the internet during their search": 97% is what I found for the **2020** edition; the 2025 figure is unverified.
- "About 7 percent of home sales are true FSBO" and "FSBO homes often sell for less" (NAR): edition and figure unverified.
- Market statistics in the Raleigh, Durham, Charlotte and Austin reports and the Raleigh guides (many percent figures): not verified; reports are `noindex`.
- Third-party tool reviews (ElevenLabs, ManyChat, Descript, Surfer, Restream and others): pricing and feature statements not re-verified; the ManyChat page uses an affiliate link.
- Rela's pricing was read from its own page, but I could not tell whether the annual or monthly toggle was selected; CribFlyer and SinglePropertySites were read once via an extractor.

## 8. Measurement plan (use real data, then stop auditing)
- **Search Console, weekly, same-length windows:** clicks, impressions, position for the 10 target pages (homepage, landing, roundup, speed-to-lead, lead-tools, Zillow comparison, template, pricing, demo, lead-capture page); branded vs non-branded queries; the 38 crawled-not-indexed URLs (indexed count) and the two redirected URLs.
- **Product use (needs events; verify what exists first):** signups, first listing created, first listing **published**, first lead received, first showing request, trial-to-paid conversion. The first-published-listing step is the key activation metric; today's data does not show it.
- **Review in 28 days** against the baseline here (latest 28 days: 20 clicks, 8.81K impressions, position 35.7; 103 pages with impressions; 102 indexed, 86 not).

## 9. Coverage checklist (every URL)
| URL | HTTP | Indexing | Canonical | Title chars | Desc chars | H1 | Words | Internal links / broken | Img alt gaps | Product CTA link | Claim indicators (not verified) | Review level |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | index | self | 56 | 169 | 1 | 2447 | 20/0 | ok | - |  | partial (metadata + opening + key claims read) |
| `/blog` | 200 | index | self | 61 | 150 | 1 | 3853 | 97/0 | ok | - |  | partial (metadata + opening + key claims read) |
| `/single-property-website-builder` | 200 | index | self | 57 | 137 | 1 | 739 | 19/0 | ok | - |  | partial (metadata + opening + key claims read) |
| `/real-estate-lead-capture-software` | 200 | index | self | 59 | 146 | 1 | 801 | 18/0 | ok | - |  | partial (metadata + opening + key claims read) |
| `/real-estate-ai-chatbot` | 200 | index | self | 57 | 150 | 1 | 685 | 17/0 | ok | - |  | partial (metadata + opening + key claims read) |
| `/pricing` | 200 | index | self | 59 | 165 | 1 | 837 | 6/0 | ok | - |  | partial (metadata + opening + key claims read) |
| `/demo` | 200 | index | self | 45 | 159 | 1 | 732 | 10/0 | 2/14 | - |  | partial (metadata + opening + key claims read) |
| `/blog/after-hours-real-estate-leads` | 200 | index | self | 53 | 159 | 1 | 1583 | 20/0 | ok | yes | pct:0 $:0 src:1 | automated only |
| `/blog/ai-chatbot-fair-housing-compliance-real-estate` | 200 | index | self | 59 | 159 | 1 | 1230 | 15/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/ai-for-real-estate-agents` | 200 | index | self | 49 | 150 | 1 | 4910 | 27/0 | ok | yes | pct:0 $:11 src:1 | automated only |
| `/blog/ai-real-estate-chatbot-vs-virtual-assistant` | 200 | index | self | 56 | 151 | 1 | 1680 | 20/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/aragon-ai-review-real-estate-agents` | 200 | noindex (intended) | self | 51 | 141 | 1 | 4327 | 14/0 | ok | yes | pct:2 $:27 src:2 | automated only |
| `/blog/austin-tx-housing-market-2026` | 200 | noindex (intended) | self | 56 | 147 | 1 | 2883 | 15/0 | ok | yes | pct:18 $:31 src:0 | partial (targeted claim scan) |
| `/blog/best-ai-isa-tools-real-estate` | 200 | index | self | 47 | 142 | 1 | 6434 | 18/0 | ok | yes | pct:0 $:62 src:3 | automated only |
| `/blog/best-ai-tools-for-realtors` | 200 | index | self | 54 | 144 | 1 | 4334 | 18/0 | ok | yes | pct:0 $:39 src:0 | automated only |
| `/blog/best-ai-tools-real-estate-marketing` | 200 | index | self | 49 | 155 | 1 | 4876 | 24/0 | ok | yes | pct:0 $:53 src:0 | automated only |
| `/blog/best-ai-virtual-staging-software` | 200 | index | self | 54 | 158 | 1 | 4722 | 15/0 | ok | yes | pct:0 $:36 src:1 | automated only |
| `/blog/best-crm-for-solo-real-estate-agents` | 200 | index | self | 59 | 155 | 1 | 1605 | 18/0 | ok | yes | pct:0 $:9 src:0 | automated only |
| `/blog/best-lead-generation-for-realtors` | 200 | index | self | 52 | 150 | 1 | 4895 | 22/0 | ok | yes | pct:5 $:64 src:1 | partial (targeted claim scan) |
| `/blog/best-lead-generation-tools-for-real-estate-agents` | 200 | index | self | 57 | 153 | 1 | 3477 | 17/0 | ok | yes | pct:2 $:24 src:0 | automated only |
| `/blog/best-open-house-apps` | 200 | index | self | 56 | 151 | 1 | 1626 | 20/0 | ok | yes | pct:0 $:5 src:0 | automated only |
| `/blog/best-real-estate-chatbots` | 200 | index | self | 59 | 152 | 1 | 1723 | 18/0 | ok | yes | pct:0 $:1 src:0 | automated only |
| `/blog/best-real-estate-marketing-ideas-raleigh-nc` | 200 | index | self | 49 | 144 | 1 | 2922 | 16/0 | ok | yes | pct:2 $:12 src:0 | partial (targeted claim scan) |
| `/blog/best-real-estate-software-for-listing-agents` | 200 | index | self | 51 | 152 | 1 | 1647 | 26/0 | ok | yes | pct:0 $:1 src:0 | automated only |
| `/blog/best-rela-alternatives-single-property-websites` | 200 | index | self | 51 | 144 | 1 | 4491 | 22/0 | ok | yes | pct:2 $:28 src:1 | partial (targeted claim scan) |
| `/blog/best-showing-scheduling-software-real-estate` | 200 | index | self | 55 | 146 | 1 | 1670 | 17/0 | ok | yes | pct:0 $:0 src:0 | partial (targeted claim scan) |
| `/blog/best-single-property-website-builders` | 200 | index | self | 46 | 145 | 1 | 6693 | 32/0 | ok | yes | pct:1 $:49 src:0 | partial (targeted claim scan) |
| `/blog/buying-vs-renting-a-home-2026` | 200 | noindex (intended) | self | 57 | 146 | 1 | 3391 | 15/0 | ok | yes | pct:30 $:51 src:0 | automated only |
| `/blog/castmagic-review-real-estate-agents` | 200 | noindex (intended) | self | 46 | 149 | 1 | 4120 | 14/0 | ok | yes | pct:0 $:34 src:3 | automated only |
| `/blog/charlotte-nc-housing-market-2026` | 200 | noindex (intended) | self | 59 | 169 | 1 | 2882 | 15/0 | ok | yes | pct:22 $:18 src:0 | partial (targeted claim scan) |
| `/blog/cribflyer-vs-rela-vs-listingflare` | 200 | index | self | 52 | 154 | 1 | 4332 | 19/0 | ok | yes | pct:3 $:40 src:0 | partial (targeted claim scan) |
| `/blog/descript-ai-review-real-estate-agents` | 200 | noindex (intended) | self | 48 | 152 | 1 | 5312 | 15/0 | ok | yes | pct:6 $:29 src:0 | automated only |
| `/blog/durham-nc-housing-market-2026` | 200 | noindex (intended) | self | 60 | 157 | 1 | 2323 | 16/0 | ok | yes | pct:15 $:31 src:0 | partial (targeted claim scan) |
| `/blog/elevenlabs-review-real-estate-agents` | 200 | index | self | 47 | 148 | 1 | 4980 | 16/0 | ok | yes | pct:0 $:38 src:0 | partial (targeted claim scan) |
| `/blog/first-time-home-sellers-guide` | 200 | index | self | 51 | 143 | 1 | 3328 | 16/0 | ok | yes | pct:14 $:19 src:4 | partial (targeted claim scan) |
| `/blog/follow-up-boss-alternatives` | 200 | index | self | 53 | 152 | 1 | 6176 | 20/0 | ok | yes | pct:0 $:34 src:1 | automated only |
| `/blog/free-real-estate-website-options` | 200 | index | self | 43 | 143 | 1 | 1370 | 17/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/home-staging-tips-to-sell-your-house-faster` | 200 | index | self | 43 | 155 | 1 | 3003 | 14/0 | ok | yes | pct:5 $:8 src:0 | automated only |
| `/blog/how-listing-agents-capture-buyer-leads` | 200 | index | self | 54 | 151 | 1 | 5853 | 16/0 | ok | yes | pct:0 $:42 src:1 | automated only |
| `/blog/how-much-does-it-cost-to-sell-a-house` | 200 | index | self | 45 | 145 | 1 | 2800 | 14/0 | ok | yes | pct:3 $:55 src:0 | automated only |
| `/blog/how-to-choose-a-real-estate-agent` | 200 | index | self | 53 | 154 | 1 | 3052 | 14/0 | ok | yes | pct:3 $:2 src:1 | automated only |
| `/blog/how-to-create-a-single-property-website` | 200 | index | self | 52 | 149 | 1 | 2940 | 24/0 | ok | yes | pct:1 $:6 src:0 | automated only |
| `/blog/how-to-get-leads-as-a-real-estate-agent` | 200 | index | self | 54 | 141 | 1 | 3455 | 22/0 | ok | yes | pct:0 $:0 src:2 | automated only |
| `/blog/how-to-get-more-showings` | 200 | index | self | 47 | 145 | 1 | 1617 | 24/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/how-to-market-a-real-estate-listing` | 200 | index | self | 50 | 149 | 1 | 3274 | 24/0 | ok | yes | pct:1 $:23 src:0 | automated only |
| `/blog/how-to-respond-to-real-estate-leads` | 200 | index | self | 57 | 153 | 1 | 1409 | 20/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/how-to-sell-your-house-fast-in-raleigh-nc` | 200 | index | self | 50 | 145 | 1 | 3054 | 15/0 | ok | yes | pct:15 $:17 src:0 | automated only |
| `/blog/how-to-stop-losing-leads-to-zillow` | 200 | index | self | 54 | 140 | 1 | 3929 | 23/0 | ok | yes | pct:0 $:35 src:0 | partial (targeted claim scan) |
| `/blog/how-to-win-more-listings-as-a-real-estate-agent` | 200 | index | self | 47 | 144 | 1 | 4127 | 20/0 | ok | yes | pct:0 $:0 src:3 | automated only |
| `/blog/how-zillow-steals-leads-from-listing-agents` | 200 | index | self | 43 | 152 | 1 | 1641 | 26/0 | ok | yes | pct:5 $:0 src:0 | automated only |
| `/blog/lead-scoring-criteria-real-estate-agents` | 200 | index | self | 44 | 143 | 1 | 2910 | 18/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/listing-faq-questions-buyers-ask` | 200 | index | self | 54 | 156 | 1 | 1663 | 21/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/listing-marketing-plan-template` | 200 | index | self | 49 | 147 | 1 | 1194 | 19/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/listing-page-analytics-what-to-track` | 200 | index | self | 48 | 155 | 1 | 1535 | 18/0 | ok | yes | pct:2 $:0 src:0 | automated only |
| `/blog/listingflare-review` | 200 | index | self | 58 | 145 | 1 | 1323 | 20/0 | ok | yes | pct:0 $:2 src:0 | partial (targeted claim scan) |
| `/blog/listings-to-leads-alternatives` | 200 | index | self | 57 | 153 | 1 | 4220 | 14/0 | ok | yes | pct:0 $:20 src:0 | automated only |
| `/blog/lofty-alternatives-solo-listing-agents` | 200 | index | self | 49 | 150 | 1 | 1471 | 24/0 | ok | yes | pct:0 $:8 src:0 | automated only |
| `/blog/manychat-review-real-estate-agents` | 200 | index | self | 45 | 152 | 1 | 4676 | 16/0 | ok | yes | pct:0 $:12 src:0 | partial (targeted claim scan) |
| `/blog/moving-to-raleigh-nc-guide` | 200 | index | self | 52 | 146 | 1 | 3850 | 15/0 | ok | yes | pct:9 $:33 src:0 | partial (targeted claim scan) |
| `/blog/open-house-checklist` | 200 | index | self | 56 | 157 | 1 | 1092 | 20/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/open-house-flyer-generator` | 200 | index | self | 49 | 150 | 1 | 1576 | 21/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/open-house-follow-up` | 200 | index | self | 59 | 140 | 1 | 1362 | 18/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/open-house-ideas-to-attract-more-buyers` | 200 | index | self | 54 | 153 | 1 | 2655 | 20/0 | ok | yes | pct:1 $:2 src:0 | automated only |
| `/blog/open-house-sign-in-sheet-template` | 200 | index | self | 54 | 150 | 1 | 1146 | 17/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/open-house-sign-in-sheet-vs-qr-code` | 200 | index | self | 53 | 142 | 1 | 1515 | 23/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/pre-listing-checklist` | 200 | index | self | 49 | 150 | 1 | 1047 | 23/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/propertysimple-alternatives` | 200 | index | self | 55 | 143 | 1 | 3361 | 14/0 | ok | yes | pct:0 $:25 src:0 | automated only |
| `/blog/raleigh-nc-housing-market-2026` | 200 | noindex (intended) | self | 63 | 165 | 1 | 2543 | 16/0 | ok | yes | pct:29 $:17 src:0 | partial (targeted claim scan) |
| `/blog/real-estate-agent-website-examples` | 200 | index | self | 48 | 144 | 1 | 2487 | 18/0 | ok | yes | pct:0 $:0 src:1 | automated only |
| `/blog/real-estate-lead-capture-form-best-practices` | 200 | index | self | 48 | 152 | 1 | 1589 | 21/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/real-estate-lead-conversion-rate` | 200 | index | self | 55 | 147 | 1 | 1584 | 21/0 | ok | yes | pct:4 $:8 src:0 | automated only |
| `/blog/real-estate-lead-follow-up-sequence` | 200 | index | self | 52 | 149 | 1 | 1375 | 20/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/real-estate-lead-generation` | 200 | index | self | 53 | 143 | 1 | 5641 | 22/0 | ok | yes | pct:0 $:34 src:1 | automated only |
| `/blog/real-estate-lead-magnet-ideas` | 200 | index | self | 53 | 156 | 1 | 1456 | 22/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/real-estate-lead-nurture-campaign` | 200 | index | self | 57 | 153 | 1 | 1658 | 20/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/real-estate-leads-for-new-agents` | 200 | index | self | 53 | 148 | 1 | 3475 | 17/0 | ok | yes | pct:2 $:4 src:0 | automated only |
| `/blog/real-estate-listing-description-examples` | 200 | index | self | 54 | 145 | 1 | 3926 | 18/0 | ok | yes | pct:0 $:3 src:0 | automated only |
| `/blog/real-estate-listing-page-checklist` | 200 | index | self | 52 | 144 | 1 | 1662 | 24/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/real-estate-listing-presentation-outline` | 200 | index | self | 49 | 142 | 1 | 1484 | 20/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/real-estate-listing-presentation-template` | 200 | index | self | 59 | 157 | 1 | 1342 | 18/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/real-estate-social-media-post-ideas` | 200 | index | self | 48 | 155 | 1 | 3537 | 18/0 | ok | yes | pct:2 $:4 src:0 | automated only |
| `/blog/real-estate-text-message-rules-tcpa-can-spam` | 200 | index | self | 51 | 160 | 1 | 1349 | 14/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/real-estate-yard-sign-qr-code` | 200 | index | self | 55 | 150 | 1 | 1230 | 16/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/restream-review-real-estate-agents` | 200 | noindex (intended) | self | 45 | 151 | 1 | 4432 | 13/0 | ok | yes | pct:3 $:25 src:0 | automated only |
| `/blog/seller-price-reduction-scripts` | 200 | index | self | 57 | 159 | 1 | 1349 | 18/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/seller-update-report-template` | 200 | index | self | 58 | 143 | 1 | 1214 | 21/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/single-property-website-cost` | 200 | index | self | 52 | 157 | 1 | 1540 | 19/0 | ok | yes | pct:0 $:23 src:1 | partial (targeted claim scan) |
| `/blog/single-property-website-template` | 200 | index | self | 56 | 158 | 1 | 1375 | 20/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/single-property-website-vs-zillow-showcase` | 200 | index | self | 49 | 153 | 1 | 1752 | 20/0 | ok | yes | pct:0 $:0 src:0 | automated only |
| `/blog/speed-to-lead-real-estate` | 200 | index | self | 56 | 158 | 1 | 1691 | 17/0 | ok | yes | pct:0 $:0 src:3 | FULL read |
| `/blog/surfer-seo-review-real-estate-agents` | 200 | noindex (intended) | self | 47 | 153 | 1 | 5238 | 15/0 | ok | yes | pct:0 $:31 src:0 | automated only |
| `/blog/trainual-review-real-estate-brokerages` | 200 | index | self | 54 | 144 | 1 | 4602 | 14/0 | ok | yes | pct:4 $:1 src:1 | automated only |
| `/blog/what-not-to-fix-when-selling-a-house` | 200 | index | self | 48 | 148 | 1 | 2720 | 13/0 | ok | yes | pct:2 $:22 src:0 | automated only |
| `/blog/zillow-premier-agent-cost-alternatives` | 200 | index | self | 57 | 149 | 1 | 1448 | 22/0 | ok | yes | pct:3 $:5 src:1 | automated only |
