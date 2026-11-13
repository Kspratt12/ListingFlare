-- Rollback for migration 042 (checkout_attempts). NON-DESTRUCTIVE: it keeps the evidence.
-- Procedure (do the steps in this order):
--   1. Pause new checkouts: set CHECKOUT_PAUSED=on in Vercel and redeploy (new checkouts get 503; nothing else changes).
--   2. Let open Stripe sessions end: sessions expire 31 minutes after creation; wait at least 35 minutes, or expire them via the
--      Stripe API for the rows returned by:  select agent_id, stripe_session_id, status, lease_expires_at from public.checkout_attempts where status in ('creating','open');
--   3. Unset CHECKOUT_RESERVATION and redeploy (code path off). Then un-pause (unset CHECKOUT_PAUSED) if you want checkout back
--      (this restores the OLDER duplicate-checkout exposure for simultaneous attempts; see the PR notes).
--   4. Run this script. It REFUSES to run while any attempt is still creating/open and not yet past its expiry.
do $$
begin
  if exists (select 1 from public.checkout_attempts where status in ('creating', 'open') and lease_expires_at > now() - interval '5 minutes') then
    raise exception 'Refusing rollback: attempts are still creating/open (or expired less than 5 minutes ago). Pause checkout and wait, see the procedure above.';
  end if;
end $$;

drop function if exists public.expire_checkout_session(text);
drop function if exists public.complete_checkout_session(text, text);
drop function if exists public.fail_checkout_attempt(uuid);
drop function if exists public.record_checkout_session(uuid, text, text, timestamptz);
drop function if exists public.claim_checkout_attempt(uuid, text, text, int);
-- Evidence is preserved: the table is renamed, not dropped. Drop it later by hand once nobody needs the history.
alter table if exists public.checkout_attempts rename to checkout_attempts_archived;
