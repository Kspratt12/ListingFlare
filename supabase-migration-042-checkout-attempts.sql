-- Migration 042: durable one-active-checkout-per-agent reservation (PROPOSED, NOT APPLIED).
--
-- Purpose: an agent can have at most ONE active Stripe Checkout attempt at a time, so two checkouts opened
-- before the first webhook cannot both be paid. Covers: concurrent same-plan and different-plan attempts,
-- double clicks and retries, a created session whose response was lost, abandoned/expired/failed/completed
-- attempts, crash recovery (lease), and a completed checkout whose webhook has not arrived yet.
--
-- Design:
--   * table checkout_attempts: one row per attempt, status creating -> open -> completed | expired | failed.
--   * partial UNIQUE index: only one row per agent may be in ('creating','open'). This is the atomic claim.
--   * 'creating' carries a short crash-recovery lease (default 120 s). If the request dies, the lease lapses and the
--     next claim sweeps it to 'failed'. 'open' carries the Stripe session expiry; after it lapses the next claim sweeps it
--     to 'expired'. The application ALSO expires the customer's open Stripe sessions before creating a new one.
--   * claim_checkout_attempt() serialises per agent with an advisory lock, sweeps lapsed rows, then inserts or reports
--     the existing active attempt (so a double click gets the same checkout URL back).
--   * All functions are SECURITY DEFINER, EXECUTE only for service_role. The table has RLS on and no policies.
-- Nothing here cancels or refunds a subscription.

create table if not exists public.checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  stripe_customer_id text,
  price_id text,
  status text not null check (status in ('creating', 'open', 'completed', 'expired', 'failed')),
  stripe_session_id text,
  checkout_url text,
  lease_expires_at timestamptz not null,
  completed_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- THE atomic claim: at most one active attempt per agent.
create unique index if not exists checkout_attempts_one_active_per_agent
  on public.checkout_attempts (agent_id) where status in ('creating', 'open');
create index if not exists checkout_attempts_session on public.checkout_attempts (stripe_session_id);

alter table public.checkout_attempts enable row level security;
revoke all on public.checkout_attempts from anon, authenticated;

-- Claim: returns outcome 'claimed' (this caller owns attempt_id), 'existing_open' (reuse session/url) or 'in_progress'.
create or replace function public.claim_checkout_attempt(p_agent uuid, p_customer text, p_price text, p_lease_seconds int default 120)
returns table (outcome text, attempt_id uuid, session_id text, checkout_url text)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_row public.checkout_attempts%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('checkout:' || p_agent::text));

  -- Sweep lapsed attempts for this agent (crashed creators, abandoned or expired sessions).
  update public.checkout_attempts set status = 'failed', updated_at = now()
    where agent_id = p_agent and status = 'creating' and lease_expires_at < now();
  update public.checkout_attempts set status = 'expired', updated_at = now()
    where agent_id = p_agent and status = 'open' and lease_expires_at < now();

  insert into public.checkout_attempts (agent_id, stripe_customer_id, price_id, status, lease_expires_at)
    values (p_agent, p_customer, p_price, 'creating', now() + make_interval(secs => p_lease_seconds))
    on conflict (agent_id) where status in ('creating', 'open') do nothing
    returning id into v_id;

  if v_id is not null then
    return query select 'claimed'::text, v_id, null::text, null::text;
    return;
  end if;

  select * into v_row from public.checkout_attempts where agent_id = p_agent and status in ('creating', 'open') limit 1;
  if v_row.status = 'open' then
    return query select 'existing_open'::text, v_row.id, v_row.stripe_session_id, v_row.checkout_url;
  else
    return query select 'in_progress'::text, v_row.id, null::text, null::text;
  end if;
end $$;

-- Record the created Stripe session. Only the owner of a still-'creating' attempt may do this.
-- Returns false if the attempt was swept (lease lapsed) or changed: the caller must then expire the session it created.
create or replace function public.record_checkout_session(p_attempt uuid, p_session text, p_url text, p_session_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  update public.checkout_attempts
     set status = 'open', stripe_session_id = p_session, checkout_url = p_url, lease_expires_at = p_session_expires_at, updated_at = now()
   where id = p_attempt and status = 'creating';
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;

-- Release an attempt that failed before a session existed (so the agent can retry immediately).
create or replace function public.fail_checkout_attempt(p_attempt uuid)
returns void language sql security definer set search_path = public as $$
  update public.checkout_attempts set status = 'failed', updated_at = now() where id = p_attempt and status = 'creating';
$$;

-- Webhook side: mark by Stripe session id.
create or replace function public.complete_checkout_session(p_session text, p_subscription text)
returns void language sql security definer set search_path = public as $$
  update public.checkout_attempts set status = 'completed', completed_subscription_id = p_subscription, updated_at = now()
   where stripe_session_id = p_session and status in ('open', 'creating');
$$;

create or replace function public.expire_checkout_session(p_session text)
returns void language sql security definer set search_path = public as $$
  update public.checkout_attempts set status = 'expired', updated_at = now()
   where stripe_session_id = p_session and status = 'open';
$$;

revoke all on function public.claim_checkout_attempt(uuid, text, text, int) from public, anon, authenticated;
revoke all on function public.record_checkout_session(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.fail_checkout_attempt(uuid) from public, anon, authenticated;
revoke all on function public.complete_checkout_session(text, text) from public, anon, authenticated;
revoke all on function public.expire_checkout_session(text) from public, anon, authenticated;
grant execute on function public.claim_checkout_attempt(uuid, text, text, int) to service_role;
grant execute on function public.record_checkout_session(uuid, text, text, timestamptz) to service_role;
grant execute on function public.fail_checkout_attempt(uuid) to service_role;
grant execute on function public.complete_checkout_session(text, text) to service_role;
grant execute on function public.expire_checkout_session(text) to service_role;
