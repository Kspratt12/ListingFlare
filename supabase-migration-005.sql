-- ============================================================
-- ListingFlare — Migration 005
-- Add AI auto-reply draft for leads
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add auto_reply_draft column to store AI-generated follow-up drafts
alter table public.leads
  add column if not exists auto_reply_draft text;
