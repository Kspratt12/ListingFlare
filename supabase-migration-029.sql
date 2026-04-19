-- ============================================================
-- ListingFlare — Migration 029
-- Per-listing AI chat toggle. Defaults to TRUE so every existing
-- published listing keeps chat enabled; agents can turn it off
-- on individual listings (e.g. a luxury off-market-style listing
-- where they want to handle all inbound themselves).
-- ============================================================

alter table public.listings
  add column if not exists ai_chat_enabled boolean not null default true;
