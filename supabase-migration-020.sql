-- ============================================================
-- ListingFlare - Migration 020
-- Seller prospects pipeline.
--
-- Tracks agents' potential seller leads (homeowners thinking about
-- listing). Pure CRM functionality - no automated outreach, no public
-- records scraping. Agent manually adds prospects they meet through
-- referrals, door knocking, expired listings, farming, etc.
--
-- Run in Supabase SQL Editor.
-- ============================================================

create table if not exists public.seller_prospects (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  name text not null,
  street text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  source text not null default 'other' check (source in ('referral', 'door_knock', 'expired_listing', 'farming', 'open_house', 'past_client', 'online', 'other')),
  stage text not null default 'prospect' check (stage in ('prospect', 'met', 'presentation', 'listed', 'sold', 'dropped')),
  estimated_value numeric,
  notes text,
  follow_up_date date,
  last_contacted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_seller_prospects_agent on public.seller_prospects(agent_id);
create index if not exists idx_seller_prospects_stage on public.seller_prospects(stage);
create index if not exists idx_seller_prospects_follow_up on public.seller_prospects(follow_up_date) where follow_up_date is not null;

alter table public.seller_prospects enable row level security;

create policy "Agents can view own seller prospects"
  on public.seller_prospects for select
  using (auth.uid() = agent_id);

create policy "Agents can insert own seller prospects"
  on public.seller_prospects for insert
  with check (auth.uid() = agent_id);

create policy "Agents can update own seller prospects"
  on public.seller_prospects for update
  using (auth.uid() = agent_id);

create policy "Agents can delete own seller prospects"
  on public.seller_prospects for delete
  using (auth.uid() = agent_id);

-- Auto-update updated_at on row changes
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_seller_prospects_updated_at on public.seller_prospects;
create trigger trg_seller_prospects_updated_at
  before update on public.seller_prospects
  for each row
  execute function public.set_updated_at();
