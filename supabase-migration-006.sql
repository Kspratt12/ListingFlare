-- ============================================================
-- ListingFlare — Migration 006
-- Add virtual tour URL field to listings
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add virtual_tour_url column for embedding 360° tours (Matterport, Kuula, CloudPano, etc.)
alter table public.listings
  add column if not exists virtual_tour_url text default '';
