-- ============================================================
-- ListingFlare - Migration 028
-- Per-listing brand color override.
--
-- Agents have a default brand_color in Settings. Each listing can
-- now override that with its own color (e.g. a beach house gets
-- teal, a luxury listing gets black, a family home gets warm gold).
-- If a listing has no color, the agent's default takes over. If
-- neither is set, the built-in brand color is used.
--
-- Run in Supabase SQL Editor.
-- ============================================================

alter table public.listings
  add column if not exists brand_color text;
