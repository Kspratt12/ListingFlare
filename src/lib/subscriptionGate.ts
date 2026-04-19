import { createClient } from "@supabase/supabase-js";

// Check whether a user's subscription is in a state that grants access to
// paid features. Returns true for trialing AND active - both are allowed.
// Expired, canceled, past_due, unpaid all return false.
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await db
    .from("agent_profiles")
    .select("subscription_status, trial_ends_at")
    .eq("id", userId)
    .single();

  if (!profile) return false;

  const status = profile.subscription_status;

  if (status === "active") return true;

  if (status === "trialing") {
    // Double-check the trial hasn't expired - in case webhook hasn't fired yet
    if (!profile.trial_ends_at) return true;
    return new Date(profile.trial_ends_at) > new Date();
  }

  return false;
}
