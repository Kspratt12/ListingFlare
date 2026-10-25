-- Where do signups drop off? Read-only. Paste into the Supabase SQL editor.
-- Counts only, no personal details.

with a as (
  select p.id, p.created_at, p.subscription_status, p.trial_ends_at,
         (select count(*) from public.listings l where l.agent_id = p.id)                           as listings,
         (select count(*) from public.listings l where l.agent_id = p.id and l.status = 'published') as published,
         (select coalesce(sum(l.view_count), 0) from public.listings l where l.agent_id = p.id)      as views,
         (select count(*) from public.leads x where x.agent_id = p.id)                               as leads
  from public.agent_profiles p
)
select step, agents, round(100.0 * agents / nullif(max(agents) over (), 0)) as pct_of_signups
from (
  select 1 as o, 'Signed up'                      as step, count(*)                              as agents from a
  union all select 2, 'Created at least 1 listing',        count(*) filter (where listings  > 0) from a
  union all select 3, 'Published at least 1 listing',      count(*) filter (where published > 0) from a
  union all select 4, 'Listing got at least 1 view',       count(*) filter (where views     > 0) from a
  union all select 5, 'Received at least 1 lead',          count(*) filter (where leads     > 0) from a
  union all select 6, 'Became a paying subscriber',        count(*) filter (where subscription_status = 'active') from a
) f
order by o;

-- Subscription status breakdown, and how many trials have already ended
select subscription_status, count(*) as agents,
       count(*) filter (where trial_ends_at < now()) as trial_already_ended
from public.agent_profiles
group by 1 order by 2 desc;

-- Signups per week (is any marketing working?)
select date_trunc('week', created_at)::date as week, count(*) as signups
from public.agent_profiles
group by 1 order by 1 desc limit 12;
