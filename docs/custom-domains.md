# Custom domains: status and activation requirements

**Status: not available.** `CUSTOM_DOMAINS_AVAILABLE = false` in `src/lib/customDomain.ts`. The Settings
page shows a "Custom domain: Not available yet" card that checks the format of a domain and saves
nothing. No DNS, certificate or hosting change is made by the app.

## What works today

- Agent subdomain: `handle.listingflare.com` rewrites `/` to `/agent/<handle>` (`src/middleware.ts`).
  This depends on a wildcard `*.listingflare.com` DNS record and domain on the hosting project. That
  existing setup was not re-verified in this change.
- Per-listing pages: `https://www.listingflare.com/listing/<slug>`, plus `/listing/<slug>/unbranded`.

## What exists in code (tested locally, not connected)

- `normalizeDomainInput` / `checkCustomDomain`: format validation (rejects IPs, reserved names,
  listingflare.com and hosting-provider domains, malformed labels, non-ASCII without the `xn--` form).
- `nextDomainState`: lifecycle `pending_dns -> verifying -> active`, with `failed` and `removed`.
  A domain can only become `active` after a provider-verified event.
- `supabase-migration-046-custom-domains-NOT-RUN.sql`: table for future use. **Do not run it** until
  activation is approved; nothing reads it today.

## Required before it can be switched on (each needs separate approval)

1. **Hosting provider API access.** The app is deployed on Vercel. Adding a customer domain to the
   project, and reading its verification and certificate status, needs a Vercel API token with project
   access stored as a server secret. No such token or integration exists in this repository.
2. **Per-domain DNS by the agent.** The agent adds the DNS records the hosting provider shows for their
   domain (typically a CNAME for a subdomain, or A records for a root domain). Use the values the
   provider returns at the time; do not hard-code them from memory.
3. **TLS certificates** are issued by the hosting provider after DNS verifies. The app must show
   "Connected" only after the provider reports both DNS and certificate as valid.
4. **Middleware host mapping.** Extend `src/middleware.ts` to map a verified custom host to
   `/agent/<handle>` (and listing paths), using a cached lookup of `active` domains only. Unknown hosts
   must fall through to the normal site.
5. **Limits and support.** Decide per-plan limits (proposal: one domain on the paid plan), what happens
   when a subscription lapses (proposal: the domain stops serving listing pages, same as listings), and
   a self-service "remove domain" action, so this does not create manual support work.
6. **Copy.** Do not describe it as "one click": the agent must still edit DNS at their registrar.

## Explicitly out of scope

Buying domains, editing customer DNS, or provisioning certificates on anyone's behalf.
