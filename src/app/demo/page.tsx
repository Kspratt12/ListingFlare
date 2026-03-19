"use client";

import { demoListing } from "@/lib/demo-data";
import Navbar from "@/components/Navbar";
import HeroSlideshow from "@/components/HeroSlideshow";
import PropertyDetails from "@/components/PropertyDetails";
import PhotoGallery from "@/components/PhotoGallery";
import AgentBranding from "@/components/AgentBranding";
import DemoLeadForm from "@/components/DemoLeadForm";
import ListingChat from "@/components/ListingChat";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function DemoPage() {
  const [bannerVisible, setBannerVisible] = useState(true);

  return (
    <main className="relative">
      {/* Demo banner — sits above the navbar */}
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
                  This is a demo listing &mdash; want one for your properties?
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

      {/* Virtual Tour Demo — Full-bleed hero style */}
      <section className="relative bg-gray-950">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
              Interactive Experience
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-white md:text-display-sm">
              Walk Through the Home
            </h2>
            <p className="mt-3 text-lg text-gray-400">
              Explore every room in immersive 3D
            </p>
          </div>
        </div>
        <div className="relative w-full" style={{ height: "80vh", minHeight: "500px", maxHeight: "800px" }}>
          <iframe
            src="https://my.matterport.com/show?play=1&lang=en-US&m=d7Kai9ZKt4D&hl=0&ts=0&brand=0"
            title="Virtual Tour"
            className="absolute inset-0 h-full w-full"
            allowFullScreen
          />
        </div>
      </section>

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
