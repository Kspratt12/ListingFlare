import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { SITE_AGENT_HEADER, siteAgentFor } from "@/lib/customDomain";
import type { Metadata } from "next";
import type { Listing, PublicAgentProfile } from "@/lib/types";
import { isAgentInactive } from "@/lib/listingVisibility";
import { NON_PUBLIC_STATUSES } from "@/lib/listingAiContext";
import ListingPageClient from "../ListingPageClient";
import { getListingRow, getPublicAgent, loadFloorPlan } from "../listingData";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface Props {
  params: { id: string };
}

// Unbranded property page (/listing/<slug>/unbranded), for places that require a link without agent
// or brokerage identity, such as an MLS "unbranded virtual tour" field. It shows the property facts,
// photos, videos and tour only: no agent name, photo, contact details, lead forms, chat, testimonials
// or links to the agent's other listings.
//
// Each MLS sets its own rules for what an unbranded link may contain. This page removes agent and
// brokerage identity; the agent remains responsible for checking their MLS's requirements.
//
// Not indexed (it duplicates the main page) and not counted in view statistics.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getListingRow(params.id);
  if (!data || NON_PUBLIC_STATUSES.has(data.status)) return { title: "Listing Not Found", robots: { index: false, follow: false } };
  return {
    title: [data.street, data.city, data.state].filter(Boolean).join(", "),
    robots: { index: false, follow: false },
    alternates: { canonical: `https://www.listingflare.com/listing/${data.slug || data.id}` },
  };
}

export default async function UnbrandedListingPage({ params }: Props) {
  const listing = await getListingRow(params.id);
  if (!listing || NON_PUBLIC_STATUSES.has(listing.status)) notFound();
  const siteAgent = siteAgentFor(headers().get("host"), headers().get(SITE_AGENT_HEADER));
  if (siteAgent && listing.agent_id !== siteAgent) notFound();
  const typedListing = listing as unknown as Listing;
  const agent = await getPublicAgent(typedListing.agent_id);
  // Same rule as the branded page: an expired trial hides the listing from visitors.
  if (!agent || isAgentInactive(agent)) notFound();
  // Props are serialized into the page source, so identity must be removed here, not just hidden.
  const floorPlan = await loadFloorPlan(typedListing.id, (typedListing.photos || []).map((p) => p.src));
  return <ListingPageClient listing={unbrandedListing(typedListing)} agent={UNBRANDED_AGENT} unbranded floorPlan={floorPlan} />;
}

// Every agent field the client could render or serialize, blanked.
const UNBRANDED_AGENT: PublicAgentProfile = {
  id: "",
  handle: null,
  name: "",
  title: "",
  brokerage: "",
  phone: "",
  email: "",
  headshot_url: null,
  brand_color: null,
  instagram: "",
  linkedin: "",
  zillow: "",
  realtor_com: "",
  facebook: "",
  website: "",
  calendly_url: "",
  license_number: null,
  subscription_status: "active",
  trial_ends_at: "",
};

function unbrandedListing(l: Listing): Listing {
  return {
    ...l,
    agent_id: "",
    brand_color: null,
    video_intro_url: null,
    co_agent_name: null,
    co_agent_title: null,
    co_agent_brokerage: null,
    co_agent_license: null,
    co_agent_phone: null,
    co_agent_email: null,
    co_agent_headshot_url: null,
  };
}
