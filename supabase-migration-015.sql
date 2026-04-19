-- ============================================================
-- ListingFlare - Migration 015
-- Add lead pre-qualification + source attribution
-- Run this in Supabase SQL Editor
-- ============================================================

alter table public.leads
  add column if not exists pre_approved text check (pre_approved in ('yes', 'working_on_it', 'no', 'cash', 'not_specified') or pre_approved is null),
  add column if not exists timeline text check (timeline in ('asap', '30_90', '3_6_months', 'just_looking', 'not_specified') or timeline is null),
  add column if not exists has_agent text check (has_agent in ('yes', 'no', 'not_specified') or has_agent is null),
  add column if not exists source text;

create index if not exists idx_leads_source on public.leads(source) where source is not null;
create index if not exists idx_leads_pre_approved on public.leads(pre_approved) where pre_approved in ('yes', 'cash');
