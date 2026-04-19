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
      <Navbar topOffset={bannerVisible} />

      <HeroSlideshow listing={demoListing} />
      <PropertyDetails listing={demoListing} />
      <PhotoGallery photos={demoListing.photos} videos={demoListing.videos} />

      <VirtualTourEmbed src="https://my.matterport.com/show?play=1&lang=en-US&m=d7Kai9ZKt4D&hl=0&ts=0&brand=0" />

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
