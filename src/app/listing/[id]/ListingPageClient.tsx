"use client";

import type { Listing, AgentProfile } from "@/lib/types";
import Navbar from "@/components/Navbar";
import HeroSlideshow from "@/components/HeroSlideshow";
import PropertyDetails from "@/components/PropertyDetails";
import PhotoGallery from "@/components/PhotoGallery";
import AgentBranding from "@/components/AgentBranding";
import LiveLeadForm from "@/components/LiveLeadForm";
import Footer from "@/components/Footer";
import type { PropertyListing } from "@/lib/demo-data";

interface Props {
  listing: Listing;
  agent: AgentProfile;
}

function toPropertyListing(listing: Listing, agent: AgentProfile): PropertyListing {
  return {
    address: {
      street: listing.street,
      city: listing.city,
      state: listing.state,
      zip: listing.zip,
    },
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    yearBuilt: listing.year_built || 0,
    lotSize: listing.lot_size,
    description: listing.description,
    features: listing.features,
    photos: listing.photos,
    agent: {
      name: agent.name,
      title: agent.title,
      brokerage: agent.brokerage,
      phone: agent.phone,
      email: agent.email,
      headshotUrl: agent.headshot_url || "",
    },
  };
}

export default function ListingPageClient({ listing, agent }: Props) {
  const propertyData = toPropertyListing(listing, agent);

  return (
    <main>
      <Navbar />
      <HeroSlideshow listing={propertyData} />
      <PropertyDetails listing={propertyData} />
      <PhotoGallery photos={propertyData.photos} />
      <AgentBranding agent={propertyData.agent} />
      <LiveLeadForm listingId={listing.id} agentId={listing.agent_id} />
      <Footer />
    </main>
  );
}
