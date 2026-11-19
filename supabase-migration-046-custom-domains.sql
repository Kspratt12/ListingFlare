-- Migration 046: bring-your-own custom domains for agent sites.
--
-- NOT APPLIED to any shared database. Tested locally (docs/2026-11-19-implementation-checkpoint.md).
-- Rollback: supabase-migration-046-ROLLBACK.sql.
-- Applying it changes nothing visible: the feature also needs CUSTOM_DOMAINS_ENABLED=1 and the
-- hosting-provider credentials (docs/custom-domains.md).
--
-- Rows are written only by the server (service role) after authenticating the agent and calling the
-- hosting provider, so the status column can never be set to "connected" from a browser.

begin;

create table if not exists public.agent_custom_domains (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  hostname text not null check (
    hostname = lower(hostname)
    and char_length(hostname) between 4 and 253
    and hostname ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    and hostname !~ '(^|\.)listingflare\.com$'
  ),
  status text not null default 'pending'
    check (status in ('pending', 'configuration_needed', 'verifying', 'connected', 'error', 'removing', 'removed')),
  -- DNS records exactly as the hosting provider returned them (type, name, value, reason)
  dns_records jsonb not null default '[]'::jsonb check (jsonb_typeof(dns_records) = 'array'),
  last_error text check (last_error is null or char_length(last_error) <= 64),
  last_checked_at timestamptz,
  check_count integer not null default 0,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A hostname can be held by only one live claim at a time (race-safe: the second insert fails).
-- After removal the hostname can be claimed again.
create unique index if not exists agent_custom_domains_live_hostname
  on public.agent_custom_domains (hostname) where status <> 'removed';
-- One live domain per agent.
create unique index if not exists agent_custom_domains_live_agent
  on public.agent_custom_domains (agent_id) where status <> 'removed';

alter table public.agent_custom_domains enable row level security;
revoke all on public.agent_custom_domains from anon, authenticated;
grant select on public.agent_custom_domains to authenticated;

drop policy if exists "Owner reads own domains" on public.agent_custom_domains;
create policy "Owner reads own domains" on public.agent_custom_domains
  for select to authenticated using (agent_id = auth.uid());

-- Host lookup for the middleware. Returns only the agent id and handle for a CONNECTED hostname, so
-- the public key can resolve hosts without reading the table.
create or replace function public.resolve_custom_domain(p_host text)
returns table (agent_id uuid, handle text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select d.agent_id, a.handle
  from public.agent_custom_domains d
  join public.agent_profiles a on a.id = d.agent_id
  where d.hostname = lower(p_host) and d.status = 'connected'
  limit 1
$$;

revoke all on function public.resolve_custom_domain(text) from public;
grant execute on function public.resolve_custom_domain(text) to anon, authenticated;

commit;
