-- Rollback for migration 046. First remove every connected domain from the hosting project (Settings ->
-- Custom domain -> Remove, or the provider dashboard), otherwise the provider keeps routing those hosts
-- to the app, which will then answer "domain not connected".
-- Prefer disabling instead: remove the domains from the hosting project, then unset CUSTOM_DOMAINS_ENABLED.
-- (With the flag unset the middleware behaves exactly as before this feature, so a customer domain the
-- hosting provider still routes would show the regular site; removing it at the provider prevents that.)
begin;
drop function if exists public.resolve_custom_domain(text);
drop table if exists public.agent_custom_domains;
commit;
