-- ============================================================
-- ListingFlare — Migration 033
-- Trial nurture email tracking. Three timestamp columns so the cron
-- knows which agents have already received each message and doesn't
-- double-send. Null = not sent yet.
-- ============================================================

alter table public.agent_profiles
  add column if not exists trial_welcome_sent_at timestamptz,
  add column if not exists trial_day3_sent_at timestamptz,
  add column if not exists trial_day12_sent_at timestamptz,
  add column if not exists trial_reengage_sent_at timestamptz;
