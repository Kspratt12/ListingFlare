-- ============================================================
-- ListingFlare — Migration 010
-- Add messages table (two-way inbox) + showing reminders
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Messages table — threads conversations between agent and leads
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,

  -- "outbound" = agent -> lead, "inbound" = lead -> agent (via email reply webhook)
  direction text not null check (direction in ('outbound', 'inbound')),

  subject text not null default '',
  body text not null default '',

  -- Provider metadata (Resend message ID, useful for reply threading)
  provider_message_id text,
  in_reply_to text,

  -- Attachments stored as JSONB array [{filename, url}]
  attachments jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Agents can view their own messages
create policy "Agents can view own messages"
  on public.messages for select
  using (auth.uid() = agent_id);

-- Agents can insert their own messages
create policy "Agents can insert own messages"
  on public.messages for insert
  with check (auth.uid() = agent_id);

-- Service role inserts inbound messages from webhook
create policy "Service can insert inbound messages"
  on public.messages for insert
  with check (true);

-- Agents can update their own messages (mark read)
create policy "Agents can update own messages"
  on public.messages for update
  using (auth.uid() = agent_id);

create index idx_messages_lead_id on public.messages(lead_id, created_at);
create index idx_messages_agent_id on public.messages(agent_id);
create index idx_messages_provider_id on public.messages(provider_message_id);


-- 2. Extend showings with granular reminder flags (additive — keeps old column)
alter table public.showings
  add column if not exists reminder_24h_sent boolean not null default false,
  add column if not exists reminder_1h_sent boolean not null default false;

create index if not exists idx_showings_reminders_pending
  on public.showings(showing_date, showing_time)
  where status = 'confirmed' and (reminder_24h_sent = false or reminder_1h_sent = false);


-- 3. Track notified past leads so we don't email them twice for the same listing
create table if not exists public.listing_notifications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  notification_type text not null default 'new_listing',
  sent_at timestamptz not null default now(),
  unique (listing_id, lead_id, notification_type)
);

alter table public.listing_notifications enable row level security;

create policy "Agents can view own listing notifications"
  on public.listing_notifications for select
  using (auth.uid() = agent_id);

create policy "Service can insert listing notifications"
  on public.listing_notifications for insert
  with check (true);

create index idx_listing_notifications_agent on public.listing_notifications(agent_id);
create index idx_listing_notifications_listing on public.listing_notifications(listing_id);
