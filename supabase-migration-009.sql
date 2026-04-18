-- ============================================================
-- ListingFlare — Migration 009
-- Add showings table and follow-up sequences for drip campaigns
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Showings table — tracks scheduled property showings
create table if not exists public.showings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,

  -- Showing details
  showing_date date not null,
  showing_time text not null,  -- e.g. "10:00 AM"
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  message text not null default '',

  -- Status
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'canceled', 'no_show')),

  -- Reminders
  reminder_sent boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.showings enable row level security;

-- Agents can view their own showings
create policy "Agents can view own showings"
  on public.showings for select
  using (auth.uid() = agent_id);

-- Agents can update own showings
create policy "Agents can update own showings"
  on public.showings for update
  using (auth.uid() = agent_id);

-- Anyone can insert a showing (public booking form)
create policy "Public can book showings"
  on public.showings for insert
  with check (true);

-- Anyone can read showings (for confirmation pages)
create policy "Public can read showings"
  on public.showings for select
  using (true);

-- Agents can delete own showings
create policy "Agents can delete own showings"
  on public.showings for delete
  using (auth.uid() = agent_id);

create index idx_showings_agent_id on public.showings(agent_id);
create index idx_showings_listing_id on public.showings(listing_id);
create index idx_showings_lead_id on public.showings(lead_id);
create index idx_showings_date on public.showings(showing_date);


-- 2. Follow-up sequences table — tracks drip campaign emails
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,

  -- Sequence tracking
  day_number integer not null,      -- 0, 1, 3, 7
  sequence_type text not null default 'inquiry' check (sequence_type in ('inquiry', 'showing')),

  -- Email content
  subject text not null default '',
  body text not null default '',

  -- Status
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  scheduled_at timestamptz not null,
  sent_at timestamptz,

  created_at timestamptz not null default now()
);

alter table public.follow_ups enable row level security;

-- Agents can view their own follow-ups
create policy "Agents can view own follow_ups"
  on public.follow_ups for select
  using (auth.uid() = agent_id);

-- Agents can update own follow-ups (to skip/cancel)
create policy "Agents can update own follow_ups"
  on public.follow_ups for update
  using (auth.uid() = agent_id);

-- Service role inserts (from API routes)
create policy "Service can insert follow_ups"
  on public.follow_ups for insert
  with check (true);

-- Public can read (for cron job processing)
create policy "Public can read follow_ups"
  on public.follow_ups for select
  using (true);

create index idx_follow_ups_lead_id on public.follow_ups(lead_id);
create index idx_follow_ups_agent_id on public.follow_ups(agent_id);
create index idx_follow_ups_scheduled on public.follow_ups(scheduled_at) where status = 'pending';
create index idx_follow_ups_status on public.follow_ups(status);
