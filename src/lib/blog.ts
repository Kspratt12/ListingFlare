export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  author: string;
  category: string;
  keywords: string[];
  readingTime: number;
  coverImage: string;
  coverImageAlt: string;
  content: string;
}

// Registry — import all articles here
import { article as howToGetLeads } from "@/content/articles/how-to-get-leads-real-estate-agent";
import { article as bestLeadGenTools } from "@/content/articles/best-lead-generation-tools-real-estate-agents";
import { article as leadsForNewAgents } from "@/content/articles/real-estate-leads-new-agents";
import { article as leadScoringCriteria } from "@/content/articles/lead-scoring-criteria-real-estate-agents";
import { article as firstTimeSellerGuide } from "@/content/articles/first-time-home-sellers-guide";
import { article as raleighHousingMarket } from "@/content/articles/raleigh-nc-housing-market-2026";
import { article as sellHouseFastRaleigh } from "@/content/articles/how-to-sell-your-house-fast-raleigh-nc";
import { article as movingToRaleigh } from "@/content/articles/moving-to-raleigh-nc-guide";
import { article as singlePropertyWebsite } from "@/content/articles/how-to-create-single-property-website";
import { article as marketListing } from "@/content/articles/how-to-market-real-estate-listing";
import { article as listingDescriptions } from "@/content/articles/real-estate-listing-description-examples";
import { article as openHouseIdeas } from "@/content/articles/open-house-ideas-attract-buyers";
import { article as winMoreListings } from "@/content/articles/how-to-win-more-listings-real-estate-agent";
import { article as socialMediaPosts } from "@/content/articles/real-estate-social-media-post-ideas";
import { article as raleighMarketing } from "@/content/articles/best-real-estate-marketing-ideas-raleigh-nc";
import { article as charlotteMarket } from "@/content/articles/charlotte-nc-housing-market-2026";
import { article as durhamMarket } from "@/content/articles/durham-nc-housing-market-2026";
import { article as austinMarket } from "@/content/articles/austin-tx-housing-market-2026";
import { article as whatNotToFix } from "@/content/articles/what-not-to-fix-when-selling-a-house";
import { article as homeStagingTips } from "@/content/articles/home-staging-tips-sell-faster";
import { article as chooseAgent } from "@/content/articles/how-to-choose-a-real-estate-agent";
import { article as buyingVsRenting } from "@/content/articles/buying-vs-renting-a-home";
import { article as costToSell } from "@/content/articles/how-much-does-it-cost-to-sell-a-house";
import { article as stopLosingLeadsZillow } from "@/content/articles/how-to-stop-losing-leads-to-zillow";
import { article as realEstateLeadGen } from "@/content/articles/real-estate-lead-generation";
import { article as bestLeadGenRealtors } from "@/content/articles/best-lead-generation-for-realtors";
import { article as aiForRealEstate } from "@/content/articles/ai-for-real-estate-agents";
import { article as bestAiToolsMarketing } from "@/content/articles/best-ai-tools-real-estate-marketing";
import { article as bestSpwBuilders } from "@/content/articles/best-single-property-website-builders";
import { article as bestRelaAlternatives } from "@/content/articles/best-rela-alternatives-single-property-websites";
import { article as zillowStealsLeads } from "@/content/articles/how-zillow-steals-leads-from-listing-agents";
import { article as cribflyerVsRelaVsListingflare } from "@/content/articles/cribflyer-vs-rela-vs-listingflare";
import { article as listingAgentsBuyerLeads } from "@/content/articles/how-listing-agents-capture-buyer-leads";
import { article as listingsToLeadsAlts } from "@/content/articles/listings-to-leads-alternatives";
import { article as propertysimpleAlts } from "@/content/articles/propertysimple-alternatives";
import { article as elevenlabsReview } from "@/content/articles/elevenlabs-review-real-estate-agents";
import { article as manychatReview } from "@/content/articles/manychat-review-real-estate-agents";
import { article as trainualReview } from "@/content/articles/trainual-review-real-estate-brokerages";
import { article as aragonAiReview } from "@/content/articles/aragon-ai-review-real-estate-agents";
import { article as surferSeoReview } from "@/content/articles/surfer-seo-review-real-estate-agents";
import { article as restreamReview } from "@/content/articles/restream-review-real-estate-agents";
import { article as castmagicReview } from "@/content/articles/castmagic-review-real-estate-agents";
import { article as descriptReview } from "@/content/articles/descript-ai-review-real-estate-agents";
import { article as aiIsaTools } from "@/content/articles/best-ai-isa-tools-real-estate";
import { article as followUpBossAlts } from "@/content/articles/follow-up-boss-alternatives";
import { article as aiVirtualStaging } from "@/content/articles/best-ai-virtual-staging-software";
import { article as aiToolsRealtors } from "@/content/articles/best-ai-tools-for-realtors";

const allPosts: BlogPost[] = [
  howToGetLeads,
  bestLeadGenTools,
  leadsForNewAgents,
  leadScoringCriteria,
  firstTimeSellerGuide,
  raleighHousingMarket,
  sellHouseFastRaleigh,
  movingToRaleigh,
  singlePropertyWebsite,
  marketListing,
  listingDescriptions,
  openHouseIdeas,
  winMoreListings,
  socialMediaPosts,
  raleighMarketing,
  charlotteMarket,
  durhamMarket,
  austinMarket,
  whatNotToFix,
  homeStagingTips,
  chooseAgent,
  buyingVsRenting,
  costToSell,
  stopLosingLeadsZillow,
  realEstateLeadGen,
  bestLeadGenRealtors,
  aiForRealEstate,
  bestAiToolsMarketing,
  bestSpwBuilders,
  bestRelaAlternatives,
  zillowStealsLeads,
  cribflyerVsRelaVsListingflare,
  listingAgentsBuyerLeads,
  listingsToLeadsAlts,
  propertysimpleAlts,
  elevenlabsReview,
  manychatReview,
  trainualReview,
  aragonAiReview,
  surferSeoReview,
  restreamReview,
  castmagicReview,
  descriptReview,
  aiIsaTools,
  followUpBossAlts,
  aiVirtualStaging,
  aiToolsRealtors,
];

// Sort by date descending
allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export function getAllPosts(): BlogPost[] {
  return allPosts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return allPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return allPosts.slice(0, limit);
  return allPosts
    .filter((p) => p.slug !== currentSlug)
    .sort((a, b) => {
      const aMatch = a.category === current.category ? 1 : 0;
      const bMatch = b.category === current.category ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, limit);
}
