-- Migration 035: atomic rate limit for the public showing form.
--
-- WHY: /api/showings/book is public and every accepted booking sends two emails and
-- a push notification. The old limit counted rows in `leads`, but a booking for a
-- lead that already exists adds no row, so repeat bookings were never counted.
-- A count in application code followed by a separate insert would also let
-- concurrent requests all pass the same stale count. This function makes the
-- check and the reservation one database transaction.
--
-- HOW: public.reserve_booking_attempt() takes two transaction-scoped advisory
-- locks, always in the same order (email, then listing), counts recent attempts,
-- and inserts a row only if every limit has room. Requests that could change the
-- same counter share a lock, so they run one at a time. Because the locks are
-- released at commit, the next holder's COUNT sees the previous insert. This
-- needs the default READ COMMITTED isolation level (PostgREST uses it).
--
-- THRESHOLDS (passed in by the app, see BOOKING_LIMITS in src/lib/showingBooking.ts):
--   window                          10 minutes
--   per email, per listing           3 accepted attempts
--   per email, across all listings   5 accepted attempts
--   per listing, all emails         15 accepted attempts
-- A rejected attempt is not recorded, so a blocked sender cannot extend a block.
-- Email addresses are compared lower-cased. Plus-addressing (a+1@x.com) and
-- multiple mailboxes are not detected: this is a rate limit, not identity proof.
--
-- ACCESS: RLS is on with no policies, and execute is granted to service_role only,
-- so anonymous and signed-in users cannot read the table or call the function.
-- The app calls it with the service role key.
--
-- DEPLOY ORDER: apply this BEFORE deploying the code that calls it. If the
-- function is missing, the app fails closed: /api/showings/book returns 503 and
-- creates nothing.
--
-- ROLLBACK (after reverting the code, otherwise bookings return 503):
--   drop function if exists public.reserve_booking_attempt(uuid, text, int, int, int, int);
--   drop table if exists public.booking_attempts;

begin;

create table if not exists public.booking_attempts (
  id bigint generated always as identity primary key,
  listing_id uuid not null,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists booking_attempts_email_listing_idx
  on public.booking_attempts (email, listing_id, created_at desc);
create index if not exists booking_attempts_listing_idx
  on public.booking_attempts (listing_id, created_at desc);
create index if not exists booking_attempts_created_idx
  on public.booking_attempts (created_at);

alter table public.booking_attempts enable row level security;
revoke all on public.booking_attempts from anon, authenticated;

create or replace function public.reserve_booking_attempt(
  p_listing_id uuid,
  p_email text,
  p_window_minutes int default 10,
  p_per_email_listing int default 3,
  p_per_email_all int default 5,
  p_per_listing int default 15
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_since timestamptz;
  v_count int;
begin
  if p_listing_id is null or v_email = '' or length(v_email) > 254
     or p_window_minutes is null or p_window_minutes < 1 or p_window_minutes > 1440
     or p_per_email_listing < 1 or p_per_email_all < 1 or p_per_listing < 1 then
    raise exception 'invalid arguments';
  end if;

  v_since := now() - make_interval(mins => p_window_minutes);

  -- Fixed lock order (email, then listing) so two requests can never wait on each other.
  perform pg_advisory_xact_lock(hashtextextended('booking_attempts:email:' || v_email, 0));
  perform pg_advisory_xact_lock(hashtextextended('booking_attempts:listing:' || p_listing_id::text, 0));

  select count(*) into v_count
    from public.booking_attempts
   where email = v_email and listing_id = p_listing_id and created_at >= v_since;
  if v_count >= p_per_email_listing then return false; end if;

  select count(*) into v_count
    from public.booking_attempts
   where email = v_email and created_at >= v_since;
  if v_count >= p_per_email_all then return false; end if;

  select count(*) into v_count
    from public.booking_attempts
   where listing_id = p_listing_id and created_at >= v_since;
  if v_count >= p_per_listing then return false; end if;

  insert into public.booking_attempts (listing_id, email) values (p_listing_id, v_email);

  -- Housekeeping: nothing older than a day is ever read.
  delete from public.booking_attempts where created_at < now() - interval '1 day';

  return true;
end;
$$;

revoke all on function public.reserve_booking_attempt(uuid, text, int, int, int, int)
  from public, anon, authenticated;
grant execute on function public.reserve_booking_attempt(uuid, text, int, int, int, int)
  to service_role;

commit;
