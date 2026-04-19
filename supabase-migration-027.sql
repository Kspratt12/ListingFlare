-- ============================================================
-- ListingFlare - Migration 027
-- Product testimonials for the marketing site.
--
-- Different from the buyer-testimonials-about-agents table.
-- These are agents vouching FOR ListingFlare. Rendered on the
-- homepage once you have real customers willing to share.
--
-- Add rows manually via SQL Editor for now. Later, a paying-
-- customer flow can auto-submit (with consent) right from the
-- dashboard.
--
-- Run in Supabase SQL Editor.
-- ============================================================

create table if not exists public.product_testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_title text,
  author_city text,
  author_photo_url text,
  quote text not null,
  rating integer check (rating is null or (rating between 1 and 5)),
  featured boolean not null default false,
  approved boolean not null default false,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_product_testimonials_approved
  on public.product_testimonials(approved, featured, created_at)
  where approved = true;

alter table public.product_testimonials enable row level security;

-- Public read only approved testimonials
create policy "Public can view approved product testimonials"
  on public.product_testimonials for select
  using (approved = true);
