-- ============================================================
-- ListingFlare — Migration 004
-- Add slug field to listings for clean URLs
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add slug column
alter table public.listings
  add column if not exists slug text not null default '';

-- Create unique index for slug lookups (only for non-empty slugs)
create unique index if not exists idx_listings_slug
  on public.listings(slug) where slug != '';

-- Generate slugs for existing listings
update public.listings
set slug = lower(
  regexp_replace(
    regexp_replace(street, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
) || '-' || left(id::text, 8)
where slug = '' and street != '';
