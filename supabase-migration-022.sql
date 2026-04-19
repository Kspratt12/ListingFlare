-- ============================================================
-- ListingFlare - Migration 022
-- Property email alerts.
--
-- Lets buyers subscribe to price / status updates on a specific listing.
-- When the agent changes the price or moves the listing to pending/sold,
-- subscribers get a notification email. Huge engagement driver -
-- buyers return to the listing when they hear about a price drop.
--
-- Run in Supabase SQL Editor.
-- ============================================================

create table if not exists public.listing_email_alerts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  email text not null,
  active boolean not null default true,
  unsubscribe_token text not null unique,
  created_at timestamp with time zone not null default now(),
  unique(listing_id, email)
);

create index if not exists idx_listing_email_alerts_listing on public.listing_email_alerts(listing_id) where active = true;
create index if not exists idx_listing_email_alerts_agent on public.listing_email_alerts(agent_id);
create index if not exists idx_listing_email_alerts_token on public.listing_email_alerts(unsubscribe_token);

alter table public.listing_email_alerts enable row level security;

-- Agents can see subscribers for their own listings
create policy "Agents can view own listing alerts"
  on public.listing_email_alerts for select
  using (auth.uid() = agent_id);

-- Agents can remove subscribers from their own listings
create policy "Agents can delete own listing alerts"
  on public.listing_email_alerts for delete
  using (auth.uid() = agent_id);

-- Public subscribe is handled server-side via admin client in the API route,
-- so no public insert policy is needed here.
