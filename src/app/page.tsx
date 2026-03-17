"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Globe,
  BarChart3,
  Zap,
  Check,
  ArrowRight,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Stunning Property Pages",
    description:
      "Full-screen hero slideshows, photo galleries with lightbox, and elegant typography. Every listing looks like a $5,000 custom website.",
  },
  {
    icon: BarChart3,
    title: "Lead Capture & Analytics",
    description:
      "Built-in contact forms send leads straight to your dashboard. Track page views and know which listings get the most interest.",
  },
  {
    icon: Zap,
    title: "Live in Minutes",
    description:
      "Enter your property details, upload photos, and hit publish. Your listing site is live with a unique URL you can share anywhere.",
  },
  {
    icon: Sparkles,
    title: "Your Brand, Front & Center",
    description:
      "Your headshot, brokerage, and contact info appear on every listing page. Build recognition and trust with every showing request.",
  },
];

const included = [
  "Unlimited listing websites",
  "Custom agent branding on every page",
  "Photo gallery with lightbox viewer",
  "Lead capture forms with email alerts",
  "View count analytics per listing",
  "Mobile-responsive luxury design",
  "Unique shareable URL per listing",
  "Supabase-powered dashboard",
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1 },
  }),
};

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  return (
    <div className="bg-white">
      {/* Nav */}
      <nav className="fixed left-0 right-0 top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full bg-gray-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                <LayoutGrid className="h-4 w-4" />
                My Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-gray-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-32">
        {/* Subtle gradient bg */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/50 to-white" />
        <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-100/30 blur-3xl" />

        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              14-day free trial &mdash; no credit card required
            </div>
            <h1 className="font-serif text-4xl font-bold leading-tight text-gray-900 md:text-display-lg">
              Property websites
              <br />
              that sell homes.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-500 md:text-xl">
              Create stunning single-property listing sites in minutes.
              Impress sellers, attract buyers, and capture leads &mdash;
              all from one beautiful dashboard.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="group flex items-center gap-2 rounded-full bg-gray-950 px-8 py-4 text-base font-medium text-white transition-all hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-950/10"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/demo"
                className="flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
              >
                See it in action
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          {/* Preview mockup */}
          <motion.div
            id="preview"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20"
          >
            <div className="relative mx-auto max-w-4xl">
              {/* Browser chrome */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-gray-200" />
                    <div className="h-3 w-3 rounded-full bg-gray-200" />
                    <div className="h-3 w-3 rounded-full bg-gray-200" />
                  </div>
                  <div className="mx-auto rounded-md bg-white px-16 py-1 text-xs text-gray-400 border border-gray-100">
                    listingflare.com/listing/1847-grandview
                  </div>
                </div>
                {/* Screenshot placeholder — hero image */}
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=675&fit=crop&q=80"
                    alt="ListingFlare property page preview"
                    className="h-full w-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  <div className="absolute bottom-8 left-8 text-white md:bottom-12 md:left-12">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                      Exclusive Listing
                    </p>
                    <p className="mt-2 font-serif text-2xl font-bold md:text-4xl">
                      1847 Grandview Terrace
                    </p>
                    <p className="mt-1 text-sm text-white/70 md:text-base">
                      Pacific Palisades, CA 90272
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-sm text-white/80">
                      <span className="font-serif text-xl font-semibold md:text-2xl">
                        $4,750,000
                      </span>
                      <span className="h-5 w-px bg-white/30" />
                      <span>5 Beds</span>
                      <span>4.5 Baths</span>
                      <span>4,820 Sq Ft</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Glow effect under mockup */}
              <div className="absolute -bottom-8 left-1/2 -z-10 h-32 w-3/4 -translate-x-1/2 rounded-full bg-brand-200/30 blur-3xl" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
              Everything You Need
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Win more listings.
              <br />
              Close more deals.
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mt-16 grid gap-8 md:grid-cols-2"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeUp}
                className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8 transition-shadow hover:shadow-lg hover:shadow-gray-100"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-serif text-xl font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-relaxed text-gray-500">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-950 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
              Simple Pricing
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-white md:text-display-sm">
              One plan. Everything included.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-gray-400">
              No tiers, no upsells. Every agent gets the full platform.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mx-auto mt-14 max-w-lg"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm md:p-10">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-5xl font-bold text-white">
                  $150
                </span>
                <span className="text-lg text-gray-400">/month</span>
              </div>
              <p className="mt-2 text-gray-400">
                + $500 one-time setup fee
              </p>
              <div className="mt-1 inline-flex items-center rounded-full bg-brand-500/10 px-3 py-1 text-sm font-medium text-brand-400">
                14-day free trial included
              </div>

              <div className="mt-8 space-y-3">
                {included.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Check className="h-4 w-4 flex-shrink-0 text-brand-400" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/signup"
                className="mt-10 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-4 font-medium text-gray-900 transition-all hover:bg-gray-100"
              >
                Start Your 14-Day Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-4 text-center text-sm text-gray-500">
                No credit card required to start.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Your next listing deserves
              <br />
              a website this good.
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Join agents who are winning more listings and impressing
              their clients with beautiful property websites.
            </p>
            <Link
              href="/signup"
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-gray-950 px-8 py-4 text-base font-medium text-white transition-all hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-950/10"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <span className="font-serif text-lg font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </span>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} ListingFlare. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
