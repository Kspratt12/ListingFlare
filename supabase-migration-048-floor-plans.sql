-- Migration 048: interactive floor plan on a listing (image + room markers linked to photos).
--
-- NOT APPLIED to any shared database. Tested locally. Rollback: supabase-migration-048-ROLLBACK.sql.
-- Public listing content (like photos): readable wherever the listing row is readable. Written by the
-- owner through the listing editor under the existing "own listings" update policy.
-- The app tolerates this column being absent (the floor plan section is simply not shown).

begin;

alter table public.listings
  add column if not exists floor_plan jsonb;

alter table public.listings drop constraint if exists listings_floor_plan_shape;
alter table public.listings add constraint listings_floor_plan_shape check (
  floor_plan is null
  or (
    jsonb_typeof(floor_plan) = 'object'
    and jsonb_typeof(floor_plan -> 'image') = 'object'
    and jsonb_typeof(floor_plan -> 'markers') = 'array'
    and jsonb_array_length(floor_plan -> 'markers') <= 40
    and pg_column_size(floor_plan) <= 32768
  )
);

-- Harmless if listings already has a table-level UPDATE grant; required if it uses column grants.
grant update (floor_plan) on public.listings to authenticated;

commit;
