-- Migration 034: close row-level-security policies that were left wide open.
--
-- Several earlier migrations added policies like "Service can insert ..." with
-- `using (true)` / `with check (true)` on the public role. The server code uses
-- the service role key, which BYPASSES row-level security, so those policies were
-- never needed. All they did was let anyone holding the public (anon) key read
-- or write those tables.
--
-- Checked against the code before writing this: follow_ups, messages,
-- listing_notifications and showing_feedback are only touched from server API
-- routes (service role, or the signed-in agent's own session, which the
-- "auth.uid() = agent_id" policies still cover). lead_visits is not used at all.
--
-- NOT touched on purpose: the open read policy on `testimonials`, because the
-- public agent page and testimonial showcase read that table from the browser.
--
-- To apply: paste into the Supabase SQL editor and run. Safe to run twice.
-- To undo a single policy, re-create it from the migration listed beside it.

drop policy if exists "Public can read follow_ups" on public.follow_ups;                       -- migration 009
drop policy if exists "Service can insert follow_ups" on public.follow_ups;                    -- migration 009
drop policy if exists "Service can insert inbound messages" on public.messages;                -- migration 010
drop policy if exists "Service can insert listing notifications" on public.listing_notifications; -- migration 010
drop policy if exists "Service can insert feedback" on public.showing_feedback;                -- migration 012
drop policy if exists "Public can submit via token" on public.showing_feedback;                -- migration 012
drop policy if exists "Public can read feedback by token for form" on public.showing_feedback; -- migration 012
drop policy if exists "Service can manage lead visits" on public.lead_visits;                  -- migration 012
