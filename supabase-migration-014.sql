-- ============================================================
-- ListingFlare - Migration 014
-- Add commission tracking to closed leads
-- Run this in Supabase SQL Editor
-- ============================================================

alter table public.leads
  add column if not exists closed_price bigint,
  add column if not exists commission_amount bigint,
  add column if not exists closed_at timestamptz;

create index if not exists idx_leads_closed_at on public.leads(closed_at) where closed_at is not null;
