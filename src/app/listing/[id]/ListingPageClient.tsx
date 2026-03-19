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
import { formatPhone, formatLotSize } from "@/lib/formatters";
import ListingChat from "@/components/ListingChat";
import VirtualTourEmbed from "@/components/VirtualTourEmbed";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

interface Props {
  listing: Listing;
  agent: AgentProfile;
  isOwner?: boolean;
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
    lotSize: formatLotSize(listing.lot_size),
    description: listing.description,
    features: listing.features,
    photos: listing.photos,
    agent: {
      name: agent.name,
      title: agent.title,
      brokerage: agent.brokerage,
      phone: formatPhone(agent.phone),
      email: agent.email,
      headshotUrl: agent.headshot_url || "",
      instagram: agent.instagram,
      linkedin: agent.linkedin,
      zillow: agent.zillow,
      realtor_com: agent.realtor_com,
      facebook: agent.facebook,
      website: agent.website,
    },
  };
}

export default function ListingPageClient({ listing, agent, isOwner }: Props) {
  const propertyData = toPropertyListing(listing, agent);

  return (
    <main>
      {isOwner && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white/95 px-5 py-2.5 shadow-lg backdrop-blur-sm">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <span className="h-4 w-px bg-gray-200" />
            <Link
              href={`/dashboard/edit/${listing.id}`}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Listing
            </Link>
          </div>
        </div>
      )}
      <Navbar />
      <HeroSlideshow listing={propertyData} />
      <PropertyDetails listing={propertyData} />
      <PhotoGallery photos={propertyData.photos} videos={listing.videos} />

      {listing.virtual_tour_url && (
        <VirtualTourEmbed src={listing.virtual_tour_url} />
      )}

      <AgentBranding agent={propertyData.agent} agentId={listing.agent_id} />
      <LiveLeadForm listingId={listing.id} agentId={listing.agent_id} />
      <ListingChat
        listing={{
          street: listing.street,
          city: listing.city,
          state: listing.state,
          zip: listing.zip,
          price: listing.price,
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          yearBuilt: listing.year_built || 0,
          lotSize: listing.lot_size,
          description: listing.description,
          features: listing.features,
          agentName: agent.name,
          agentPhone: agent.phone,
        }}
        listingId={listing.id}
        agentId={listing.agent_id}
        calendlyUrl={agent.calendly_url || undefined}
      />
      <Footer />
    </main>
  );
}
