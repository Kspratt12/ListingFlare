"use client";

import { motion } from "framer-motion";
import { Phone, Mail } from "lucide-react";
import type { PropertyListing } from "@/lib/demo-data";

interface Props {
  agent: PropertyListing["agent"];
}

export default function AgentBranding({ agent }: Props) {
  return (
    <section id="agent" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-brand-400">
            Listed By
          </p>
          <div className="mt-10 flex flex-col items-center gap-8 md:flex-row md:gap-12">
            {/* Headshot */}
            <div className="relative">
              <div className="h-40 w-40 overflow-hidden rounded-full border-4 border-brand-100 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={agent.headshotUrl}
                  alt={agent.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <div className="text-center md:text-left">
              <h3 className="font-serif text-3xl font-bold text-gray-900">
                {agent.name}
              </h3>
              <p className="mt-1 text-lg text-brand-500">{agent.title}</p>
              <p className="mt-1 text-gray-500">{agent.brokerage}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:gap-6">
                <a
                  href={`tel:${agent.phone}`}
                  className="flex items-center justify-center gap-2 text-gray-700 transition-colors hover:text-brand-600 md:justify-start"
                >
                  <Phone className="h-4 w-4" />
                  {agent.phone}
                </a>
                <a
                  href={`mailto:${agent.email}`}
                  className="flex items-center justify-center gap-2 text-gray-700 transition-colors hover:text-brand-600 md:justify-start"
                >
                  <Mail className="h-4 w-4" />
                  {agent.email}
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
