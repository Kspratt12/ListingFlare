import { createClient } from "@supabase/supabase-js";
import { getSubscriptionLimits, type SubscriptionLimits } from "./subscription";
import type { AgentProfile } from "./types";

// Server-side entitlements. The ONE source of truth is getSubscriptionLimits() in
// subscription.ts, the same function the dashboard uses to hide or show controls, so
// the server can never be stricter or looser than the screen the agent sees.
//
// Only entitlements where the copy, the client checks AND the stated intent agree are
// enforced through this module (see seo/reports/2026-11-12-entitlement-matrix.md).
export type ServerEntitlement = "replyToLeads" | "socialPosts";

const FLAG: Record<ServerEntitlement, keyof SubscriptionLimits> = {
  replyToLeads: "canReplyToLeads",
  socialPosts: "canGenerateSocialPosts",
};

// Pure and synchronous so every status can be unit tested without a database.
export function entitlementFor(
  profile: Pick<AgentProfile, "subscription_status" | "trial_ends_at" | "stripe_subscription_id"> | null,
  key: ServerEntitlement
): boolean {
  if (!profile) return false;
  return getSubscriptionLimits(profile as AgentProfile)[FLAG[key]] === true;
}

export async function hasEntitlement(userId: string, key: ServerEntitlement): Promise<boolean> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await db
    .from("agent_profiles")
    .select("subscription_status, trial_ends_at, stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();
  return entitlementFor(data, key);
}

export const UPGRADE_REQUIRED = {
  replyToLeads: "Replying to leads from the dashboard is part of the paid plan.",
  socialPosts: "Subscription required to generate Social Media Pack.",
} as const;
