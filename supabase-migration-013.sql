-- ============================================================
-- ListingFlare - Migration 013
-- Add private notes and tags to leads
-- Run this in Supabase SQL Editor
-- ============================================================

alter table public.leads
  add column if not exists notes text not null default '',
  add column if not exists tags text[] not null default '{}';

create index if not exists idx_leads_tags on public.leads using gin(tags);
