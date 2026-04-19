-- ============================================================
-- ListingFlare - Migration 026
-- Agent handle (for subdomains) + brand color.
--
-- handle -> lets agents have their own subdomain like
--   kelvin.listingflare.com showing their listings. Lowercase
--   alphanumeric + hyphens only, 3-32 chars, enforced in the API.
--
-- brand_color -> hex color the agent picks in Settings. Tints
--   button/accent styling on their listing pages so the experience
--   feels branded to them.
--
-- Public reads of agent_profiles go through server-side API routes
-- using the admin client, which returns only safe fields (name,
-- brand_color, handle, headshot_url). No public RLS policy needed -
-- the existing "Agents can view own profile" policy stays intact.
--
-- Run in Supabase SQL Editor.
-- ============================================================

alter table public.agent_profiles
  add column if not exists handle text,
  add column if not exists brand_color text;

-- Case-insensitive unique handle, only for rows that have one.
create unique index if not exists idx_agent_profiles_handle_unique
  on public.agent_profiles (lower(handle))
  where handle is not null;
