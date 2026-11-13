-- Rollback for migration 042 (checkout_attempts). Safe order: deploy the application version that does NOT call these
-- functions FIRST, then run this. Running it while the new code is live makes checkout fail closed (503) until the code is rolled back.
drop function if exists public.expire_checkout_session(text);
drop function if exists public.complete_checkout_session(text, text);
drop function if exists public.fail_checkout_attempt(uuid);
drop function if exists public.record_checkout_session(uuid, text, text, timestamptz);
drop function if exists public.claim_checkout_attempt(uuid, text, text, int);
drop table if exists public.checkout_attempts;
