-- 041: showing REQUESTS (additive). NOT APPLIED. Review, then run once in the Supabase SQL editor.
--
-- Adds two statuses, "requested" and "declined", and a responded_at timestamp.
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

-- New rows should never default to "confirmed". The app always sets status explicitly.
alter table public.showings alter column status set default 'requested';

alter table public.showings add column if not exists responded_at timestamptz;

-- Fast slot lookups for duplicate / conflict checks.
create index if not exists showings_slot_idx
  on public.showings (listing_id, showing_date, showing_time)
  where status in ('requested', 'confirmed');

commit;

-- Deliberately NOT added: a UNIQUE index on confirmed slots. It would fail if the
-- audit query above finds historical duplicates. Confirmation is guarded in the app by a
-- conditional update (requested -> confirmed) plus a conflict check; add the unique
-- index later, after the audit is clean, if you want a database-level guarantee.
