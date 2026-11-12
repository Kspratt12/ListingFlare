-- 041: showing REQUESTS (additive). NOT APPLIED. Review, then run once in the Supabase SQL editor.
--
-- Adds two statuses, "requested" and "declined", a responded_at timestamp and nullable timezone columns.
-- Existing rows are NOT modified: every historical "confirmed" row stays "confirmed"
-- (they were created by the old flow that already emailed the buyer a confirmation).
--
-- Deploy order: apply this migration FIRST, then deploy the app code. The old code keeps
-- working after the migration (it only ever writes "confirmed"); the new code needs it.
--
-- Before applying, optionally audit historical double-bookings (read only):
--   select listing_id, showing_date, showing_time, count(*)
--   from public.showings where status = 'confirmed'
--   group by 1,2,3 having count(*) > 1;

begin;

-- Replace the status CHECK (its generated name is not known, so look it up).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.showings'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.showings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.showings
  add constraint showings_status_check
  check (status in ('requested', 'confirmed', 'declined', 'completed', 'canceled', 'no_show'));

-- The column DEFAULT stays 'confirmed' on purpose. The code deployed today inserts showings without a
-- status and relies on that default; changing it before the new code is live would store old-flow bookings
-- as 'requested' while still emailing buyers a confirmation. The new code always sets status explicitly.

alter table public.showings add column if not exists responded_at timestamptz;

-- Property time zone (IANA name, e.g. America/New_York). Nullable: null means "not set", and the app then
-- creates no Google Calendar event and writes floating (not exact) .ics times. Validated by the app.
-- listings.timezone overrides agent_profiles.timezone when both are set.
alter table public.agent_profiles add column if not exists timezone text;
alter table public.listings add column if not exists timezone text;

-- Minutes after midnight for a "10:30 AM" style time; null if it is not one. Mirrors showingSlots.ts.
create or replace function public.showing_time_minutes(t text) returns int
language sql immutable as $$
  select case when m is null then null
         else ((m[1]::int % 12) + case when upper(m[3]) = 'PM' then 12 else 0 end) * 60 + m[2]::int end
  from (select regexp_match(btrim(t), '^([0-9]{1,2}):([0-9]{2})[[:space:]]*(AM|PM)$', 'i') as m) s
$$;

-- Atomic confirmation of a showing REQUEST. The app calls this with the service role; it is the only
-- way a request becomes confirmed.
--   * Ownership is re-checked here (p_agent_id must own the row), because the service role bypasses RLS.
--   * A transaction-scoped advisory lock per listing+date serializes concurrent confirmations for that
--     listing and day, so the overlap check always sees the other transaction's committed result. Two
--     simultaneous confirmations of overlapping requests therefore cannot both succeed.
--   * Overlap rule (same as the app): two showings on the same listing and date conflict when their starts
--     are less than 30 minutes apart (a showing lasts 30 minutes). Only CONFIRMED rows block.
--   * Existing confirmed bookings are never modified: the update only touches the one requested row.
-- Returns: confirmed | already_confirmed | conflict | not_requested | not_found
create or replace function public.confirm_showing_request(p_showing_id uuid, p_agent_id uuid, p_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.showings%rowtype;
  my_min int;
begin
  select * into s from public.showings where id = p_showing_id;
  if not found or s.agent_id is distinct from p_agent_id then return 'not_found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(s.listing_id::text || '|' || s.showing_date::text, 0));

  -- Re-read after the lock: the row may have changed while this call waited.
  select * into s from public.showings where id = p_showing_id;
  if s.status = 'confirmed' then return 'already_confirmed'; end if;
  if s.status <> 'requested' then return 'not_requested'; end if;

  my_min := public.showing_time_minutes(s.showing_time);
  if exists (
    select 1 from public.showings o
    where o.listing_id = s.listing_id and o.showing_date = s.showing_date
      and o.status = 'confirmed' and o.id <> s.id
      and (
        (my_min is not null and public.showing_time_minutes(o.showing_time) is not null
           and abs(public.showing_time_minutes(o.showing_time) - my_min) < 30)
        or ((my_min is null or public.showing_time_minutes(o.showing_time) is null)
           and lower(btrim(o.showing_time)) = lower(btrim(s.showing_time)))
      )
  ) then
    return 'conflict';
  end if;

  update public.showings set status = 'confirmed', responded_at = p_at, updated_at = now()
  where id = s.id and status = 'requested';
  return 'confirmed';
end;
$$;

revoke all on function public.confirm_showing_request(uuid, uuid, timestamptz) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.confirm_showing_request(uuid, uuid, timestamptz) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.confirm_showing_request(uuid, uuid, timestamptz) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.confirm_showing_request(uuid, uuid, timestamptz) to service_role;
  end if;
end $$;

-- Fast slot lookups for duplicate / conflict checks.
create index if not exists showings_slot_idx
  on public.showings (listing_id, showing_date, showing_time)
  where status in ('requested', 'confirmed');

commit;

-- Deliberately NOT added: a UNIQUE index on confirmed slots. It would fail if the
-- audit query above finds historical duplicates. Confirmation is guarded in the app by a
-- conditional update (requested -> confirmed) plus a conflict check; add the unique
-- index later, after the audit is clean, if you want a database-level guarantee.
