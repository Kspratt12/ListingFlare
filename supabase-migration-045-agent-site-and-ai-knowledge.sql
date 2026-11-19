-- Migration 045: agent "More listings" opt-in, agent-approved AI knowledge, private listing notes.
--
-- NOT YET APPLIED ANYWHERE. Review, then run in the Supabase SQL editor of the intended project.
-- Rollback: supabase-migration-045-ROLLBACK.sql
--
-- The application code tolerates this migration being absent:
--   * show_other_listings missing  -> "More listings" behaves as off
--   * ai_knowledge missing         -> chat answers from the base facts; the editor reports that the
--                                     extra knowledge could not be saved
--   * listing_private_notes missing -> the editor reports that notes could not be saved
--
-- 1) agent_profiles.show_other_listings
--    Opt-in for the "More listings from this agent" section on each of the agent's property pages.
--    Default OFF so existing pages do not change until the agent chooses it.
--
-- 2) listings.ai_knowledge
--    Extra facts the agent approves for the BUYER-FACING assistant (e.g. "Roof replaced 2022",
--    "HOA covers trash and lawn"). This is buyer-facing by design: published listing rows are
--    readable through the public "Public can view published listings" policy, so nothing private
--    may ever go in this column.
--
-- 3) public.listing_private_notes
--    Agent-only notes about a listing (seller motivation, lockbox reminders...). Separate table with
--    owner-only RLS so they can never be read through the public listing policy, and never selected
--    by the AI chat route.

begin;

alter table public.agent_profiles
  add column if not exists show_other_listings boolean not null default false;

-- agent_profiles has no table-level UPDATE grant for authenticated, only column grants (see migration
-- 044), so the Settings switch needs its own column grant. Row access is still limited by the
-- existing "own profile" RLS policy.
grant update (show_other_listings) on public.agent_profiles to authenticated;

alter table public.listings
  add column if not exists ai_knowledge text not null default '';

-- Harmless if listings already has a table-level UPDATE grant; required if it uses column grants.
grant update (ai_knowledge) on public.listings to authenticated;

alter table public.listings
  drop constraint if exists listings_ai_knowledge_length;
alter table public.listings
  add constraint listings_ai_knowledge_length check (char_length(ai_knowledge) <= 4000);

create table if not exists public.listing_private_notes (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 10000),
  updated_at timestamptz not null default now()
);

alter table public.listing_private_notes enable row level security;

revoke all on public.listing_private_notes from anon;
grant select, insert, update, delete on public.listing_private_notes to authenticated;

drop policy if exists "Owner reads own private notes" on public.listing_private_notes;
create policy "Owner reads own private notes" on public.listing_private_notes
  for select to authenticated using (agent_id = auth.uid());

drop policy if exists "Owner writes own private notes" on public.listing_private_notes;
create policy "Owner writes own private notes" on public.listing_private_notes
  for insert to authenticated
  with check (
    agent_id = auth.uid()
    and exists (select 1 from public.listings l where l.id = listing_id and l.agent_id = auth.uid())
  );

drop policy if exists "Owner updates own private notes" on public.listing_private_notes;
create policy "Owner updates own private notes" on public.listing_private_notes
  for update to authenticated
  using (agent_id = auth.uid())
  with check (
    agent_id = auth.uid()
    and exists (select 1 from public.listings l where l.id = listing_id and l.agent_id = auth.uid())
  );

drop policy if exists "Owner deletes own private notes" on public.listing_private_notes;
create policy "Owner deletes own private notes" on public.listing_private_notes
  for delete to authenticated using (agent_id = auth.uid());

commit;

-- Checks after running (separately):
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='agent_profiles' and column_name='show_other_listings';
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='listings' and column_name='ai_knowledge';
--   -- as anon (node scripts/check-public-access.mjs, or the REST API with the anon key):
--   -- listing_private_notes must return 0 rows / permission denied.
