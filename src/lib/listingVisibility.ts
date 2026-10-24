// A listing whose agent's free trial has ended (and who has not subscribed) is
// shown as "inactive" to visitors. Those pages should also stay out of Google's
// index and the sitemap. Mirrors the check in app/listing/[id]/page.tsx.
export function isAgentInactive(
  agent: { subscription_status?: string | null; trial_ends_at?: string | null } | null | undefined
): boolean {
  if (!agent) return false;
  if (agent.subscription_status !== "trialing") return false;
  if (!agent.trial_ends_at) return false;
  return new Date(agent.trial_ends_at) < new Date();
}

// Supabase returns an embedded one-to-one relation as an object or a
// one-item array depending on how it is declared; accept both.
export function firstRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}
