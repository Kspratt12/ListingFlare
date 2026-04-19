-- ============================================================
-- ListingFlare - Migration 025
-- Video intro URL per listing.
--
-- Agents record a 30-second phone video welcoming buyers.
-- Displays above photos on the listing page. Personal touch.
--
-- Run in Supabase SQL Editor.
-- ============================================================

alter table public.listings
  add column if not exists video_intro_url text;
