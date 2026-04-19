"use client";

import { demoListing } from "@/lib/demo-data";
import Navbar from "@/components/Navbar";
import HeroSlideshow from "@/components/HeroSlideshow";
import PropertyDetails from "@/components/PropertyDetails";
import PhotoGallery from "@/components/PhotoGallery";
import AgentBranding from "@/components/AgentBranding";
import DemoLeadForm from "@/components/DemoLeadForm";
import ListingChat from "@/components/ListingChat";
import VirtualTourEmbed from "@/components/VirtualTourEmbed";
import Footer from "@/components/Footer";
import MortgageCalculator from "@/components/MortgageCalculator";
import NeighborhoodInfo from "@/components/NeighborhoodInfo";
import PriceHistory from "@/components/PriceHistory";
import PropertyAttributes from "@/components/PropertyAttributes";
import ListingAlertSignup from "@/components/ListingAlertSignup";
import ListingStatsBar from "@/components/ListingStatsBar";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function DemoPage() {
  const [bannerVisible, setBannerVisible] = useState(true);

  return (
    <main className="relative">
      {/* Demo banner - sits above the navbar */}
      <AnimatePresence>
        {bannerVisible && (
          <motion.div
            initial={{ y: -40 }}
            animate={{ y: 0 }}
            exit={{ y: -40 }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 right-0 top-0 z-50 bg-brand-600 text-white"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
              <div className="flex flex-1 items-center justify-center gap-3 text-sm">
                <span className="hidden rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold sm:inline-block">
                  DEMO
                </span>
                <span>
                  This is a demo listing. Want one for your properties?
                </span>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-1 font-semibold underline decoration-white/40 underline-offset-2 transition-all hover:decoration-white"
                >
                  Start your free trial
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <button
                onClick={() => setBannerVisible(false)}
                className="ml-4 rounded-full p-1 transition-colors hover:bg-white/20"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar pushed down when banner is visible */}
      <Navbar
        topOffset={bannerVisible}
        shareTitle={`${demoListing.address.street}, ${demoListing.address.city}`}
        shareUrl="/demo"
        showPrint
      />

      <HeroSlideshow listing={demoListing} />
      <ListingStatsBar
        price={demoListing.price}
        sqft={demoListing.sqft}
        viewCount={1247}
        publishedAt="2026-02-14T12:00:00Z"
      />
      <PropertyDetails listing={demoListing} />
      <PhotoGallery photos={demoListing.photos} videos={demoListing.videos} />

      <VirtualTourEmbed src="https://my.matterport.com/show?play=1&lang=en-US&m=d7Kai9ZKt4D&hl=0&ts=0&brand=0" />

      <PropertyAttributes
        propertySubtype="Single Family Residence"
        architecturalStyle="Contemporary"
        yearBuilt={demoListing.yearBuilt}
        stories={2}
        lotSize={demoListing.lotSize}
        county="Los Angeles"
        subdivision="Palisades Highlands"
        mlsId="LA-2026-0048321"
        parcelNumber="4412-018-024"
        parkingSpaces={3}
        sqft={demoListing.sqft}
        pricePerSqft={Math.round(demoListing.price / demoListing.sqft)}
        propertyTaxAnnual={35625}
        hoaRequired={false}
        heatingType="Forced Air, Zoned"
        coolingType="Central Air, Zoned"
        waterSource="Public"
        sewerType="Public Sewer"
        roofType="Standing Seam Metal"
        constructionMaterial="Stucco, Stone"
        foundationType="Slab"
        fireplaceCount={2}
        laundryLocation="Laundry Room, Upper Level"
        basementType="None"
        appliances={[
          "Gaggenau Refrigerator",
          "Wolf Range",
          "Miele Dishwasher",
          "Sub-Zero Wine Fridge",
          "Double Oven",
          "Washer/Dryer",
        ]}
      />

      <PriceHistory
        currentPrice={demoListing.price}
        history={[
          { date: "2026-02-14T12:00:00Z", price: 5100000, event: "listed" },
          { date: "2026-03-22T12:00:00Z", price: 4900000, event: "reduced" },
          { date: "2026-04-11T12:00:00Z", price: 4750000, event: "reduced" },
        ]}
      />

      <MortgageCalculator
        listingPrice={demoListing.price}
        state={demoListing.address.state}
      />

      <NeighborhoodInfo
        street={demoListing.address.street}
        city={demoListing.address.city}
        state={demoListing.address.state}
        zip={demoListing.address.zip}
        schoolElementary="Palisades Charter Elementary"
        schoolMiddle="Paul Revere Middle School"
        schoolHigh="Palisades Charter High School"
      />

      <ListingAlertSignup
        listingId="demo"
        listingAddress={`${demoListing.address.street}, ${demoListing.address.city}, ${demoListing.address.state}`}
        isDemo
      />

      <AgentBranding agent={demoListing.agent} agentId="demo" />
      <DemoLeadForm />
      <ListingChat
        listing={{
          street: demoListing.address.street,
          city: demoListing.address.city,
          state: demoListing.address.state,
          zip: demoListing.address.zip,
          price: demoListing.price,
          beds: demoListing.beds,
          baths: demoListing.baths,
          sqft: demoListing.sqft,
          yearBuilt: demoListing.yearBuilt,
          lotSize: demoListing.lotSize,
          description: demoListing.description,
          features: demoListing.features,
          agentName: demoListing.agent.name,
          agentPhone: demoListing.agent.phone,
        }}
        listingId="demo"
        agentId="demo"
        isDemo
      />
      <Footer />
    </main>
  );
}
