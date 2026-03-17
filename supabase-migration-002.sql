-- ============================================================
-- ListingFlare — Migration 002
-- Social links, lead status, video support
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add social media links to agent_profiles
alter table public.agent_profiles
  add column if not exists instagram text not null default '',
  add column if not exists linkedin text not null default '',
  add column if not exists zillow text not null default '',
  add column if not exists realtor_com text not null default '',
  add column if not exists facebook text not null default '',
  add column if not exists website text not null default '';

-- 2. Add lead status tracking
alter table public.leads
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'showing_scheduled', 'offer_made', 'under_contract', 'closed', 'lost'));

-- 3. Add videos support to listings
alter table public.listings
  add column if not exists videos jsonb not null default '[]'::jsonb;
