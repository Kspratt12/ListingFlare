-- ============================================================
-- ListingFlare - Migration 023
-- Additional structured listing fields buyers and agents ask about:
-- parcel number, fireplace count, laundry location, basement type.
--
-- Run in Supabase SQL Editor.
-- ============================================================

alter table public.listings
  add column if not exists parcel_number text,
  add column if not exists fireplace_count integer,
  add column if not exists laundry_location text,
  add column if not exists basement_type text;
