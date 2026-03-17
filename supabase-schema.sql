-- ============================================================
-- ListingFlare — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Agent Profiles
-- Extends Supabase auth.users with agent-specific info
create table public.agent_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  title text not null default 'Real Estate Agent',
  brokerage text not null default '',
  phone text not null default '',
  email text not null default '',
  headshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_profiles enable row level security;

-- Agents can read/update only their own profile
create policy "Agents can view own profile"
  on public.agent_profiles for select
  using (auth.uid() = id);

create policy "Agents can update own profile"
  on public.agent_profiles for update
  using (auth.uid() = id);

create policy "Agents can insert own profile"
  on public.agent_profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.agent_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Listings
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),

  -- Address
  street text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',

  -- Property details
  price bigint not null default 0,
  beds integer not null default 0,
  baths numeric(3,1) not null default 0,
  sqft integer not null default 0,
  year_built integer,
  lot_size text not null default '',
  description text not null default '',
  features text[] not null default '{}',

  -- Photos stored as JSON array [{src, alt}]
  photos jsonb not null default '[]'::jsonb,

  -- Analytics
  view_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings enable row level security;

-- Agents can CRUD their own listings
create policy "Agents can view own listings"
  on public.listings for select
  using (auth.uid() = agent_id);

create policy "Agents can insert own listings"
  on public.listings for insert
  with check (auth.uid() = agent_id);

create policy "Agents can update own listings"
  on public.listings for update
  using (auth.uid() = agent_id);

create policy "Agents can delete own listings"
  on public.listings for delete
  using (auth.uid() = agent_id);

-- Public can view published listings (for the live property pages)
create policy "Public can view published listings"
  on public.listings for select
  using (status = 'published');

-- Index for faster agent lookups
create index idx_listings_agent_id on public.listings(agent_id);


-- 3. Leads (contact form submissions)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,

  name text not null default '',
  email text not null default '',
  phone text not null default '',
  message text not null default '',

  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Agents can view their own leads
create policy "Agents can view own leads"
  on public.leads for select
  using (auth.uid() = agent_id);

-- Agents can update own leads (mark as read)
create policy "Agents can update own leads"
  on public.leads for update
  using (auth.uid() = agent_id);

-- Anyone can insert a lead (public contact form)
create policy "Public can submit leads"
  on public.leads for insert
  with check (true);

-- Index for faster agent lookups
create index idx_leads_agent_id on public.leads(agent_id);
create index idx_leads_listing_id on public.leads(listing_id);


-- 4. Increment view count function (called from the public listing page)
create or replace function public.increment_view_count(listing_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.listings
  set view_count = view_count + 1
  where id = listing_uuid;
end;
$$;


-- 5. Storage bucket for listing photos and agent headshots
-- Run these separately if the SQL editor doesn't support storage API:
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('headshots', 'headshots', true)
on conflict (id) do nothing;

-- Storage policies: authenticated users can upload to their own folder
create policy "Authenticated users can upload listing photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Authenticated users can update own listing photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Authenticated users can delete own listing photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public can view listing photos"
  on storage.objects for select
  to public
  using (bucket_id = 'listing-photos');

create policy "Authenticated users can upload headshots"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'headshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Authenticated users can update own headshots"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'headshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Authenticated users can delete own headshots"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'headshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public can view headshots"
  on storage.objects for select
  to public
  using (bucket_id = 'headshots');
