-- Rollback for migration 045. Deletes all agent private notes and approved AI knowledge.
-- Export them first if they should be kept:
--   select * from public.listing_private_notes;
--   select id, ai_knowledge from public.listings where ai_knowledge <> '';
begin;
drop table if exists public.listing_private_notes;
alter table public.listings drop constraint if exists listings_ai_knowledge_length;
alter table public.listings drop column if exists ai_knowledge;
alter table public.agent_profiles drop column if exists show_other_listings;
commit;
