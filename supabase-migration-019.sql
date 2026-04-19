-- ============================================================
-- ListingFlare - Migration 019
-- Web Push notification subscriptions.
--
-- Each row stores a browser's push endpoint + keys for one agent.
-- Agents can have multiple subscriptions (phone, laptop, iPad).
--
-- Run in Supabase SQL Editor.
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamp with time zone not null default now(),
  last_used_at timestamp with time zone not null default now()
);

create index if not exists idx_push_subscriptions_agent on public.push_subscriptions(agent_id);

alter table public.push_subscriptions enable row level security;

create policy "Agents can view own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = agent_id);

create policy "Agents can insert own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = agent_id);

create policy "Agents can delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = agent_id);
