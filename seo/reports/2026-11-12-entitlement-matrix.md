# Trial entitlement matrix (proposal, 2026-11-12)

"Intended" is established only where independent sources agree. Sources: **Copy** (pricing/FAQ/dashboard text), **Limits** (`getSubscriptionLimits` in `subscription.ts`), **Client** (what the dashboard enforces), **Server** (what a direct request is stopped by today), **Intent** (comments in code).

| # | Entitlement (trial) | Copy | Limits | Client | Server today | Agreement | This PR |
|---|---|---|---|---|---|---|---|
| 1 | Reply to leads from dashboard | paid ("Upgrade to reply") | no | hidden | **none** (`/api/leads/reply`) | 3 sources agree | **Enforce** |
| 2 | Social post pack + captions | paid (dashboard hides) | no | hidden | **allowed** (`hasActiveSubscription` passes trialing) | 3 agree **plus Intent**: route comment says the pack is paid and must be enforced on the server | **Enforce** (2 routes) |
| 3 | 1 listing | "1 listing" | 1 | enforced | none (browser inserts directly into Supabase) | agree | Not here: needs a database trigger/RLS = approval |
| 4 | 5 photos | "up to 5 photos" | 5 | enforced | none (JSON column + storage upload) | agree | Not here: database change |
| 5 | 0 videos | "video is paid" | 0 | enforced | none (storage upload) | agree | Not here: storage policy |
| 6 | Open-house flyer | listed as a feature, no trial exclusion | **false** | **not gated** | none | **conflict** | Decision needed |
| 7 | 5 leads cap | not claimed (removed) | 5 | **not enforced anywhere** | none | single source | Recommend NOT enforcing (see below) |
| 8 | 1 AI description | not claimed | 1 | not enforced, no counter exists | AI routes allow trialing users up to a rate limit | single source | Decision needed (needs usage storage) |
| 9 | Expired trial hides listing, pauses follow-ups, blocks AI | stated | yes | yes | **enforced** | agree | unchanged |
| 10 | Public chat, lead capture, instant first reply, showing requests | core product | n/a | n/a | not gated | agree | unchanged (core value stays free in trial) |

## Decisions needed (not silently resolved)
- **#6 flyer:** (A) trial may use it, set `canGenerateOpenHouseFlyer: true` (matches what happens today); or (B) gate it. Today's behavior is A.
- **#7 lead cap:** enforcing a 5-lead cap would drop or hide real buyer inquiries for a trial agent, undermining the core value. Recommendation: remove it from `subscription.ts` rather than enforce it. If you want it enforced, say what happens to the 6th lead (stored but locked, or refused).
- **#8 AI descriptions:** trial users can call the AI routes repeatedly (cost exposure, rate-limited only). Enforcing "1" needs a usage counter (new column/table).
- **#3-#5:** server enforcement of listings/photos/videos needs a database change. Compatibility rule I would use: apply only to NEW inserts/increases for non-paid accounts, never remove or block existing data, and exempt accounts that already exceed the limit (grandfathering). Not drafted until you approve the direction.

## What this PR changes
`src/lib/entitlements.ts` (one function over `getSubscriptionLimits`, so server == screen), plus `/api/leads/reply`, `/api/social-posts`, `/api/ai/social-caption` return **402 `upgrade_required`** for accounts that are not paid. No database, billing or UI change. Reversible by reverting the commit.

## Compatibility tests (all pass; Node 22: 293/293)
- Paid (`active`) accounts keep both entitlements regardless of trial dates.
- Live trial, expired trial, `past_due`, `canceled`, `unpaid`, missing profile: denied (same as the dashboard today).
- For every status x trial-date combination the server answer equals `getSubscriptionLimits` (cannot drift from the screen).
- Static: the gate runs before any provider call or data read in all three routes.

## Subscription states covered (added after review)
The webhook stores Stripe's own status, so a customer on a Stripe-side trial is stored as `trialing` with the old free-trial date. The shared rule now treats `trialing` + a Stripe subscription id (only checkout creates one) as a paid plan, on screen and on the server, so that customer is neither blocked nor shown as expired. Free app trial (`trialing`, no Stripe id), `past_due`, `canceled` and `unpaid` stay denied. Tested for every status x trial date x Stripe-id combination.

## Risks
- A paying customer whose Stripe status is momentarily `past_due` is already hidden from these controls by the dashboard; the server now agrees. If you prefer grace for `past_due`, change `getSubscriptionLimits` (one place) and both screen and server follow.
- Not exercised against real Stripe/Supabase; unit and static tests only.
