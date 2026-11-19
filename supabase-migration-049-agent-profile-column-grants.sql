-- Migration 049 (hardening, optional but recommended): put the agent_profiles column grants in the repo.
--
-- Why: on a database built from this repository's migrations alone, a signed-in agent can update ANY
-- column of their own profile with the public key, including subscription_status, trial_ends_at,
-- stripe_customer_id and complimentary_access (verified locally, see the checkpoint doc). Migration 044
-- records that production was checked on 2026-11-13 and already restricts this with column grants that
-- were added outside the repo. This migration writes that protection down so a rebuilt or new project
-- is safe too.
--
-- Browser-side writes to agent_profiles in the app (everything else goes through server routes with
-- the service role, which this does not affect):
--   name (dashboard layout), brand_color (dashboard layout), ai_approval_mode (Settings, briefing),
--   show_other_listings (Settings, migration 045)
--
-- BEFORE RUNNING IN PRODUCTION, compare with the current grants and keep any extra column that is
-- intentionally browser-writable there:
--   select column_name from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'agent_profiles'
--      and grantee = 'authenticated' and privilege_type = 'UPDATE' order by 1;
-- Rollback (restores the unsafe default): grant update on public.agent_profiles to authenticated;

begin;

revoke update on public.agent_profiles from anon, authenticated;
grant update (name, brand_color, ai_approval_mode, show_other_listings) on public.agent_profiles to authenticated;

commit;
