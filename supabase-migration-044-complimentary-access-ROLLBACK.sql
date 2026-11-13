-- Rollback for migration 044. Only after the application code that reads complimentary_access is rolled back or tolerates its absence.
alter table public.agent_profiles drop column if exists complimentary_access;
