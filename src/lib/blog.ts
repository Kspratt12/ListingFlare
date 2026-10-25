export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  // Keeps an out-of-date article out of search results and the sitemap, and
  // shows readers an "out of date" notice, until it is rewritten.
  noindex?: boolean;
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
import { article as spwVsZillowShowcase } from "@/content/articles/single-property-website-vs-zillow-showcase";
import { article as openHouseFlyerGenerator } from "@/content/articles/open-house-flyer-generator";
import { article as agentWebsiteExamples } from "@/content/articles/real-estate-agent-website-examples";
import { article as freeRealEstateWebsite } from "@/content/articles/free-real-estate-website-options";
import { article as listingPageChecklist } from "@/content/articles/real-estate-listing-page-checklist";
import { article as listingPresentationOutline } from "@/content/articles/real-estate-listing-presentation-outline";
import { article as openHouseSignInVsQr } from "@/content/articles/open-house-sign-in-sheet-vs-qr-code";
import { article as listingPresentationTemplate } from "@/content/articles/real-estate-listing-presentation-template";
import { article as openHouseFollowUp } from "@/content/articles/open-house-follow-up";
import { article as openHouseSignInTemplate } from "@/content/articles/open-house-sign-in-sheet-template";
import { article as sellerUpdateTemplate } from "@/content/articles/seller-update-report-template";
import { article as leadFollowUpSequence } from "@/content/articles/real-estate-lead-follow-up-sequence";
import { article as singlePropertyTemplate } from "@/content/articles/single-property-website-template";
import { article as openHouseChecklist } from "@/content/articles/open-house-checklist";
import { article as listingMarketingPlan } from "@/content/articles/listing-marketing-plan-template";
import { article as preListingChecklist } from "@/content/articles/pre-listing-checklist";
import { article as priceReductionScripts } from "@/content/articles/seller-price-reduction-scripts";
import { article as chatbotVsVa } from "@/content/articles/ai-real-estate-chatbot-vs-virtual-assistant";

import { article as speedToLead } from "@/content/articles/speed-to-lead-real-estate";
import { article as respondToLeads } from "@/content/articles/how-to-respond-to-real-estate-leads";
import { article as zillowPremierCost } from "@/content/articles/zillow-premier-agent-cost-alternatives";
import { article as bestSoftwareListingAgents } from "@/content/articles/best-real-estate-software-for-listing-agents";
import { article as bestRealEstateChatbots } from "@/content/articles/best-real-estate-chatbots";
import { article as leadConversionRate } from "@/content/articles/real-estate-lead-conversion-rate";
import { article as bestOpenHouseApps } from "@/content/articles/best-open-house-apps";
import { article as yardSignQr } from "@/content/articles/real-estate-yard-sign-qr-code";
import { article as showingSoftware } from "@/content/articles/best-showing-scheduling-software-real-estate";
import { article as crmSoloAgents } from "@/content/articles/best-crm-for-solo-real-estate-agents";
import { article as spwCost } from "@/content/articles/single-property-website-cost";
import { article as leadNurtureCampaign } from "@/content/articles/real-estate-lead-nurture-campaign";
import { article as textRulesTcpa } from "@/content/articles/real-estate-text-message-rules-tcpa-can-spam";
import { article as aiFairHousing } from "@/content/articles/ai-chatbot-fair-housing-compliance-real-estate";
import { article as listingFaqQuestions } from "@/content/articles/listing-faq-questions-buyers-ask";
import { article as leadCaptureForm } from "@/content/articles/real-estate-lead-capture-form-best-practices";
import { article as listingAnalytics } from "@/content/articles/listing-page-analytics-what-to-track";
import { article as listingflareReview } from "@/content/articles/listingflare-review";
import { article as moreShowings } from "@/content/articles/how-to-get-more-showings";
import { article as afterHoursLeads } from "@/content/articles/after-hours-real-estate-leads";
import { article as leadMagnets } from "@/content/articles/real-estate-lead-magnet-ideas";

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
  spwVsZillowShowcase,
  openHouseFlyerGenerator,
  openHouseSignInVsQr,
  agentWebsiteExamples,
  freeRealEstateWebsite,
  listingPageChecklist,
  listingPresentationOutline,
  listingPresentationTemplate,
  openHouseFollowUp,
  openHouseSignInTemplate,
  sellerUpdateTemplate,
  leadFollowUpSequence,
  singlePropertyTemplate,
  openHouseChecklist,
  listingMarketingPlan,
  preListingChecklist,
  priceReductionScripts,
  chatbotVsVa,
  speedToLead,
  respondToLeads,
  zillowPremierCost,
  bestSoftwareListingAgents,
  bestRealEstateChatbots,
  leadConversionRate,
  bestOpenHouseApps,
  yardSignQr,
  showingSoftware,
  crmSoloAgents,
  spwCost,
  leadNurtureCampaign,
  textRulesTcpa,
  aiFairHousing,
  listingFaqQuestions,
  leadCaptureForm,
  listingAnalytics,
  listingflareReview,
  moreShowings,
  afterHoursLeads,
  leadMagnets,
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
  // Rank by shared keywords first, then same category, so related links point
  // at articles that actually cover the same topic (stronger internal linking
  // than category alone).
  const words = (p: BlogPost) =>
    new Set(p.keywords.flatMap((k) => k.toLowerCase().split(/W+/)).filter((w) => w.length > 3));
  const currentWords = words(current);
  const score = (p: BlogPost) => {
    let overlap = 0;
    words(p).forEach((w) => {
      if (currentWords.has(w)) overlap++;
    });
    return overlap + (p.category === current.category ? 3 : 0);
  };
  return allPosts
    .filter((p) => p.slug !== currentSlug && !p.noindex)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}
