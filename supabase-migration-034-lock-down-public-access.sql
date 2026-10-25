-- Migration 034: stop anonymous visitors from reading or writing private tables.
--
-- Why: the public "anon" key ships in every browser. These policies let anyone holding it
--   * read every row of public.leads (names, emails, phones, messages)
--   * read every row of public.agent_profiles (emails, phones, Stripe customer ids)
--   * read and create rows in public.showings
-- and insert rows into public.leads directly, bypassing the spam checks in /api/leads/create.
--
-- Safe because: every public page and public API route already uses the server-side admin
-- (service role) client, which ignores RLS. Signed-in agents keep their "own rows" policies.
-- Published listings stay public ("Public can view published listings" is untouched).
--
-- Run this in the Supabase SQL editor. Re-run `node scripts/check-public-access.mjs` afterwards:
-- every table above should report 0 rows visible.

begin;

-- leads: owner access only; inserts happen through /api/leads/create (service role)
drop policy if exists "Anyone can read leads by email" on public.leads;
drop policy if exists "Anyone can insert leads" on public.leads;
drop policy if exists "Public can submit leads" on public.leads;
revoke select, insert, update, delete on public.leads from anon;

-- agent_profiles: owner access only; public pages read profiles with the service role
drop policy if exists "Public can read agent profiles" on public.agent_profiles;
revoke select, insert, update, delete on public.agent_profiles from anon;

-- showings: owner access only; bookings go through /api/showings/book (service role)
drop policy if exists "Public can read showings" on public.showings;
drop policy if exists "Public can book showings" on public.showings;
revoke select, insert, update, delete on public.showings from anon;

commit;

-- ---------------------------------------------------------------------------
-- Optional checks (run separately):
--
-- 1) Which public tables have row level security turned on?
--    select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
--    Any table with rowsecurity = false is readable by anyone with the anon key.
--
-- 2) Remaining policies that apply to everyone:
--    select tablename, policyname, cmd, qual from pg_policies
--    where schemaname = 'public' and (qual = 'true' or with_check = 'true') order by 1, 2;
-- ---------------------------------------------------------------------------
