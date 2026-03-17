-- ============================================================
-- ListingFlare — Billing Migration
-- Run this in Supabase SQL Editor AFTER the initial schema
-- ============================================================

-- Add billing columns to agent_profiles
alter table public.agent_profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days'),
  add column if not exists setup_fee_paid boolean not null default false;

-- Index for webhook lookups
create index if not exists idx_agent_profiles_stripe_customer
  on public.agent_profiles(stripe_customer_id);

-- Allow the public listing page to read agent profile for branding
-- (already covered by existing policy since server component uses service role,
--  but we need it for the webhook route which uses the service role key)
