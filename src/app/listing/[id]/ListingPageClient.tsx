"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { Listing, AgentProfile } from "@/lib/types";
import Navbar from "@/components/Navbar";
import HeroSlideshow from "@/components/HeroSlideshow";
import PropertyDetails from "@/components/PropertyDetails";
import PhotoGallery from "@/components/PhotoGallery";
import AgentBranding from "@/components/AgentBranding";
import ShowingScheduler from "@/components/ShowingScheduler";
import Footer from "@/components/Footer";
import type { PropertyListing } from "@/lib/demo-data";
import { formatPhone, formatLotSize } from "@/lib/formatters";
import VirtualTourEmbed from "@/components/VirtualTourEmbed";
import MortgageCalculator from "@/components/MortgageCalculator";
import NeighborhoodInfo from "@/components/NeighborhoodInfo";
import OtherListings from "@/components/OtherListings";
import PriceHistory from "@/components/PriceHistory";
import PropertyAttributes from "@/components/PropertyAttributes";
import ListingAlertSignup from "@/components/ListingAlertSignup";
import ListingStatsBar from "@/components/ListingStatsBar";

const ListingChat = dynamic(() => import("@/components/ListingChat"), {
  ssr: false,
});
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

  // Track repeat visits - alert agent when someone views 3+ times
  useEffect(() => {
    if (isOwner) return;
    try {
      const key = `lf_views_${listing.id}`;
      const prev = parseInt(localStorage.getItem(key) || "0", 10);
      const count = prev + 1;
      localStorage.setItem(key, String(count));

      // Alert on 3rd and 6th visit (not every time)
      if (count === 3 || count === 6) {
        fetch("/api/leads/hot-visitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId: listing.id,
            agentId: listing.agent_id,
            viewCount: count,
          }),
        }).catch(() => {});
      }
    } catch {
      // localStorage not available
    }
  }, [listing.id, listing.agent_id, isOwner]);

  // Structured data for Google rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: `${listing.street}, ${listing.city}, ${listing.state}`,
    description: listing.description,
    url: `https://www.listingflare.com/listing/${listing.slug || listing.id}`,
    datePosted: listing.created_at,
    ...(listing.photos?.[0]?.src ? { image: listing.photos[0].src } : {}),
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: "USD",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.street,
      addressLocality: listing.city,
      addressRegion: listing.state,
      postalCode: listing.zip,
      addressCountry: "US",
    },
    numberOfRooms: listing.beds,
    numberOfBathroomsTotal: listing.baths,
    floorSize: listing.sqft ? { "@type": "QuantitativeValue", value: listing.sqft, unitCode: "FTK" } : undefined,
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
      <Navbar
        shareTitle={`${listing.street}, ${listing.city}`}
        shareUrl={listing.slug ? `/listing/${listing.slug}` : `/listing/${listing.id}`}
        showPrint
      />
      <HeroSlideshow listing={propertyData} />
      <ListingStatsBar
        price={listing.price}
        sqft={listing.sqft}
        viewCount={listing.view_count}
        publishedAt={listing.published_at}
        createdAt={listing.created_at}
      />
      <PropertyDetails listing={propertyData} />
      <PhotoGallery photos={propertyData.photos} videos={listing.videos} />

      {listing.virtual_tour_url && (
        <VirtualTourEmbed src={listing.virtual_tour_url} />
      )}

      <PropertyAttributes
        propertySubtype={listing.property_subtype}
        architecturalStyle={listing.architectural_style}
        yearBuilt={listing.year_built}
        stories={listing.stories}
        lotSize={listing.lot_size}
        county={listing.county}
        subdivision={listing.subdivision}
        mlsId={listing.mls_id}
        parcelNumber={listing.parcel_number}
        parkingSpaces={listing.parking_spaces}
        sqft={listing.sqft}
        pricePerSqft={listing.price > 0 && listing.sqft > 0 ? Math.round(listing.price / listing.sqft) : null}
        propertyTaxAnnual={listing.property_tax_annual}
        hoaRequired={listing.hoa_required}
        hoaFeeMonthly={listing.hoa_fee_monthly}
        heatingType={listing.heating_type}
        coolingType={listing.cooling_type}
        waterSource={listing.water_source}
        sewerType={listing.sewer_type}
        roofType={listing.roof_type}
        constructionMaterial={listing.construction_material}
        foundationType={listing.foundation_type}
        fireplaceCount={listing.fireplace_count}
        laundryLocation={listing.laundry_location}
        basementType={listing.basement_type}
        appliances={listing.appliances_included}
      />

      {listing.price_history && listing.price_history.length > 0 && (
        <PriceHistory history={listing.price_history} currentPrice={listing.price} />
      )}

      {listing.price > 0 && (
        <MortgageCalculator listingPrice={listing.price} state={listing.state} />
      )}

      {listing.street && listing.city && listing.state && (
        <NeighborhoodInfo
          street={listing.street}
          city={listing.city}
          state={listing.state}
          zip={listing.zip || ""}
          schoolElementary={listing.school_elementary}
          schoolMiddle={listing.school_middle}
          schoolHigh={listing.school_high}
        />
      )}

      <ListingAlertSignup
        listingId={listing.id}
        listingAddress={`${listing.street}, ${listing.city}, ${listing.state}`}
      />

      <AgentBranding agent={propertyData.agent} agentId={listing.agent_id} />
      <ShowingScheduler listingId={listing.id} agentId={listing.agent_id} />

      <OtherListings
        agentId={listing.agent_id}
        currentListingId={listing.id}
        agentName={agent.name || ""}
      />
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
