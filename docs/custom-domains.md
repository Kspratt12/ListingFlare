# Custom domains (bring your own domain)

Agents connect a domain they already own (for example `homes.janesmith.com`) to their ListingFlare
site: the domain's `/` shows their listing collection (the `/agent/<handle>` page) and
`/listing/<slug>` shows their listings. Buying, transferring or renewing domains is out of scope.

## Status

Implemented and tested locally against a mocked hosting-provider API. **Off** until all of these are set
in the deployment environment (names only):

| Variable | Purpose |
| --- | --- |
| `CUSTOM_DOMAINS_ENABLED` | must be exactly `1`; also switches on host routing in the middleware |
| `VERCEL_API_TOKEN` | Vercel token with access to the project (server only) |
| `VERCEL_PROJECT_ID` | the ListingFlare Vercel project |
| `VERCEL_TEAM_ID` | only if the project belongs to a Vercel team |
| `PLATFORM_HOSTS` | optional, comma-separated: any extra hostname that must keep serving the normal site |

With the flag off the middleware behaves exactly as before this feature, and Settings shows "Not available yet".

**Not verified:** a real domain, real DNS, a real Vercel API call, or certificate issuance.

**2026-11-20:** still off. Migration 046 is applied. `VERCEL_API_TOKEN` is the blocker: the Vercel CLI sign-in cannot create
access tokens (403), so the owner must create one at vercel.com/account/tokens (scope: the kelvin-spratts-projects team)
and add it to Production as a sensitive variable. Then set `CUSTOM_DOMAINS_ENABLED=1`, `VERCEL_PROJECT_ID` and
`VERCEL_TEAM_ID`, redeploy, and test with `lf-test.parpercision.com` (that domain is on Vercel DNS, so no registrar change).

## How it works

- **Settings → Custom domain.** The agent enters a hostname. Full URLs are reduced to the hostname. Platform
  hosts (`*.listingflare.com`, `*.vercel.app`, localhost) are refused.
- **Claim.** A row in `agent_custom_domains` (migration 046). Partial unique indexes allow one live claim
  per hostname and one live domain per agent, so two agents racing for the same name cannot both win.
  A removed hostname can be claimed again.
- **Provider.** `lib/domainProvider.ts` adds the domain to the Vercel project, reads verification and
  configuration, and shows **only the DNS records Vercel returns** (TXT for ownership verification when the
  domain is used elsewhere; the recommended A or CNAME value). Nothing is hard-coded.
- **States.** pending → *DNS records needed* / *Ownership verification needed* → *Connected*, plus
  *Problem connecting*, *Removing* and *Removed*. "Connected" requires Vercel to report the domain verified
  AND correctly configured. HTTPS certificates are issued by Vercel afterwards; the UI says so rather
  than reporting a certificate state it cannot see.
- **Check again** is limited to once per 30 seconds per domain, plus 10 domain actions per minute per agent.
  A temporary provider outage keeps the last known state.
- **Remove** stops serving immediately (status `removing`) and then removes the domain from Vercel. If
  the provider call fails, the agent sees that and can retry; the domain does not serve in the meantime.
- **Routing (middleware).** For a non-platform host, the middleware asks the database function
  `resolve_custom_domain(host)`. It returns only the agent id and handle, and only for `connected` rows.
  Results, including "not connected", are cached for 60 seconds per server instance, so a removal takes
  effect within a minute.
  - Unknown or not-yet-connected hosts get a plain 404.
  - `/` is rewritten to the agent page; `/listing/<slug>` is served only if the listing belongs to that agent.
  - The public APIs the listing page calls (chat, inquiry, showing request, price alerts) are allowed.
  - Everything else (dashboard, login, signup, settings, other APIs, blog) gets a 308 redirect to
    `https://www.listingflare.com`. Sign-in cookies are therefore never set on a customer's domain.
  - Routing uses the `Host` header as delivered by Vercel (which only routes domains attached to the
    project). `X-Forwarded-Host` is never used.
  - The middleware sets the `x-lf-site-agent` header itself. Pages honour it only on non-platform hosts,
    so a visitor sending it to listingflare.com changes nothing.
- **Canonical URLs** for listing pages stay on `www.listingflare.com` (unchanged); customer-domain copies
  point there.

## What the agent is told

They keep the domain at their registrar and only add the records shown. DNS can take minutes, and up to
48 hours. A subdomain is easiest. If the domain belongs to another account, they're told to remove it
there or add the TXT verification record shown.

## Activation steps (each needs approval)

1. Apply migration 046 to the production Supabase project. Then check that anonymous callers can execute
   `resolve_custom_domain` but cannot select from `agent_custom_domains`.
2. Create a Vercel token scoped to the project and set the variables above in Production. Add
   `PLATFORM_HOSTS` if any other hostname serves the site.
3. Redeploy, then connect one approved test domain owned by you. Check DNS → Connected → https works →
   `/` shows the agent page → `/dashboard` redirects → another agent's listing 404s.
4. Disable by removing the domains in Settings (or in Vercel), then unsetting `CUSTOM_DOMAINS_ENABLED`.
