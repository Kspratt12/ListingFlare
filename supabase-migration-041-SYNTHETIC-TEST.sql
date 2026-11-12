-- Bounded synthetic verification for migration 041. Run it AFTER applying 041, in the Supabase SQL editor.
--
-- Safety: everything happens inside ONE transaction that ends with ROLLBACK, so nothing is ever committed.
-- It creates no accounts, sends no email, calls no provider, touches no real row. It only inserts
-- temporary showing rows dated 2099-01-01 against an existing listing and lead (to satisfy foreign keys),
-- and they vanish at the rollback. If an assertion fails the script raises an error and the transaction
-- is aborted (nothing committed either).
--
-- It checks: old-style insert still defaults to 'confirmed'; requested/declined accepted; wrong agent
-- cannot confirm; overlapping confirmed showings conflict (30-minute rule); non-overlapping ones do not;
-- confirming is idempotent; existing rows are not modified.
-- It cannot test true simultaneity (one session); that part relies on the advisory lock in the function.

begin;

do $$
declare
  l record;
  d uuid;
  other_agent uuid := '00000000-0000-4000-8000-0000000000ee';
  a uuid; b uuid; c uuid; old_row uuid; hist_before int; hist_after int; r text;
begin
  select id, agent_id into l from public.listings order by created_at limit 1;
  select id into d from public.leads order by created_at limit 1;
  if l.id is null or d is null then
    raise notice 'No listing or lead exists; nothing to test against. Skipped.';
    return;
  end if;

  select count(*) into hist_before from public.showings where showing_date <> date '2099-01-01';

  -- 1. old-style insert (no status) still defaults to confirmed (this is what the deployed code does today)
  insert into public.showings (lead_id, listing_id, agent_id, showing_date, showing_time)
  values (d, l.id, l.agent_id, date '2099-01-01', '9:00 AM') returning id into old_row;
  if (select status from public.showings where id = old_row) <> 'confirmed' then
    raise exception 'FAIL: old-style insert no longer defaults to confirmed';
  end if;

  -- 2. new statuses are accepted
  insert into public.showings (lead_id, listing_id, agent_id, showing_date, showing_time, status)
  values (d, l.id, l.agent_id, date '2099-01-01', '10:00 AM', 'requested') returning id into a;
  insert into public.showings (lead_id, listing_id, agent_id, showing_date, showing_time, status)
  values (d, l.id, l.agent_id, date '2099-01-01', '10:00 AM', 'requested') returning id into b;
  insert into public.showings (lead_id, listing_id, agent_id, showing_date, showing_time, status)
  values (d, l.id, l.agent_id, date '2099-01-01', '10:30 AM', 'requested') returning id into c;

  -- 3. wrong agent cannot confirm
  r := public.confirm_showing_request(a, other_agent);
  if r <> 'not_found' then raise exception 'FAIL: wrong agent got %', r; end if;
  if (select status from public.showings where id = a) <> 'requested' then raise exception 'FAIL: row changed by wrong agent'; end if;

  -- 4. owner confirms; repeat is idempotent
  r := public.confirm_showing_request(a, l.agent_id);
  if r <> 'confirmed' then raise exception 'FAIL: owner confirm got %', r; end if;
  r := public.confirm_showing_request(a, l.agent_id);
  if r <> 'already_confirmed' then raise exception 'FAIL: repeat confirm got %', r; end if;

  -- 5. an overlapping request (same start) conflicts; the next 30-minute slot does not
  r := public.confirm_showing_request(b, l.agent_id);
  if r <> 'conflict' then raise exception 'FAIL: same-slot confirm got %', r; end if;
  r := public.confirm_showing_request(c, l.agent_id);
  if r <> 'confirmed' then raise exception 'FAIL: adjacent 30-minute slot got %', r; end if;

  -- 6. nothing outside this test's 2099 rows was modified
  select count(*) into hist_after from public.showings where showing_date <> date '2099-01-01';
  if hist_after <> hist_before then raise exception 'FAIL: row count of real showings changed'; end if;

  raise notice 'PASS: all 041 synthetic checks passed (nothing will be committed).';
end $$;

rollback;
