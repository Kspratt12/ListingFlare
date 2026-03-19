-- ============================================================
-- ListingFlare — Migration 007
-- Add Calendly URL to agent profiles for showing scheduling
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add calendly_url for auto-scheduling showings via AI chat
alter table public.agent_profiles
  add column if not exists calendly_url text default '';
