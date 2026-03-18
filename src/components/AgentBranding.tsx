"use client";

import { motion } from "framer-motion";
import { Phone, Mail, Globe } from "lucide-react";
import type { PropertyListing } from "@/lib/demo-data";
import { formatPhone } from "@/lib/formatters";
import Link from "next/link";

interface Props {
  agent: PropertyListing["agent"];
  agentId?: string;
}

export default function AgentBranding({ agent, agentId }: Props) {
  const profileLink = agentId ? `/agent/${agentId}` : null;
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
              {profileLink ? (
                <Link href={profileLink} className="block h-40 w-40 overflow-hidden rounded-full border-4 border-brand-100 shadow-lg transition-transform hover:scale-105">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={agent.headshotUrl} alt={agent.name} loading="lazy" className="h-full w-full object-cover" />
                </Link>
              ) : (
                <div className="h-40 w-40 overflow-hidden rounded-full border-4 border-brand-100 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={agent.headshotUrl} alt={agent.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center md:text-left">
              <h3 className="font-serif text-3xl font-bold text-gray-900">
                {profileLink ? (
                  <Link href={profileLink} className="hover:text-brand-600 transition-colors">{agent.name}</Link>
                ) : agent.name}
              </h3>
              <p className="mt-1 text-lg text-brand-500">{agent.title}</p>
              <p className="mt-1 text-gray-500">{agent.brokerage}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:gap-6">
                <a
                  href={`tel:${agent.phone}`}
                  className="flex items-center justify-center gap-2 text-gray-700 transition-colors hover:text-brand-600 md:justify-start"
                >
                  <Phone className="h-4 w-4" />
                  {formatPhone(agent.phone)}
                </a>
                <a
                  href={`mailto:${agent.email}`}
                  className="flex items-center justify-center gap-2 text-gray-700 transition-colors hover:text-brand-600 md:justify-start"
                >
                  <Mail className="h-4 w-4" />
                  {agent.email}
                </a>
              </div>

              {/* Social Links */}
              {(agent.instagram || agent.linkedin || agent.zillow || agent.realtor_com || agent.facebook || agent.website) && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  {agent.instagram && (
                    <a href={agent.instagram} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      Instagram
                    </a>
                  )}
                  {agent.linkedin && (
                    <a href={agent.linkedin} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      LinkedIn
                    </a>
                  )}
                  {agent.zillow && (
                    <a href={agent.zillow} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L1 9h3v12h6v-7h4v7h6V9h3L12 0z"/></svg>
                      Zillow
                    </a>
                  )}
                  {agent.realtor_com && (
                    <a href={agent.realtor_com} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L1 9h3v12h6v-7h4v7h6V9h3L12 0z"/></svg>
                      Realtor.com
                    </a>
                  )}
                  {agent.facebook && (
                    <a href={agent.facebook} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </a>
                  )}
                  {agent.website && (
                    <a href={agent.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-600">
                      <Globe className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              )}
              {profileLink && (
                <Link
                  href={profileLink}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-brand-300 bg-brand-50 px-5 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
                >
                  View All Listings
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
