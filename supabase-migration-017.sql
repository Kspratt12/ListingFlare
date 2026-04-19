-- ============================================================
-- ListingFlare - Migration 017
-- Seller transparency portals.
--
-- Agents invite sellers to a magic-link dashboard where they see live
-- stats on their listing: views, leads, showings, AI conversations. No
-- password, just a signed token in the URL.
--
-- Run in Supabase SQL Editor.
-- ============================================================

create table if not exists public.seller_portals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  seller_name text,
  seller_email text,
  access_token text not null unique,
  active boolean not null default true,
  last_visited_at timestamp with time zone,
  visit_count integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_seller_portals_listing on public.seller_portals(listing_id);
create index if not exists idx_seller_portals_agent on public.seller_portals(agent_id);
create index if not exists idx_seller_portals_token on public.seller_portals(access_token) where active = true;

alter table public.seller_portals enable row level security;

-- Agents can see and manage their own portals
create policy "Agents can view own seller portals"
  on public.seller_portals for select
  using (auth.uid() = agent_id);

create policy "Agents can insert own seller portals"
  on public.seller_portals for insert
  with check (auth.uid() = agent_id);

create policy "Agents can update own seller portals"
  on public.seller_portals for update
  using (auth.uid() = agent_id);

create policy "Agents can delete own seller portals"
  on public.seller_portals for delete
  using (auth.uid() = agent_id);

-- The seller-facing page hits this table from the server via the admin
-- client after validating the token, so no public RLS policy is needed.
