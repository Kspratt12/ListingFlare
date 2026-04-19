-- ============================================================
-- ListingFlare - Migration 024
-- Coming Soon listing status + launch date.
--
-- Agents announce a listing before it hits MLS. Buyers see a
-- countdown timer and can subscribe to be notified when it goes
-- live. Builds a waitlist of hot buyers before the competition.
--
-- Run in Supabase SQL Editor.
-- ============================================================

-- Add launch_date column
alter table public.listings
  add column if not exists launch_date timestamp with time zone;

-- Update the status check constraint to allow 'coming_soon'
-- Postgres doesn't have a CREATE OR REPLACE for constraints, so we drop and re-add
alter table public.listings
  drop constraint if exists listings_status_check;

alter table public.listings
  add constraint listings_status_check
  check (status in ('draft', 'published', 'pending', 'closed', 'archived', 'coming_soon'));

-- published_at column (if not already present) to power "days on market" accurately
alter table public.listings
  add column if not exists published_at timestamp with time zone;
