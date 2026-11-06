-- A2: signed-in agents must not be able to UPDATE rows in public.follow_ups.
--
-- WHY. Migration 009 let an agent update their own follow_ups rows ("Agents can update own follow_ups",
-- using auth.uid() = agent_id) so they could skip or cancel one. Nothing in the application does that: every
-- UPDATE and INSERT on follow_ups is made by the server with the service-role key (api/follow-ups/process and
-- api/follow-ups/schedule). The policy only added risk: an agent could point their own row's lead_id or listing_id
-- at another agent's lead or listing, and the send job (service role) would then email that lead as them.
-- The send job now also scopes its lead and listing lookups to the follow-up's own agent (code, same release).
--
-- STATUS. The two statements below were ALREADY RUN once in the Production SQL editor (Supabase project
-- pvnsirpfofxklqgxwdiz, "ListingFlare", Production) on 2026-11-06, outside version control, without capturing the
-- prior state. This file is the versioned record. It is idempotent: running it again changes nothing and re-checks
-- the result. The checks RAISE and roll the transaction back if anything is not as expected.
--
-- PRIOR STATE (reconstructed from migrations 009 and 034, NOT read from the live database before the change):
--   policy  "Agents can update own follow_ups"  ON public.follow_ups FOR UPDATE USING (auth.uid() = agent_id)
--   UPDATE granted to authenticated and anon by Supabase's default table privileges for tables in public.
--   (The "Public can read" and "Service can insert" policies were already dropped by migration 034.)
--
-- ROLLBACK (restores the defect; only to recover from an unexpected breakage). Do NOT re-grant UPDATE to anon.
--   begin;
--   grant update on public.follow_ups to authenticated;
--   create policy "Agents can update own follow_ups" on public.follow_ups for update using (auth.uid() = agent_id);
--   commit;
--
-- NOT TOUCHED: SELECT (api/dashboard/activity and api/leads/timeline read follow_ups with the signed-in session and the
-- "Agents can view own follow_ups" policy), INSERT, DELETE, the service role, and nothing is cascaded.
-- This is NOT approval to enable nurture sending (NURTURE_SENDS_ENABLED stays unset).

begin;

revoke update on public.follow_ups from authenticated, anon;
drop policy if exists "Agents can update own follow_ups" on public.follow_ups;

do $$
declare
  t   regclass := 'public.follow_ups'::regclass;
  n   integer;
begin
  -- Effective privileges (these follow role membership and inheritance).
  if has_table_privilege('authenticated', t, 'UPDATE') then raise exception 'A2: authenticated can still UPDATE follow_ups'; end if;
  if has_table_privilege('anon', t, 'UPDATE')          then raise exception 'A2: anon can still UPDATE follow_ups'; end if;

  -- A grant to PUBLIC (grantee 0) would apply to everyone.
  select count(*) into n from pg_class c, aclexplode(c.relacl) a
   where c.oid = t and a.grantee = 0 and a.privilege_type = 'UPDATE';
  if n > 0 then raise exception 'A2: PUBLIC has a table-level UPDATE grant on follow_ups'; end if;

  -- Column-level UPDATE grants to PUBLIC, authenticated or anon.
  select count(*) into n from pg_attribute att, aclexplode(att.attacl) x
   where att.attrelid = t and att.attacl is not null and x.privilege_type = 'UPDATE'
     and (x.grantee = 0 or x.grantee in (select oid from pg_roles where rolname in ('authenticated', 'anon')));
  if n > 0 then raise exception 'A2: a column-level UPDATE grant to PUBLIC/authenticated/anon remains on follow_ups'; end if;

  -- No policy may still allow those roles to UPDATE (an ALL policy would).
  select count(*) into n from pg_policies
   where schemaname = 'public' and tablename = 'follow_ups' and cmd in ('UPDATE', 'ALL')
     and (roles && array['authenticated', 'anon', 'public']::name[]);
  if n > 0 then raise exception 'A2: a policy that allows UPDATE for authenticated/anon/public remains on follow_ups'; end if;

  -- The server must keep what it needs: the send job updates and inserts, the activity routes read.
  if not has_table_privilege('service_role', t, 'UPDATE') then raise exception 'A2: service_role lost UPDATE on follow_ups'; end if;
  if not has_table_privilege('service_role', t, 'INSERT') then raise exception 'A2: service_role lost INSERT on follow_ups'; end if;
  if not has_table_privilege('authenticated', t, 'SELECT') then raise exception 'A2: authenticated lost SELECT on follow_ups'; end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'follow_ups' and policyname = 'Agents can view own follow_ups') <> 1
    then raise exception 'A2: the "Agents can view own follow_ups" policy is missing'; end if;

  raise notice 'A2 verified: no UPDATE for authenticated/anon/PUBLIC (table or column), no UPDATE policy; service_role UPDATE/INSERT and own-row SELECT intact.';
end
$$;

commit;
