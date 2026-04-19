-- ============================================================
-- ListingFlare - Migration 018
-- Per-lead document storage: contracts, disclosures, inspections, etc.
--
-- Files go in a private Supabase Storage bucket called `lead-documents`
-- which must be created manually in the Supabase dashboard:
--   Storage > New bucket > name: lead-documents > public: OFF > save
--   Recommended file size limit: 50 MB
--   Recommended allowed MIME types: (leave blank for any, or restrict to
--     application/pdf, image/jpeg, image/png, image/webp, image/heic,
--     application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
--
-- Access is via short-lived signed URLs only. No public bucket.
-- ============================================================

create table if not exists public.lead_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.agent_profiles(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size integer not null,
  mime_type text,
  category text not null default 'other' check (category in ('contract', 'inspection', 'financing', 'disclosure', 'other')),
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_lead_documents_lead on public.lead_documents(lead_id);
create index if not exists idx_lead_documents_agent on public.lead_documents(agent_id);

alter table public.lead_documents enable row level security;

create policy "Agents can view own lead documents"
  on public.lead_documents for select
  using (auth.uid() = agent_id);

create policy "Agents can insert own lead documents"
  on public.lead_documents for insert
  with check (auth.uid() = agent_id);

create policy "Agents can update own lead documents"
  on public.lead_documents for update
  using (auth.uid() = agent_id);

create policy "Agents can delete own lead documents"
  on public.lead_documents for delete
  using (auth.uid() = agent_id);

-- Storage bucket policies for the lead-documents bucket.
-- These scope access to the authenticated agent only.
-- Run AFTER creating the bucket in the dashboard.

-- Allow agents to upload into their own folder (user_id/*)
create policy "Agents can upload lead docs into own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lead-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow agents to read their own uploads
create policy "Agents can read own lead docs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lead-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow agents to delete their own uploads
create policy "Agents can delete own lead docs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lead-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
