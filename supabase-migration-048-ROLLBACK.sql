-- Rollback for migration 048. Deletes every saved floor plan (the uploaded images stay in storage).
-- Prefer leaving the column in place: older app versions never select it.
begin;
alter table public.listings drop constraint if exists listings_floor_plan_shape;
alter table public.listings drop column if exists floor_plan;
commit;
