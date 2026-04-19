-- ============================================================
-- ListingFlare - Migration 021
-- MLS-parity listing attributes: price history, taxes, HOA,
-- county/subdivision, schools, HVAC, construction, MLS ID.
--
-- Buyers expect to see the full attribute sheet on any listing.
-- Without these fields, our page looks lighter than a real MLS
-- page, which hurts perceived quality.
--
-- Run in Supabase SQL Editor.
-- ============================================================

alter table public.listings
  -- Price history: array of {date, price, event} entries, oldest first
  add column if not exists price_history jsonb not null default '[]'::jsonb,
  -- Listing identifiers
  add column if not exists mls_id text,
  -- Location details
  add column if not exists county text,
  add column if not exists subdivision text,
  -- Property classification
  add column if not exists architectural_style text,
  add column if not exists property_subtype text,
  add column if not exists stories integer,
  add column if not exists parking_spaces integer,
  -- Costs
  add column if not exists property_tax_annual numeric,
  add column if not exists hoa_required boolean default false,
  add column if not exists hoa_fee_monthly numeric,
  -- Systems
  add column if not exists heating_type text,
  add column if not exists cooling_type text,
  add column if not exists water_source text,
  add column if not exists sewer_type text,
  -- Construction
  add column if not exists roof_type text,
  add column if not exists construction_material text,
  add column if not exists foundation_type text,
  -- Appliances: array of strings
  add column if not exists appliances_included text[] default '{}',
  -- Schools (agent enters these manually)
  add column if not exists school_elementary text,
  add column if not exists school_middle text,
  add column if not exists school_high text;

-- Note: existing columns that are preserved:
--   beds, baths, sqft, year_built, lot_size, description, features, photos
