-- Migration 036: lock down public.testimonials (strict consent).
--
-- STATUS: ALREADY APPLIED to production on 2026-10-30 by the project owner, in the
-- Supabase SQL Editor. This file records it so the repo matches the database. Do not
-- rely on re-running it: it was run once there, and the statements below are the exact
-- text that was applied.
--
-- WHY: migration 012 created policies that were never narrowed. Anyone holding the
-- public key could read every row including token, lead_id and quotes that clients
-- declined to publish ("Public can read testimonials by token", USING true), insert a
-- row for any agent with approved and featured already true ("Service can insert
-- testimonials", WITH CHECK true), and rewrite or reassign any unapproved row
-- ("Public can submit via token"). The agent update policy also let an agent change
-- any column of their own rows, including publishing a submission the client declined.
--
-- WHAT:
--   * Policies: the four old ones are dropped (a fifth DROP IF EXISTS names the new
--     public-read policy, only so the script can be re-run). Two SELECT policies remain: the public
--     read of approved + submitted rows, and the existing "Agents can view own
--     testimonials". No INSERT, UPDATE or DELETE policy remains for any browser role.
--   * Privileges: anon and authenticated lose SELECT, INSERT, UPDATE and DELETE on the
--     table, then get SELECT on the seven display columns only
--     (id, agent_id, author_name, rating, quote, approved, submitted_at).
--   * The DO block at the end aborts and rolls the whole transaction back if the
--     effective result is not exactly this, including inherited or PUBLIC grants and
--     any column not listed.
--
-- UNAFFECTED: the server routes use the service role, which bypasses these policies and
-- keeps its own grants: /api/testimonials/request (insert, re-request, delete) and
-- /api/testimonials/submit (lookup by token; sets approved from the client's consent
-- tick, which is unchanged). The public agent page reads through the service role. The
-- one browser read, TestimonialShowcase, selects only display columns, so it still works.
--
-- NOT CHANGED: TRUNCATE, REFERENCES, TRIGGER and MAINTAIN grants to anon and
-- authenticated on this table (a separate, table-independent grants item), and the
-- separate product_testimonials table.
--
-- VERIFIED after applying: the read-only post-check matched every expectation
-- (policy roles and expressions, RLS enabled, per-column privileges, raw ACL with
-- service_role intact, no triggers, 0 rows). Anonymous Data API checks with the public
-- key only: the seven display columns read as HTTP 200; select=token, select=*, and an
-- INSERT, UPDATE and DELETE were each refused with HTTP 401, code 42501, "permission
-- denied for table testimonials" (PostgREST uses 401 for the anonymous role, 403 for a
-- signed-in one). The table had no rows, so row visibility and the submission-to-display
-- flow were NOT exercised. There is no agent approval screen; there is no agent
-- UPDATE path any more by design (strict consent).

BEGIN;
SET LOCAL lock_timeout = '5s';

-- 1. Policies: remove every public write path, the owner update path, and the open read.
DROP POLICY IF EXISTS "Public can read testimonials by token" ON public.testimonials;
DROP POLICY IF EXISTS "Public can submit via token" ON public.testimonials;
DROP POLICY IF EXISTS "Service can insert testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Agents can update own testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Public can read approved testimonials" ON public.testimonials;

-- Public display: only approved, submitted testimonials are readable by anyone.
CREATE POLICY "Public can read approved testimonials" ON public.testimonials
  FOR SELECT TO anon, authenticated
  USING (approved = true AND submitted_at IS NOT NULL);

-- "Agents can view own testimonials" (SELECT, auth.uid() = agent_id) is kept exactly as it is.
-- No INSERT, UPDATE or DELETE policy remains for any browser role. The server routes
-- (request, token submission) use the service role, which bypasses these policies and
-- is not touched here. Publication consent keeps working as before: the submit route
-- sets approved from the client's consent tick.

-- 2. Privileges: no browser INSERT/UPDATE/DELETE at all; SELECT only on the display columns.
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.testimonials FROM anon, authenticated;
GRANT SELECT (id, agent_id, author_name, rating, quote, approved, submitted_at) ON TABLE public.testimonials TO anon, authenticated;

-- 3. Abort and roll back if the effective result is not exactly what is intended
-- (this also catches inherited and PUBLIC grants, and any column not listed above).
DO $$
declare
  bad text := '';
  a record;
  r text;
  pol text[];
  display_cols text[] := array['id','agent_id','author_name','rating','quote','approved','submitted_at'];
begin
  for a in
    select attname::text as col from pg_attribute
    where attrelid = 'public.testimonials'::regclass and attnum > 0 and not attisdropped
  loop
    foreach r in array array['anon', 'authenticated'] loop
      if has_column_privilege(r, 'public.testimonials', a.col, 'INSERT') then
        bad := bad || ' ' || r || '-insert:' || a.col;
      end if;
      if has_column_privilege(r, 'public.testimonials', a.col, 'UPDATE') then
        bad := bad || ' ' || r || '-update:' || a.col;
      end if;
      if has_column_privilege(r, 'public.testimonials', a.col, 'SELECT') <> (a.col = any (display_cols)) then
        bad := bad || ' ' || r || '-select:' || a.col;
      end if;
    end loop;
  end loop;

  foreach r in array array['anon', 'authenticated'] loop
    if has_table_privilege(r, 'public.testimonials', 'INSERT')
       or has_table_privilege(r, 'public.testimonials', 'UPDATE')
       or has_table_privilege(r, 'public.testimonials', 'DELETE') then
      bad := bad || ' ' || r || '-table-write';
    end if;
  end loop;

  select array_agg(polname::text order by polname) into pol from pg_policy where polrelid = 'public.testimonials'::regclass;
  if pol is distinct from array['Agents can view own testimonials', 'Public can read approved testimonials'] then
    bad := bad || ' policies:' || coalesce(array_to_string(pol, '|'), 'none');
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.testimonials'::regclass and polcmd <> 'r') then
    bad := bad || ' non-select-policy-present';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.testimonials'::regclass) then
    bad := bad || ' rls-not-enabled';
  end if;

  if bad <> '' then
    raise exception 'unexpected testimonials access state:%', bad;
  end if;
end $$;

COMMIT;
