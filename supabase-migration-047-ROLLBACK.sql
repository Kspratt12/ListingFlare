-- Rollback for migration 047. Deletes every report schedule and the send history.
-- Prefer disabling first: unset SELLER_REPORTS_ENABLED (stops all sends without data loss).
begin;
drop table if exists public.seller_report_sends;
drop table if exists public.seller_report_schedules;
commit;
