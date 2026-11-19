## Listing workflow integrity, seller reports, floor plans, custom domains

**Fixes**
- Saving a Coming Soon / Pending / Closed listing no longer turns it into a draft (which took the page down).
- Saves that update no row are reported instead of shown as success; the editor stays on the page.
- Owners can preview drafts privately; visitors and other agents get 404; previews don't count views.
- The AI chat answers from the saved listing (not facts sent by the browser) and respects status, the
  chat toggle and account status. Owners get a test mode with no lead capture.
- Unbranded page: no agent identity in HTML, serialized props or media URLs.
- Seller report: stated periods, definitions, honest zero states; no unconditional claims.
- Removed the old flyer route that wrote unescaped listing text into HTML.

**Features**
- Buyer-facing extra AI details and owner-only private notes (045).
- Opt-in "More listings from this agent" (045); agent page improvements.
- Flyer editor: three layouts, colors, headline/date/time/message, QR to the listing or the sign-in page.
- Scheduled seller reports (047), off unless `SELLER_REPORTS_ENABLED=1` and a scheduler is configured.
- Interactive floor plans (048).
- Bring-your-own domains (046), off unless `CUSTOM_DOMAINS_ENABLED=1` and Vercel credentials are set.
- Optional hardening of profile column grants (049).

**Verification:** 637/637 unit tests, type-check, build; 69/69 local database policy checks (PGlite +
Supabase shim); 67/68 browser checks in Chromium against fakes (the one failure is the existing Google
Maps embed request being blocked by the harness). Details and gaps: `docs/2026-11-19-implementation-checkpoint.md`.

**Merge safety:** with no migrations applied and no new env vars, the new features stay hidden and
existing pages keep working (tested both ways).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
