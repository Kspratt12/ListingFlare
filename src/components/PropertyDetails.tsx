"use client";

import { motion } from "framer-motion";
import {
  BedDouble,
  Bath,
  Maximize,
  Calendar,
  LandPlot,
  Sparkles,
} from "lucide-react";
import type { PropertyListing } from "@/lib/demo-data";

interface Props {
  listing: PropertyListing;
}

const stats = (listing: PropertyListing) => [
  { icon: BedDouble, label: "Bedrooms", value: listing.beds.toString() },
  { icon: Bath, label: "Bathrooms", value: listing.baths.toString() },
  {
    icon: Maximize,
    label: "Square Feet",
    value: listing.sqft.toLocaleString(),
  },
  { icon: Calendar, label: "Year Built", value: listing.yearBuilt.toString() },
  { icon: LandPlot, label: "Lot Size", value: listing.lotSize },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1 },
  }),
};

export default function PropertyDetails({ listing }: Props) {
  return (
    <section id="details" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        {/* Stats row */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 gap-6 border-b border-gray-100 pb-16 md:grid-cols-5"
        >
          {stats(listing).map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              variants={fadeUp}
              className="text-center"
            >
              <stat.icon className="mx-auto mb-3 h-6 w-6 text-brand-400" />
              <p className="font-serif text-3xl font-semibold text-gray-900">
                {stat.value}
              </p>
              <p className="mt-1 text-sm uppercase tracking-wider text-gray-400">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Description */}
        <div className="mt-16 grid gap-12 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-3"
          >
            <h2 className="font-serif text-display-sm font-bold text-gray-900 md:text-display">
              About This Property
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-gray-600">
              {listing.description.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <h3 className="font-serif text-2xl font-semibold text-gray-900">
              Property Highlights
            </h3>
            <ul className="mt-6 space-y-4">
              {listing.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 flex-shrink-0 text-brand-400" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
