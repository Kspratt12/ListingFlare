-- ============================================================
-- ListingFlare — Migration 031
-- Agent license number. Most US states legally require a real
-- estate license # be shown on any advertising (websites, emails,
-- social posts). Optional field so agents outside that regime
-- can skip it, but our listing page + emails will display it
-- when set.
-- ============================================================

alter table public.agent_profiles
  add column if not exists license_number text;
