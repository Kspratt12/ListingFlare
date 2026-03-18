import type { AgentProfile } from "./types";

export interface SubscriptionLimits {
  maxListings: number;
  maxPhotos: number;
  maxVideos: number;
  maxLeads: number;
  canReplyToLeads: boolean;
  canGenerateSocialPosts: boolean;
  canGenerateOpenHouseFlyer: boolean;
  maxAiDescriptions: number;
  isPaid: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  trialDaysLeft: number;
}

export function getSubscriptionLimits(profile: AgentProfile | null): SubscriptionLimits {
  if (!profile) {
    return {
      maxListings: 0, maxPhotos: 0, maxVideos: 0, maxLeads: 0,
      canReplyToLeads: false, canGenerateSocialPosts: false,
      canGenerateOpenHouseFlyer: false, maxAiDescriptions: 0,
      isPaid: false, isTrialing: false, isExpired: true, trialDaysLeft: 0,
    };
  }

  const isPaid = profile.subscription_status === "active";
  const isTrialing = profile.subscription_status === "trialing";
  const trialEnd = new Date(profile.trial_ends_at);
  const now = new Date();
  const trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isExpired = isTrialing && trialDaysLeft <= 0;

  if (isPaid) {
    return {
      maxListings: Infinity,
      maxPhotos: Infinity,
      maxVideos: 10,
      maxLeads: Infinity,
      canReplyToLeads: true,
      canGenerateSocialPosts: true,
      canGenerateOpenHouseFlyer: true,
      maxAiDescriptions: Infinity,
      isPaid: true,
      isTrialing: false,
      isExpired: false,
      trialDaysLeft: 0,
    };
  }

  // Trial (active or expired)
  return {
    maxListings: 1,
    maxPhotos: 5,
    maxVideos: 0,
    maxLeads: 5,
    canReplyToLeads: false,
    canGenerateSocialPosts: false,
    canGenerateOpenHouseFlyer: false,
    maxAiDescriptions: 1,
    isPaid: false,
    isTrialing: !isExpired,
    isExpired,
    trialDaysLeft,
  };
}
