"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/demo-data";
import type { PropertyListing } from "@/lib/demo-data";

interface Props {
  listing: PropertyListing;
}

export default function HeroSlideshow({ listing }: Props) {
  const [current, setCurrent] = useState(0);
  const photos = listing.photos.slice(0, 5); // Use first 5 for hero

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % photos.length),
    [photos.length]
  );
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + photos.length) % photos.length),
    [photos.length]
  );

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const scrollToDetails = () => {
    document.getElementById("details")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[current].src}
            alt={photos[current].alt}
            className="h-full w-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

      {/* Nav arrows */}
      <button
        onClick={prev}
        className="absolute left-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur-sm transition-all hover:bg-white/25"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      <button
        onClick={next}
        className="absolute right-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur-sm transition-all hover:bg-white/25"
        aria-label="Next image"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-32 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === current ? "w-10 bg-white" : "w-4 bg-white/40"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Hero content */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-20 md:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-white/70">
            Exclusive Listing
          </p>
          <h1 className="font-serif text-4xl font-bold text-white md:text-display-sm lg:text-display">
            {listing.address.street}
          </h1>
          <p className="mt-2 text-lg text-white/80 md:text-xl">
            {listing.address.city}, {listing.address.state}{" "}
            {listing.address.zip}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6 text-white/90">
            <span className="font-serif text-3xl font-semibold md:text-4xl">
              {formatPrice(listing.price)}
            </span>
            <span className="h-8 w-px bg-white/30" />
            <span>{listing.beds} Beds</span>
            <span>{listing.baths} Baths</span>
            <span>{listing.sqft.toLocaleString()} Sq Ft</span>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToDetails}
        className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2"
        aria-label="Scroll to details"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xs uppercase tracking-widest text-white/50">
            Explore
          </span>
          <ChevronRight className="h-5 w-5 rotate-90 text-white/50" />
        </motion.div>
      </button>
    </section>
  );
}
