-- ============================================================
-- ListingFlare — Migration 030
-- Agent-curated comparable sales. Each listing can carry up to
-- ~5 recently-sold neighborhood homes so buyers get context on
-- how this property is priced. Stored as a JSONB array of
-- objects so we don't need a separate comparables table.
--
-- Entry shape:
-- { address: string, soldPrice: number, soldDate: string,
--   beds?: number, baths?: number, sqft?: number, note?: string }
-- ============================================================

alter table public.listings
  add column if not exists comparable_sales jsonb not null default '[]'::jsonb;
