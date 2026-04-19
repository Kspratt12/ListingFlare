-- ============================================================
-- ListingFlare — Migration 032
-- Co-listing agents + Offer management.
--
-- Co-listing: Roughly 20% of real-world listings have more than
-- one listing agent. We store the second agent inline on the
-- listings row (no join needed) because the field set is small
-- and they're usually NOT an LF user.
--
-- Offers: dedicated table so an agent can track every offer
-- (buyer name, buyer agent, price, earnest money, contingencies,
-- status progression).
-- ============================================================

-- 1. Co-listing fields on the listing row
alter table public.listings
  add column if not exists co_agent_name text,
  add column if not exists co_agent_title text,
  add column if not exists co_agent_brokerage text,
  add column if not exists co_agent_license text,
  add column if not exists co_agent_phone text,
  add column if not exists co_agent_email text,
  add column if not exists co_agent_headshot_url text;

-- 2. Offers table
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  buyer_name text not null,
  buyer_email text,
  buyer_phone text,
  buyer_agent_name text,
  buyer_agent_brokerage text,
  buyer_agent_phone text,
  buyer_agent_email text,
  offer_price numeric not null,
  earnest_money numeric,
  closing_date date,
  financing_type text check (financing_type in ('cash', 'conventional', 'fha', 'va', 'usda', 'other')),
  contingencies text[] not null default '{}',
  notes text,
  status text not null default 'submitted'
    check (status in ('submitted', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired')),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to keep updated_at in sync
create or replace function public.set_offers_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists offers_updated_at on public.offers;
create trigger offers_updated_at
  before update on public.offers
  for each row execute function public.set_offers_updated_at();

-- Indexes for common lookups
create index if not exists idx_offers_listing_id on public.offers(listing_id);
create index if not exists idx_offers_agent_id on public.offers(agent_id);
create index if not exists idx_offers_status on public.offers(status);

-- RLS: agents can only see/modify their own offers
alter table public.offers enable row level security;

drop policy if exists "Agents manage their own offers" on public.offers;
create policy "Agents manage their own offers"
  on public.offers
  for all
  using (auth.uid() = agent_id)
  with check (auth.uid() = agent_id);
