-- Migration 044: explicit owner/complimentary access marker (PROPOSED, NOT APPLIED). Separate from 042 (billing) and 043 (reminders).
-- Purpose: let the owner's demo account keep paid-level functionality WITHOUT a (fake) Stripe subscription, an email-based bypass,
-- or fabricated payment history. The marker documents why an account has paid-level access that Stripe knows nothing about.
-- Browsers cannot write it: agent_profiles has no table-level UPDATE grant for authenticated/anon, only column grants (checked read-only
-- on production 2026-11-13: authenticated may update only listed profile columns such as name), and this new column is deliberately NOT granted.
alter table public.agent_profiles
  add column if not exists complimentary_access text
  check (complimentary_access is null or complimentary_access in ('owner'));
comment on column public.agent_profiles.complimentary_access is 'owner = owner/complimentary account; set only by the service role or SQL editor, never by the app UI';
