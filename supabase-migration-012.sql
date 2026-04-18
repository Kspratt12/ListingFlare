-- ============================================================
-- ListingFlare — Migration 012
-- Activity tracking, hot scoring, feedback, testimonials, Google tokens
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Track first agent response time on leads for Speed-to-Lead metric
alter table public.leads
  add column if not exists first_response_at timestamptz,
  add column if not exists hot_score integer not null default 0;

create index if not exists idx_leads_first_response on public.leads(first_response_at);


-- 2. Showing feedback table
create table if not exists public.showing_feedback (
  id uuid primary key default gen_random_uuid(),
  showing_id uuid not null references public.showings(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,

  rating integer check (rating >= 1 and rating <= 5),
  notes text not null default '',
  interest_level text check (interest_level in ('very_interested', 'maybe', 'not_interested')),

  -- Unique token for public feedback form link
  token text not null unique default encode(gen_random_bytes(16), 'hex'),

  request_sent_at timestamptz,
  submitted_at timestamptz,

  created_at timestamptz not null default now()
);

alter table public.showing_feedback enable row level security;

create policy "Agents can view own feedback"
  on public.showing_feedback for select using (auth.uid() = agent_id);

create policy "Service can insert feedback"
  on public.showing_feedback for insert with check (true);

create policy "Public can submit via token"
  on public.showing_feedback for update using (true);

create policy "Public can read feedback by token for form"
  on public.showing_feedback for select using (true);

create index if not exists idx_showing_feedback_agent on public.showing_feedback(agent_id);
create index if not exists idx_showing_feedback_token on public.showing_feedback(token);


-- 3. Testimonials table
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,

  -- Testimonial content
  author_name text not null default '',
  rating integer check (rating >= 1 and rating <= 5),
  quote text not null default '',

  -- Publishing
  approved boolean not null default false,
  featured boolean not null default false,

  -- Unique token for public submission form
  token text not null unique default encode(gen_random_bytes(16), 'hex'),

  request_sent_at timestamptz,
  submitted_at timestamptz,

  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

create policy "Agents can view own testimonials"
  on public.testimonials for select using (auth.uid() = agent_id);

create policy "Agents can update own testimonials"
  on public.testimonials for update using (auth.uid() = agent_id);

create policy "Service can insert testimonials"
  on public.testimonials for insert with check (true);

create policy "Public can read testimonials by token"
  on public.testimonials for select using (true);

create policy "Public can submit via token"
  on public.testimonials for update using (approved = false);

create index if not exists idx_testimonials_agent on public.testimonials(agent_id);
create index if not exists idx_testimonials_token on public.testimonials(token);
create index if not exists idx_testimonials_approved on public.testimonials(approved) where approved = true;


-- 4. Google Calendar OAuth tokens on agent profile
alter table public.agent_profiles
  add column if not exists google_access_token text,
  add column if not exists google_refresh_token text,
  add column if not exists google_calendar_id text,
  add column if not exists google_token_expires_at timestamptz;


-- 5. Listing view tracking for hot score (per-lead visit counts)
create table if not exists public.lead_visits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  visit_count integer not null default 1,
  last_visit_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (lead_id, listing_id)
);

alter table public.lead_visits enable row level security;

create policy "Agents can view own lead visits"
  on public.lead_visits for select
  using (exists (
    select 1 from public.leads l
    where l.id = lead_id and l.agent_id = auth.uid()
  ));

create policy "Service can manage lead visits"
  on public.lead_visits for all
  using (true);

create index if not exists idx_lead_visits_lead on public.lead_visits(lead_id);
