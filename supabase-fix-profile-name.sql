-- ============================================================
-- ListingFlare - copy the signup name into agent_profiles
-- Run in Supabase SQL Editor. Safe to run more than once.
-- 1) New signups: the trigger now also copies the name entered at signup.
-- 2) Existing agents: fills in names that are blank, from auth metadata.
-- Review before running. It only touches rows where name is empty.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.agent_profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), '')
  );
  return new;
end;
$$;

update public.agent_profiles p
set name = trim(u.raw_user_meta_data->>'name')
from auth.users u
where u.id = p.id
  and coalesce(trim(p.name), '') = ''
  and coalesce(trim(u.raw_user_meta_data->>'name'), '') <> '';
