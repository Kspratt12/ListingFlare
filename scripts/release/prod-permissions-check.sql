-- READ-ONLY release check for the production Supabase project (pvnsirpfofxklqgxwdiz).
-- Reads catalog metadata only (grants, policies, triggers, function definitions, column names).
-- It does not select from any application table and changes nothing.
--
-- Answers:
--  1. Can the browser roles (anon, authenticated) UPDATE/INSERT agent_profiles columns, especially
--     subscription_status, trial_ends_at, stripe_*, complimentary_access?  (decides migration 049)
--  2. Do RLS policies or triggers block those changes even where a grant exists?
--  3. Which of the new migrations' objects already exist (045-048)?
--  4. What privileges do the browser roles have on listings (for the 045/048 column grants)?

-- 1a. Table-level privileges on agent_profiles and listings for browser roles
select 'table_priv' as check, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('agent_profiles', 'listings')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, grantee, privilege_type;

-- 1b. Column-level UPDATE/INSERT privileges on agent_profiles for browser roles
select 'column_priv' as check, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'agent_profiles'
  and grantee in ('anon', 'authenticated', 'PUBLIC') and privilege_type in ('UPDATE', 'INSERT')
order by column_name, grantee, privilege_type;

-- 1c. Direct answer for the protected fields: can each role update each column at all?
select 'can_update' as check, r.rolname as role, c.col,
       has_column_privilege(r.rolname, 'public.agent_profiles', c.col, 'UPDATE') as can_update
from (values ('anon'), ('authenticated')) r(rolname)
cross join (values ('subscription_status'), ('trial_ends_at'), ('stripe_customer_id'), ('stripe_subscription_id'),
                   ('complimentary_access'), ('setup_fee_paid'), ('google_refresh_token'), ('name'), ('brand_color'),
                   ('ai_approval_mode')) c(col)
where exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'agent_profiles' and column_name = c.col)
order by role, col;

-- 2a. RLS status and policies on agent_profiles
select 'rls' as check, relname, relrowsecurity, relforcerowsecurity
from pg_class where oid = 'public.agent_profiles'::regclass;

select 'policy' as check, policyname, cmd, roles::text, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'agent_profiles'
order by policyname;

-- 2b. Non-internal triggers on agent_profiles and their function bodies
select 'trigger' as check, t.tgname, p.proname, pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.agent_profiles'::regclass and not t.tgisinternal
order by t.tgname;

select 'trigger_fn' as check, p.proname, pg_get_functiondef(p.oid) as definition
from pg_trigger t join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.agent_profiles'::regclass and not t.tgisinternal;

-- 3. Which new objects already exist (expected: none, before 045-048 are applied)
select 'existing_column' as check, table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'agent_profiles' and column_name in ('show_other_listings', 'timezone'))
    or (table_name = 'listings' and column_name in ('ai_knowledge', 'floor_plan')))
order by table_name, column_name;

select 'existing_table' as check, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('listing_private_notes', 'agent_custom_domains', 'seller_report_schedules', 'seller_report_sends', 'seller_portals')
order by table_name;

select 'existing_function' as check, proname
from pg_proc where pronamespace = 'public'::regnamespace and proname in ('resolve_custom_domain');

-- 4. Storage policies for the listing-photos bucket (floor-plan uploads reuse it)
select 'storage_policy' as check, policyname, cmd, roles::text, qual, with_check
from pg_policies where schemaname = 'storage' and tablename = 'objects'
  and (qual ilike '%listing-photos%' or with_check ilike '%listing-photos%')
order by policyname;
