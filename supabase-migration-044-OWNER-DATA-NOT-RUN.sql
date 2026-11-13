-- DATA STEP FOR OWNER APPROVAL ONLY (not run, not part of the migration). One row, guarded by the owner's exact id AND email.
-- 1) Mark the owner account complimentary. Existing listings, leads and settings are untouched.
update public.agent_profiles p
   set complimentary_access = 'owner'
 where p.id = '8feda89a-66e0-4f8a-bfd8-527135cf6535'
   and exists (select 1 from auth.users u where u.id = p.id and u.email = 'kelvinspratt11@gmail.com');
-- 2) OPTIONAL, separate approval: stop the account pretending to hold a Stripe subscription (it holds a stale TEST-mode id that exists
--    nowhere). Status stays 'active' because every existing server and public-page check treats 'active' as the paid state.
-- update public.agent_profiles set stripe_subscription_id = null, stripe_customer_id = null
--  where id = '8feda89a-66e0-4f8a-bfd8-527135cf6535' and complimentary_access = 'owner';
