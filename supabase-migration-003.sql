-- ============================================================
-- ListingFlare — Migration 003
-- Weekly email preferences
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add weekly email preference to agent_profiles
alter table public.agent_profiles
  add column if not exists weekly_emails boolean not null default true;
