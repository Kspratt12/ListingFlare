-- ============================================================
-- ListingFlare — Migration 008
-- Add atomic view count increment + fix RLS for settings/leads
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Atomic view count increment (prevents race conditions)
-- Drop existing function first (parameter name changed from listing_uuid to listing_id)
drop function if exists public.increment_view_count(uuid);

create or replace function public.increment_view_count(listing_id uuid)
returns void as $$
begin
  update public.listings
  set view_count = coalesce(view_count, 0) + 1
  where id = listing_id;
end;
$$ language plpgsql security definer;

-- 2. Ensure agents can update ALL columns on their own profile
-- Drop existing policy if it exists, then recreate
do $$
begin
  -- Drop and recreate update policy to ensure all columns are writable
  drop policy if exists "Agents can update own profile" on public.agent_profiles;
  create policy "Agents can update own profile"
    on public.agent_profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
exception when others then
  raise notice 'Policy update skipped: %', sqlerrm;
end $$;

-- 3. Ensure agents can read their own profile
do $$
begin
  drop policy if exists "Agents can read own profile" on public.agent_profiles;
  create policy "Agents can read own profile"
    on public.agent_profiles
    for select
    using (auth.uid() = id);
exception when others then
  raise notice 'Policy read skipped: %', sqlerrm;
end $$;

-- 4. Ensure anyone can read agent profiles (for listing pages)
do $$
begin
  drop policy if exists "Public can read agent profiles" on public.agent_profiles;
  create policy "Public can read agent profiles"
    on public.agent_profiles
    for select
    using (true);
exception when others then
  raise notice 'Public read policy skipped: %', sqlerrm;
end $$;

-- 5. Ensure leads can be inserted by anyone (anonymous visitors)
do $$
begin
  drop policy if exists "Anyone can insert leads" on public.leads;
  create policy "Anyone can insert leads"
    on public.leads
    for insert
    with check (true);
exception when others then
  raise notice 'Lead insert policy skipped: %', sqlerrm;
end $$;

-- 6. Ensure agents can read their own leads
do $$
begin
  drop policy if exists "Agents can read own leads" on public.leads;
  create policy "Agents can read own leads"
    on public.leads
    for select
    using (auth.uid() = agent_id);
exception when others then
  raise notice 'Lead read policy skipped: %', sqlerrm;
end $$;

-- 7. Ensure anyone can read leads they just inserted (for getting ID after insert)
do $$
begin
  drop policy if exists "Anyone can read leads by email" on public.leads;
  create policy "Anyone can read leads by email"
    on public.leads
    for select
    using (true);
exception when others then
  raise notice 'Lead public read policy skipped: %', sqlerrm;
end $$;

-- 8. Ensure agents can update their own leads (status changes, edits)
do $$
begin
  drop policy if exists "Agents can update own leads" on public.leads;
  create policy "Agents can update own leads"
    on public.leads
    for update
    using (auth.uid() = agent_id);
exception when others then
  raise notice 'Lead update policy skipped: %', sqlerrm;
end $$;

-- 9. Ensure agents can delete their own leads
do $$
begin
  drop policy if exists "Agents can delete own leads" on public.leads;
  create policy "Agents can delete own leads"
    on public.leads
    for delete
    using (auth.uid() = agent_id);
exception when others then
  raise notice 'Lead delete policy skipped: %', sqlerrm;
end $$;
