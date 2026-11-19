-- Migration 046 (PREPARED, NOT TO BE RUN YET): custom domains for agent sites.
--
-- Do not apply until custom-domain activation is approved (see docs/custom-domains.md). Nothing in the
-- app reads or writes this table today; CUSTOM_DOMAINS_AVAILABLE is false.
--
-- Rows are written by the server (service role) after hosting-provider calls. Agents may read their own
-- rows; they cannot set status themselves, so a domain can never be marked "active" from the browser.

begin;

create table if not exists public.agent_custom_domains (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  hostname text not null unique check (hostname = lower(hostname) and char_length(hostname) <= 253),
  status text not null default 'pending_dns'
    check (status in ('pending_dns', 'verifying', 'active', 'failed', 'removed')),
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_custom_domains_agent_idx on public.agent_custom_domains (agent_id);

alter table public.agent_custom_domains enable row level security;
revoke all on public.agent_custom_domains from anon;
revoke insert, update, delete on public.agent_custom_domains from authenticated;
grant select on public.agent_custom_domains to authenticated;

drop policy if exists "Owner reads own domains" on public.agent_custom_domains;
create policy "Owner reads own domains" on public.agent_custom_domains
  for select to authenticated using (agent_id = auth.uid());

commit;

-- Rollback:
--   drop table if exists public.agent_custom_domains;
