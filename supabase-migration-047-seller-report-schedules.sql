-- Migration 047: scheduled seller reports.
--
-- NOT APPLIED to any shared database. Tested locally (see docs/2026-11-19-implementation-checkpoint.md).
-- Requires migration 017 (seller_portals). Rollback: supabase-migration-047-ROLLBACK.sql.
--
-- Sending is additionally gated by the SELLER_REPORTS_ENABLED environment variable (default off) and
-- needs a scheduler hitting /api/cron/seller-reports; creating rows here sends nothing by itself.
--
-- Writes go through the app's API routes (service role) after ownership checks, so browsers get
-- read access to their own rows only.

begin;

create table if not exists public.seller_report_schedules (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.listings(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  -- The seller is the listing's seller portal; revoking the portal stops the reports.
  seller_portal_id uuid references public.seller_portals(id) on delete set null,
  enabled boolean not null default false,
  cadence text not null default 'weekly' check (cadence in ('weekly', 'biweekly', 'monthly')),
  send_weekday smallint not null default 1 check (send_weekday between 0 and 6),
  send_hour smallint not null default 9 check (send_hour between 0 and 23),
  timezone text not null default 'America/New_York' check (char_length(timezone) between 1 and 64),
  include_portal_link boolean not null default true,
  next_run_at timestamptz,
  last_period_end timestamptz,
  paused_reason text check (paused_reason is null or char_length(paused_reason) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_report_schedules_due_idx
  on public.seller_report_schedules (next_run_at) where enabled;
create index if not exists seller_report_schedules_agent_idx on public.seller_report_schedules (agent_id);

create table if not exists public.seller_report_sends (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.seller_report_schedules(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  -- 'accepted' means the email provider accepted the message; it does not prove inbox delivery.
  status text not null check (status in ('sending', 'accepted', 'failed', 'skipped')),
  attempts smallint not null default 1 check (attempts between 0 and 20),
  provider_message_id text,
  -- A short error/skip code only (no message bodies or addresses).
  last_error text check (last_error is null or char_length(last_error) <= 64),
  claimed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- One send per schedule per period: overlapping or repeated runs cannot double-send.
  unique (schedule_id, period_end)
);

create index if not exists seller_report_sends_schedule_idx on public.seller_report_sends (schedule_id, created_at desc);

alter table public.seller_report_schedules enable row level security;
alter table public.seller_report_sends enable row level security;

revoke all on public.seller_report_schedules from anon, authenticated;
revoke all on public.seller_report_sends from anon, authenticated;
grant select on public.seller_report_schedules to authenticated;
grant select on public.seller_report_sends to authenticated;

drop policy if exists "Owner reads own report schedules" on public.seller_report_schedules;
create policy "Owner reads own report schedules" on public.seller_report_schedules
  for select to authenticated using (agent_id = auth.uid());

drop policy if exists "Owner reads own report sends" on public.seller_report_sends;
create policy "Owner reads own report sends" on public.seller_report_sends
  for select to authenticated using (agent_id = auth.uid());

commit;
