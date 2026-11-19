# Implementation checkpoint (branch `feature/listing-workflow-integrity`)

Local commits only. Nothing has been pushed, deployed or migrated, and no real email, AI, Vercel or
Supabase call has been made.

## Feature status

| Feature | Status | Switch |
| --- | --- | --- |
| Save keeps status; zero-row saves reported; saved/unsaved state; live link + copy | Done | always on |
| Owner-only draft/archived preview (noindex, no views counted) | Done | always on |
| AI chat answers from the saved listing; status/toggle/account enforced; owner test mode | Done | always on |
| Buyer-facing extra AI details; owner-only private notes | Done | needs migration 045 |
| "More listings from this agent" (opt-in); agent page fixes | Done | needs 045; off per agent by default |
| Flyer editor: 3 layouts, colors, headline/date/time/message, QR to listing or sign-in | Done | always on |
| Unbranded page: no agent identity in HTML, props or media URLs | Done | always on |
| Seller report with periods, definitions, zero states | Done | always on |
| **Scheduled seller reports** | Done locally | needs 047 + `SELLER_REPORTS_ENABLED=1` + a scheduler |
| **Interactive floor plans** | Done locally | needs 048 (section hidden until then) |
| **Bring-your-own domains** | Done locally (mocked provider) | needs 046 + `CUSTOM_DOMAINS_ENABLED=1` + Vercel credentials |
| Profile column-grant hardening | Prepared | migration 049 (compare with production grants first) |
| Two-way SMS, MLS import, CRM, pricing | Out of scope | — |

Docs: `docs/scheduled-seller-reports.md`, `docs/custom-domains.md`.

## Verification performed (local, fictional data)

- `npx tsc --noEmit`: clean.
- `npm test`: **637/637 pass**. This includes new tests for scheduling (time zones/DST, duplicate and
  overlapping runs, retries, skips, email escaping), floor plans (sanitizing, responsive coordinates,
  file sniffing, rendered viewer), domains (routing, header trust, claim conflicts, provider failures,
  Vercel adapter against a mocked fetch) and the earlier workflow fixes.
- `next lint`: no warnings in changed files. `npm run build` succeeds.
- **Database** (`scripts/local-verify/db-verify.mjs`): PGlite (Postgres in WASM) with a Supabase role/auth
  shim. All repo migrations replay in order; a test-only `gen_random_bytes` stand-in is used because
  PGlite has no pgcrypto. **69/69 checks** cover anon/owner/other-agent/service access for 045-049,
  unique claims, constraints, the resolver function, old-code compatibility and all four rollbacks.
  This is not a real Supabase project: PostgREST, Auth, Storage policies and production's manual grants
  are not exercised.
- **Browser** (`scripts/local-verify/walkthrough.mjs`): real Chromium (Playwright) against the production
  build and a stateful fake backend, at 1280px and 390px. **67/68 pass.** The one failure is the
  pre-existing Google Maps embed on listing pages making a request; the harness blocks all external
  requests. Covered: edit/save feedback, zero-row error, status preservation (pending/coming
  soon/closed), draft preview and denial, keyboard settings toggle, More listings, agent page, unbranded
  source, floor-plan upload/markers/keyboard/mobile tap, all flyer layouts and both QR targets, print PDF
  (1 Letter page), report periods and zero state, scheduled report preview → enable → cron run (sent once,
  idempotency key, no buyer data) → pause, owner chat test mode (no lead), and domain connect → DNS
  records → copy → rate-limited recheck → other-agent rejection → connected → serving `/` and own
  listings only → dashboard 308 redirect (not followed) → remove. Screenshots and the print PDF are in
  `C:\Users\kelvink\tools\browsertest\evidence\`; results are in `scripts/local-verify/last-walkthrough-results.txt`.
- Fixes found by verification: the unbranded page leaked agent identity, first through serialized props
  and then through storage URLs containing the account id (now served through a media route); report and
  domain controls inside the editor/Settings forms (unsaved flag, Enter key).

**Not verified:** a real phone, real QR scanning, physical printing, live AI answers, real email
delivery, a real Vercel domain/DNS/certificate, real Supabase RLS and Storage, and the production schema's
existing grants.

## Release checks on real infrastructure (2026-11-19)

- **Vercel (read via API):** team `kelvin-spratts-projects` (Pro), project `listing-flare`
  (`prj_qklauYeqRnRTkzcom89iDpVdB4ge`) → https://www.listingflare.com. Connected to GitHub
  `Kspratt12/ListingFlare`; production branch `main`; every pushed branch creates a Preview. Previews sit
  behind Vercel sign-in. There are no deploy hooks; the existing two crons run only in Production.
- **Preview isolation:** the shared Supabase, Resend, Anthropic and `CRON_SECRET` variables cover
  production, preview and development. For `feature/listing-workflow-integrity` only, branch-scoped
  Preview overrides point Supabase at an unreachable address and give Resend/Anthropic/`CRON_SECRET`
  inert values. Shared and Production entries are unchanged. The Preview of this branch therefore
  cannot reach production services (and its database-backed pages do not work).
- **GitHub:** `main` requires a PR plus passing `test` (Actions) and `Vercel` checks; 0 reviews required.
- **Production permissions (catalog-only, project `pvnsirpfofxklqgxwdiz`):**
  - `authenticated` can UPDATE only `name`, `brand_color`, `ai_approval_mode` among the checked
    `agent_profiles` columns.
  - `subscription_status`, `trial_ends_at`, `stripe_customer_id`, `stripe_subscription_id`,
    `complimentary_access`, `setup_fee_paid` and `google_refresh_token` are not updatable by `anon` or
    `authenticated`.
  - RLS is on and the policy is owner-only; there are no triggers.
  - None of the objects from 045-048 exist yet.
  - `listings` has table-level UPDATE/INSERT for both roles, with RLS deciding rows.
  - **Migration 049 is not needed in production** and is not applied: its revoke-then-grant could remove
    other existing column grants.
- **Real-Supabase test project: not created.** The Supabase organization is on the Pro plan, so an
  extra project would be billed. Creating a separate free organization was refused by the tool's
  permission check as outside the explicit authorization. Real-Supabase RLS behaviour for the new
  tables therefore remains verified only locally (PGlite + shim) plus the production catalog checks.

## Pre-existing finding (not caused by this work)

On a database built from the repo's migrations alone, a signed-in agent can update their own
`subscription_status`, `trial_ends_at`, `stripe_customer_id` and `complimentary_access` with the public
key. Migration 044 records that production was checked on 2026-11-13 and restricts this with grants that
are not in the repo. Migration 049 writes the restriction down; run the query in its header against
production before applying it.

## Migrations (none applied anywhere)

Order: **045 → 046 → 047 → 048** (049 optional, after review). Each has a `-ROLLBACK.sql`. The previous
app version keeps working with all of them applied (tested); the new app keeps working without them
(features stay hidden or report "needs the latest database update").

## Release consequences (from the repo's own configuration)

- `.github/workflows/test.yml` runs on pull requests and on pushes to `main` (type-check, tests, build;
  no secrets).
- Production is served by Vercel (`Server: Vercel`). `next.config.mjs` redirects `listing-flare.vercel.app`,
  which suggests the project is named `listing-flare`. The Git integration settings (which branches
  deploy, whether previews share production env vars) could not be read: there is no Vercel CLI or token
  here and the GitHub CLI is not signed in. Assume pushing a branch creates a Preview deployment, and that
  Preview uses production Supabase/Resend/Anthropic unless proven otherwise.
- The production Supabase host referenced in `next.config.mjs` is `pvnsirpfofxklqgxwdiz.supabase.co`.
- `vercel.json` is unchanged, so this release adds no cron.

## Rollback / disable

- Code: redeploy the previous production deployment in Vercel, or revert the merge commit.
- Scheduled reports: unset `SELLER_REPORTS_ENABLED` (stops all sends; keeps data).
- Domains: remove domains in Settings or Vercel, then unset `CUSTOM_DOMAINS_ENABLED`.
- Floor plans / AI details / More listings: hidden by reverting code; the columns are ignored by older
  code. Dropping them (rollback SQL) deletes saved data, so it is not a routine step.
