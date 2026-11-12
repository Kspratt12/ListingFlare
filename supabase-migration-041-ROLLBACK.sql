-- ROLLBACK for 041. NOT APPLIED. Use only if 041 must be undone.
--
-- Order: 1) roll the app code back (or deploy the previous production commit) FIRST, so no new
--           requests are written; 2) run this file.
-- Requests and declines created by the new flow cannot exist under the old constraint, so they are
-- copied to a backup table first, then marked 'canceled'. Historical rows are never touched.
-- The responded_at and timezone columns are left in place (harmless, and dropping them would lose data).

begin;

create table if not exists public.showings_041_backup as
  select * from public.showings where status in ('requested', 'declined');

update public.showings set status = 'canceled', updated_at = now() where status in ('requested', 'declined');

drop index if exists public.showings_slot_idx;

alter table public.showings drop constraint if exists showings_status_check;
alter table public.showings
  add constraint showings_status_check
  check (status in ('confirmed', 'completed', 'canceled', 'no_show'));

commit;
