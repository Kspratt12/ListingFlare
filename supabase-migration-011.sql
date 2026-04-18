-- ============================================================
-- ListingFlare — Migration 011
-- Add AI approval mode column
-- Run this in Supabase SQL Editor
-- ============================================================

-- Default false = existing behavior (auto-send AI replies)
-- If true = AI generates draft but does NOT auto-send; agent reviews first
alter table public.agent_profiles
  add column if not exists ai_approval_mode boolean not null default false;
