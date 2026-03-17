"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Upload,
  Eye,
  Bell,
  MousePointerClick,
  Send,
  PlusCircle,
  Image as ImageIcon,
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
  "SSL-secured & lightning fast",
];

const walkthrough = [
  {
    step: "01",
    title: "Add your property details",
    description: "Enter the address, price, beds, baths, and description. Our AI can even write the listing description for you.",
    icon: PlusCircle,
    mockup: "create",
  },
  {
    step: "02",
    title: "Upload stunning photos",
    description: "Drag and drop your property photos. They display in a full-screen hero slideshow and masonry gallery.",
    icon: Upload,
    mockup: "photos",
  },
  {
    step: "03",
    title: "Publish & share your link",
    description: "Hit publish and your listing gets a unique URL. Share it on social media, in emails, or on your business card.",
    icon: Globe,
    mockup: "published",
  },
  {
    step: "04",
    title: "Leads come straight to you",
    description: "Buyers fill out the contact form on your listing. You get an instant email notification and can reply from your dashboard.",
    icon: Bell,
    mockup: "leads",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1 },
  }),
};

/* ── Animated Dashboard Mockups ── */
function DashboardMockup({ activeStep }: { activeStep: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-300" />
        </div>
        <div className="mx-auto rounded-md bg-white px-12 py-1 text-xs text-gray-400 border border-gray-100">
          listingflare.com/dashboard
        </div>
      </div>

      {/* Dashboard content */}
      <div className="relative bg-gray-50 p-6" style={{ minHeight: 340 }}>
        <AnimatePresence mode="wait">
          {activeStep === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {/* Sidebar hint */}
              <div className="flex gap-4">
                <div className="hidden w-44 flex-shrink-0 space-y-2 md:block">
                  <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white">My Listings</div>
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">Leads</div>
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">Settings</div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-serif text-lg font-bold text-gray-900">Create Listing</p>
                    <div className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">Save & Publish</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Street Address</p>
                      <div className="rounded-md border border-brand-400 bg-white px-3 py-2 text-sm text-gray-900 ring-2 ring-brand-100">1847 Grandview Terrace</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Price</p>
                        <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900">$4,750,000</div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Beds</p>
                        <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900">5</div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Baths</p>
                        <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900">4.5</div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-500">Description</p>
                        <span className="flex items-center gap-1 text-xs text-brand-600 font-medium"><Sparkles className="h-3 w-3" /> AI Generate</span>
                      </div>
                      <div className="rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-400 h-16">Perched above the coastline with panoramic ocean views...</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeStep === "photos" && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="flex gap-4">
                <div className="hidden w-44 flex-shrink-0 space-y-2 md:block">
                  <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white">My Listings</div>
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">Leads</div>
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">Settings</div>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="font-serif text-lg font-bold text-gray-900">Photos & Media</p>
                  <div className="rounded-lg border-2 border-dashed border-brand-300 bg-brand-50/30 p-6 text-center">
                    <Upload className="mx-auto h-8 w-8 text-brand-400" />
                    <p className="mt-2 text-sm font-medium text-gray-600">Drag & drop your photos here</p>
                    <p className="mt-1 text-xs text-gray-400">PNG, JPG up to 20MB each</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      "photo-1600596542815-ffad4c1539a9",
                      "photo-1600607687939-ce8a6c25118c",
                      "photo-1600566753086-00f18fb6b3ea",
                      "photo-1600585154340-be6161a56a0c",
                    ].map((id, i) => (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.15 }}
                        className="relative aspect-square overflow-hidden rounded-lg"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://images.unsplash.com/${id}?w=200&h=200&fit=crop&q=80`} alt="" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all hover:bg-black/20">
                          <span className="rounded-full bg-green-500 p-0.5 text-white absolute top-1 right-1">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>4 of 12 photos uploaded</span>
                    <div className="flex-1 rounded-full bg-gray-200 h-1.5">
                      <div className="rounded-full bg-brand-500 h-1.5 w-1/3 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeStep === "published" && (
            <motion.div
              key="published"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="flex gap-4">
                <div className="hidden w-44 flex-shrink-0 space-y-2 md:block">
                  <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white">My Listings</div>
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">Leads</div>
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">Settings</div>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="font-serif text-lg font-bold text-gray-900">My Listings</p>
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div className="relative h-36 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=300&fit=crop&q=80" alt="" className="h-full w-full object-cover" />
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="absolute right-2 top-2 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700"
                      >
                        Published
                      </motion.span>
                    </div>
                    <div className="p-4">
                      <p className="font-serif font-semibold text-gray-900">1847 Grandview Terrace</p>
                      <p className="text-xs text-gray-500">Pacific Palisades, CA 90272</p>
                      <p className="mt-1 font-serif text-lg font-bold text-gray-900">$4,750,000</p>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Eye className="h-3 w-3" /> 0 views</span>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600"
                        >
                          <MousePointerClick className="h-3 w-3" />
                          Share Link
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeStep === "leads" && (
            <motion.div
              key="leads"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="flex gap-4">
                <div className="hidden w-44 flex-shrink-0 space-y-2 md:block">
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">My Listings</div>
                  <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white flex items-center justify-between">
                    Leads
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white font-bold">3</span>
                  </div>
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">Settings</div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-serif text-lg font-bold text-gray-900">Leads</p>
                    <div className="flex gap-1.5">
                      <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-medium text-white">All (3)</span>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700">New (3)</span>
                    </div>
                  </div>
                  {[
                    { name: "Sarah Mitchell", msg: "I'd love to schedule a showing this weekend!", time: "2 min ago", new: true },
                    { name: "James Rodriguez", msg: "Is the property still available?", time: "1 hour ago", new: true },
                    { name: "Emily Chen", msg: "Beautiful home! Can I get more details?", time: "3 hours ago", new: true },
                  ].map((lead, i) => (
                    <motion.div
                      key={lead.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.2 }}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
                    >
                      {lead.new && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">{lead.name}</p>
                          <span className="text-[10px] text-gray-400">{lead.time}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 truncate">{lead.msg}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">New</span>
                          <span className="flex items-center gap-1 text-[10px] text-brand-600 font-medium cursor-pointer hover:underline"><Send className="h-2.5 w-2.5" /> Reply</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextStep = useCallback(() => {
    setActiveIndex((i) => (i + 1) % walkthrough.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextStep, 4000);
    return () => clearInterval(timer);
  }, [nextStep]);

  return (
    <section className="bg-gray-50 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
            How It Works
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
            From photos to published
            <br />
            in under 5 minutes.
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[340px_1fr] lg:gap-8">
          {/* Steps */}
          <div className="space-y-2">
            {walkthrough.map((step, i) => (
              <button
                key={step.step}
                onClick={() => setActiveIndex(i)}
                className={`group flex w-full items-start gap-4 rounded-xl p-4 text-left transition-all ${
                  i === activeIndex
                    ? "bg-white shadow-lg shadow-gray-200/50 border border-gray-200"
                    : "hover:bg-white/60"
                }`}
              >
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                    i === activeIndex
                      ? "bg-brand-500 text-white"
                      : "bg-gray-200 text-gray-500 group-hover:bg-gray-300"
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-sm font-semibold transition-colors ${
                    i === activeIndex ? "text-gray-900" : "text-gray-500"
                  }`}>
                    {step.title}
                  </p>
                  {i === activeIndex && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-1 text-sm leading-relaxed text-gray-500"
                    >
                      {step.description}
                    </motion.p>
                  )}
                  {/* Progress bar */}
                  {i === activeIndex && (
                    <div className="mt-3 h-1 w-full rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 4, ease: "linear" }}
                        key={activeIndex}
                        className="h-1 rounded-full bg-brand-500"
                      />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <DashboardMockup activeStep={walkthrough[activeIndex].mockup} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

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
              Impress sellers, attract buyers, and capture leads.
              All from one beautiful dashboard.
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
                    src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=3840&h=2160&fit=crop&q=90&auto=format"
                    alt="ListingFlare property page preview"
                    loading="eager"
                    fetchPriority="high"
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

      {/* How It Works — Animated Walkthrough */}
      <HowItWorks />

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
          <div className="flex items-center gap-5 text-sm text-gray-500">
            <Link href="/privacy" className="underline underline-offset-2 transition-colors hover:text-gray-900">Privacy Policy</Link>
            <span>&middot;</span>
            <Link href="/terms" className="underline underline-offset-2 transition-colors hover:text-gray-900">Terms of Service</Link>
            <span>&middot;</span>
            <span>&copy; {new Date().getFullYear()} ListingFlare</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
