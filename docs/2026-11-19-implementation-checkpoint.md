# Implementation checkpoint, 2026-11-19

Local changes only, on branch `feature/listing-workflow-integrity`. Nothing was pushed, deployed,
migrated, emailed or sent to a paid API.

## Verification performed (local)

- `npx tsc --noEmit`: clean. `npm test`: 603/603 pass. `next lint`: no warnings in changed files.
  `npm run build` with CI's inert placeholder environment: succeeds.
- Runtime: the production build (`next start`) was exercised over HTTP against a local fake Supabase
  (PostgREST + auth) and a fake Anthropic endpoint with fictional fixtures (`ANTHROPIC_BASE_URL`
  pointed locally; no provider keys set). 55 checks covering visibility, owner preview, More listings,
  unbranded page (including the serialized page props), agent page, chat context freshness and access,
  seller report and flyer API. This run found and fixed one defect: the unbranded page serialized the
  full agent profile into the page source.
- Not verified: real Supabase/RLS behaviour, migration 045 on a real database, real AI answers,
  browser interaction (no browser tool was available: the editor, settings switch, flyer editor and
  print layout were not clicked through), mobile devices, printing.

## Implemented (local)

| Area | What changed |
| --- | --- |
| Save integrity | "Save Changes" keeps the current status (it used to turn Coming Soon / Pending / Closed listings back into drafts, taking the page down). Saves verify that a row was actually updated. The editor stays on the page and shows Saving / Unsaved changes / Saved (time) and the live link with a copy button. A status selector is available for any non-draft listing, including "Draft (unpublish)". |
| Owner preview | Drafts and archived listings open as a private, noindexed preview for the signed-in owner (banner + "Back to editing"); everyone else gets not-found; no views counted. Editor shows a Preview button for non-public listings and warns that the preview reflects the last save. |
| AI assistant | Context is built on the server from the saved listing (`lib/listingAiContext.ts`, `lib/chatRun.ts`). Previously the browser sent the facts, so saved HOA/tax/school/system fields never reached the assistant and anyone could post arbitrary "listing" text. Status, per-listing chat toggle and account activity are enforced server-side. Prompt: answer only from facts, say "I don't have that" otherwise, never confirm showings/offers. |
| AI knowledge / private notes | New buyer-facing "Extra details the assistant may share" field (`listings.ai_knowledge`) and owner-only "Private notes" (`listing_private_notes` table, owner RLS, never selected by the chat route). |
| Test isolation | The owner viewing their own listing gets the chat in test mode: banner, no lead capture, nothing counted or sent. Views and hot-visitor alerts already skipped the owner. |
| More listings from this agent | Opt-in (Settings, default off). Server-selected, this agent only, published / coming soon / pending, never the current listing; links to the agent page. Replaced the old browser query that used the public key. |
| Agent page | Hides listings when the agent's trial has expired (matches listing pages), shows coming-soon/pending with badges, adds "Recently sold", empty state, noindex for inactive/demo agents. |
| Unbranded URL | `/listing/<slug>/unbranded`: facts, photos, video, tour only; no agent identity, lead forms, chat or cross-links; noindex with canonical to the main page; not counted in views. |
| Flyers | One customizable flyer editor used by both the dashboard and the editor: Classic / Modern / Minimal layouts, brand or preset colors, headline presets, date + start/end time, short message, show/hide description, features, headshot, QR to listing page (`?src=flyer`) or open-house sign-in. Blank facts are never printed as 0. Choices remembered per listing in the browser. The old HTML flyer route (unescaped values, `0 Bed • 0 Bath`) was removed. |
| Seller report | Rebuilt on `lib/sellerReport.ts`: 7/14/30-day period with dates, per-metric definitions, declined/canceled showings excluded, truthful zero/not-live states, only automations that are actually on, no buyer identities. Removed the "This week" views figure (it was a lifetime average), "qualified inquiries", "every buyer was captured", and unconditional day-1/3/7 and calendar claims. |
| Custom domains | Validation + ownership state machine + disabled Settings card + prepared (not-to-run) migration 046 + `docs/custom-domains.md`. Nothing connects a domain. |
| Content | Open House Flyer Generator / Template articles updated to match the new flyer options; chat copy in the editor no longer says chats "turn into leads automatically". |

## Roadmap status

| # | Item | Status | Reason / next step |
| --- | --- | --- | --- |
| 1 | Two-way AI SMS + yard-sign codes | **Removed from scope** (2026-11-19) | Not built. Existing click-to-text links are unchanged. |
| 2 | MLS / property-record import | **Blocked** | No authorized feed or vendor agreement. Each MLS licenses data separately; photo/data redistribution rights cannot be assumed. Existing "auto-fill from URL / MLS description" (`/api/ai/extract-listing`) remains agent-reviewed input. |
| 3 | Seller report cards | **Partial** | Preview, real metrics, periods, definitions, zero states done. Scheduled sending and recipient controls not built: they would send real email and need approval. |
| 4 | Unbranded property URLs | **Complete (local)** | Agent must still check their MLS's rules. |
| 5 | CRM / calendar | **Partial (pre-existing)** | Google Calendar exists. No CRM connector added; would need provider API access. |
| 6 | Custom domains | **Partial / disabled** | See `docs/custom-domains.md`. |
| 7 | Controlled document sharing | **Partial (pre-existing)** | `LeadDocuments` + signed URLs exist for per-lead sharing; not reviewed or changed here. |
| 8 | Floor plans / 3D tours | **Partial (pre-existing)** | Validated tour embeds exist (`lib/tourUrl.ts`). Interactive floor plans: deferred. |
| 9 | Social / print marketing kit | **Partial** | Flyer customization done; social captions/posts pre-existing. |
| 10 | Starter / pay-per-listing pricing | **Proposal only** | Below. Not implemented; no billing or entitlement changes. |

## Pricing proposal (not approved, not implemented)

Observed today: 14-day trial (1 listing, 5 photos) then $150/month for unlimited listings (`lib/subscription.ts`, `/pricing`).

- **Starter**: lower monthly price, a small listing cap (e.g. 2 active), same AI chat and lead capture.
- **Pay per listing**: one-time fee per listing for a fixed live period (e.g. 90 days), renewable, for part-time agents.
- **Pro**: current $150/month unlimited plan.

Open questions before any build: price points, what happens at the end of a pay-per-listing period
(proposal: page goes to the inactive screen, data kept), Stripe products and webhook handling, and how
the entitlement module (`lib/entitlements.ts`) and the existing trial copy change. No numbers here are
based on customer or market data.

## Search Console / Keyword Planner

No Search Console or Google Ads tool was available in this session, so no query, impression or CTR data
was read. Content changes were limited to aligning two existing flyer articles with implemented features.

## Migrations prepared (none applied)

- `supabase-migration-045-agent-site-and-ai-knowledge.sql` (+ `-ROLLBACK.sql`): `show_other_listings`
  (with the column UPDATE grant `agent_profiles` needs), `listings.ai_knowledge` (≤ 4000 chars),
  `listing_private_notes` (owner-only RLS). The app tolerates it being absent.
- `supabase-migration-046-custom-domains-NOT-RUN.sql`: do not run until custom domains are approved.

## Release checklist

1. Open a PR from `feature/listing-workflow-integrity` and let `.github/workflows/test.yml` re-run type-check, tests and build (all passed locally).
2. Review and apply migration 045 to the intended Supabase project only; run the checks at the bottom of the file and `node scripts/check-public-access.mjs` (`listing_private_notes` must be unreadable anonymously).
3. Deploy, then with a test account and a fictional listing:
   - Pending listing → edit → Save Changes → still Pending and publicly visible.
   - Draft → Preview while signed in (banner) and signed out / another account (not found).
   - Edit HOA fee → Save → ask the chat about HOA on the public page (owner: test-mode banner, no lead).
   - Settings → Show my other listings → a second published listing appears under the first; drafts do not.
   - `/listing/<slug>/unbranded` shows no agent name, contact, forms or chat.
   - Flyer: each layout, both QR targets (scan with a phone), print to PDF.
   - Seller report: 7/14/30 days, zero-state listing.
4. Rollback: redeploy the previous build. Migration 045 can stay (old code ignores the new columns/table); only run its rollback if removing the data is intended.
