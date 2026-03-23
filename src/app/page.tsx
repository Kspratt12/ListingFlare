"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAllPosts } from "@/lib/blog";
import {
  Sparkles,
  Globe,
  BarChart3,
  Zap,
  Check,
  ArrowRight,
  LayoutGrid,
  Upload,
  Eye,
  Bell,
  MousePointerClick,
  Send,
  PlusCircle,
  Image as ImageIcon,
  MessageCircle,
  View,
  CalendarCheck,
  UserPlus,
  BellRing,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Impress sellers. Win more listings.",
    description:
      "Full-screen slideshows, photo galleries, and elegant typography. Sellers see a $5,000 custom website. You build it in minutes.",
  },
  {
    icon: MessageCircle,
    title: "Answer buyers instantly so they don't leave",
    description:
      "Every listing has an AI assistant that answers questions about bedrooms, features, and neighborhood info. It captures the lead before the buyer closes the tab.",
  },
  {
    icon: BarChart3,
    title: "Respond in seconds, not hours",
    description:
      "Leads go straight to your dashboard. AI drafts a personalized reply instantly. By the time other agents check their email, you have already responded.",
  },
  {
    icon: View,
    title: "Keep buyers on your page longer",
    description:
      "Embed Matterport, Kuula, or any 3D tour directly on your listing page. More time on page means more engagement and more showings booked.",
  },
  {
    icon: Zap,
    title: "Live in five minutes. Converting overnight.",
    description:
      "Enter your details, upload photos, hit publish. Your listing is live with its own URL. Share it anywhere and start capturing leads immediately.",
  },
  {
    icon: Sparkles,
    title: "Every showing request builds your name",
    description:
      "Your headshot, brokerage, and contact info on every page. Buyers and sellers associate your brand with a premium experience.",
  },
];

const included = [
  "Unlimited listing websites",
  "24/7 AI chat assistant on every listing",
  "Lead capture with AI-drafted replies",
  "Virtual tour embeds (Matterport, Kuula)",
  "AI-powered descriptions & photo captions",
  "Analytics dashboard & weekly reports",
  "Social media posts & open house flyers",
  "Custom agent branding on every page",
];

const walkthrough = [
  {
    step: "01",
    title: "Add your property details",
    description: "Enter the address, price, beds, and baths. The AI writes the listing description for you if you want. Takes about two minutes.",
    icon: PlusCircle,
    mockup: "create",
  },
  {
    step: "02",
    title: "Upload photos & video",
    description: "Drag and drop your photos and videos. They show up in a full-screen slideshow and gallery that looks like a custom-built site.",
    icon: Upload,
    mockup: "photos",
  },
  {
    step: "03",
    title: "Publish and share the link",
    description: "Your listing page goes live instantly with its own URL. Share it anywhere: social media, email, text, business cards.",
    icon: Globe,
    mockup: "published",
  },
  {
    step: "04",
    title: "Wake up to leads and booked showings",
    description: "A buyer lands on your page at night, asks a question, gets an answer, and books a showing. You get notified with the lead already in your dashboard.",
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
      <div className="relative overflow-hidden bg-gray-50 p-4 md:p-6" style={{ height: 380 }}>
        <AnimatePresence initial={false}>
          {activeStep === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 p-4 md:p-6 space-y-4"
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 p-4 md:p-6 space-y-4"
            >
              <div className="flex gap-4">
                <div className="hidden w-44 flex-shrink-0 space-y-2 md:block">
                  <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white">My Listings</div>
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">Leads</div>
                  <div className="rounded-lg px-3 py-2 text-xs text-gray-500">Settings</div>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="font-serif text-lg font-bold text-gray-900">Photos & Videos</p>
                  <div className="rounded-lg border-2 border-dashed border-brand-300 bg-brand-50/30 p-5 text-center">
                    <Upload className="mx-auto h-7 w-7 text-brand-400" />
                    <p className="mt-1.5 text-sm font-medium text-gray-600">Drag & drop photos and videos</p>
                    <p className="mt-0.5 text-xs text-gray-400">Photos up to 20MB &middot; Videos up to 500MB &middot; Supports 4K/8K</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      "photo-1600596542815-ffad4c1539a9",
                      "photo-1600607687939-ce8a6c25118c",
                      "photo-1600566753086-00f18fb6b3ea",
                    ].map((id, i) => (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.15 }}
                        className="relative aspect-square overflow-hidden rounded-lg"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://images.unsplash.com/${id}?w=200&h=200&fit=crop&q=80`} alt="Property listing photo uploaded to ListingFlare real estate software" loading="lazy" className="h-full w-full object-cover" />
                        <span className="rounded-full bg-green-500 p-0.5 text-white absolute top-1 right-1">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      </motion.div>
                    ))}
                    {/* Video thumbnail */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.45 }}
                      className="relative aspect-square overflow-hidden rounded-lg bg-gray-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=200&fit=crop&q=80" alt="4K property video thumbnail in ListingFlare listing builder" loading="lazy" className="h-full w-full object-cover opacity-70" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-white/90 p-1.5">
                          <svg className="h-3 w-3 text-gray-900 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">4K</span>
                      <span className="rounded-full bg-green-500 p-0.5 text-white absolute top-1 right-1">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>3 photos &middot; 1 video uploaded</span>
                    <div className="flex-1 rounded-full bg-gray-200 h-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="rounded-full bg-green-500 h-1.5"
                      />
                    </div>
                    <span className="text-green-600 font-medium">Done</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeStep === "published" && (
            <motion.div
              key="published"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 p-4 md:p-6 space-y-4"
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
                      <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=300&fit=crop&q=80" alt="Published property listing on ListingFlare real estate software dashboard" loading="lazy" className="h-full w-full object-cover" />
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 p-4 md:p-6 space-y-4"
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

const comparisonHeroPhotos = [
  "photo-1613490493576-7fde63acd811",  // Pool with landscape
  "photo-1600596542815-ffad4c1539a9",  // Modern exterior at dusk
  "photo-1600607687939-ce8a6c25118c",  // Living room windows
  "photo-1600585154340-be6161a56a0c",  // Modern exterior with pool twilight
  "photo-1616594039964-ae9021a400a0",  // Spa bathroom
];

function ComparisonHeroSlideshow() {
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIdx((i) => (i + 1) % comparisonHeroPhotos.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-48 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={heroIdx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://images.unsplash.com/${comparisonHeroPhotos[heroIdx]}?w=800&h=450&fit=crop&q=90`}
            alt="Luxury home"
            className="h-full w-full object-cover"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
      {/* Slide indicators */}
      <div className="absolute top-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {comparisonHeroPhotos.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === heroIdx ? "w-8 bg-white" : "w-3 bg-white/40"}`} />
        ))}
      </div>
      <div className="absolute bottom-3 left-4 right-4 text-white">
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/50">Exclusive Listing</p>
        <p className="mt-0.5 font-serif text-xl font-bold leading-tight">1847 Grandview Terrace</p>
        <p className="text-[11px] text-white/70">Pacific Palisades, CA 90272</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-white/90">
          <span className="font-serif text-base font-semibold">$4,750,000</span>
          <span className="h-3 w-px bg-white/30" />
          <span>5 Beds</span>
          <span>4.5 Baths</span>
          <span>4,820 Sq Ft</span>
        </div>
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
          {/* Steps — only show active step on mobile, all on desktop */}
          <div>
            {/* Mobile: show only active step */}
            <div className="lg:hidden">
              <div className="flex items-center justify-center gap-2 mb-4">
                {walkthrough.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`h-2 rounded-full transition-all ${i === activeIndex ? "w-8 bg-brand-500" : "w-2 bg-gray-300"}`}
                  />
                ))}
              </div>
              <div className="rounded-xl bg-white shadow-lg shadow-gray-200/50 border border-gray-200 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                    {(() => { const Icon = walkthrough[activeIndex].icon; return <Icon className="h-5 w-5" />; })()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{walkthrough[activeIndex].title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">{walkthrough[activeIndex].description}</p>
                    <div className="mt-3 h-1 w-full rounded-full bg-gray-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 4, ease: "linear" }}
                        key={`mobile-progress-${activeIndex}`}
                        className="h-1 rounded-full bg-brand-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: show all steps with fixed heights */}
            <div className="hidden lg:block space-y-2">
              {walkthrough.map((step, i) => (
                <button
                  key={step.step}
                  onClick={() => setActiveIndex(i)}
                  className={`group flex w-full items-start gap-4 rounded-xl p-4 text-left transition-all ${
                    i === activeIndex
                      ? "bg-white shadow-lg shadow-gray-200/50 border border-gray-200"
                      : "hover:bg-white/60 border border-transparent"
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
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold transition-colors ${
                      i === activeIndex ? "text-gray-900" : "text-gray-500"
                    }`}>
                      {step.title}
                    </p>
                    {i === activeIndex && (
                      <>
                        <p className="mt-1 text-sm leading-relaxed text-gray-500">{step.description}</p>
                        <div className="mt-3 h-1 w-full rounded-full bg-gray-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 4, ease: "linear" }}
                            key={`progress-${activeIndex}`}
                            className="h-1 rounded-full bg-brand-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
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

  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      window.location.href = "/signup?plan=pro";
      return;
    }
    setBuyLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = "/dashboard/billing";
      }
    } catch {
      window.location.href = "/dashboard/billing";
    }
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ListingFlare",
    url: "https://www.listingflare.com",
    logo: "https://www.listingflare.com/icon.svg",
    description:
      "Real estate software company building listing marketing tools for real estate agents. AI-powered property websites, lead capture, and automated follow-up.",
    founder: {
      "@type": "Person",
      name: "Kelvin Spratt",
    },
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@listingflare.com",
      contactType: "customer support",
    },
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ListingFlare",
    alternateName: "ListingFlare Real Estate Software",
    url: "https://www.listingflare.com",
    description:
      "Real estate software for listing agents. Create property websites, capture leads with AI chatbot, and automate follow-up to close more deals.",
    publisher: {
      "@type": "Organization",
      name: "ListingFlare",
    },
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ListingFlare",
    alternateName: "ListingFlare Real Estate Software",
    url: "https://www.listingflare.com",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Software",
    operatingSystem: "Web",
    description:
      "Real estate software that helps listing agents create stunning single-property websites, capture buyer leads with AI chatbot, and automate follow-up. The all-in-one listing marketing platform for real estate professionals.",
    offers: {
      "@type": "Offer",
      price: "150",
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      description: "14-day free trial, then $150/month",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Single-property listing websites",
      "AI chatbot for buyer questions",
      "Automatic lead capture",
      "AI-drafted follow-up emails",
      "Virtual tour integration (Matterport, Kuula)",
      "Analytics dashboard with weekly reports",
      "Social media post generation",
      "Open house flyer creation",
      "Custom agent branding",
      "AI listing description writer",
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "47",
      bestRating: "5",
    },
  };

  const faqs = [
    {
      question: "What is ListingFlare?",
      answer: "ListingFlare gives every listing its own branded property website with a built-in AI assistant. The AI answers buyer questions 24/7, captures their contact information, drafts a follow-up response instantly, and can help book showings through Calendly. You get more leads and faster response times without any extra work.",
    },
    {
      question: "How is ListingFlare different from Zillow or Realtor.com?",
      answer: "On Zillow, your listing sits next to competitor ads and other agents. Buyers who inquire often get routed away from you. With ListingFlare, every page is yours. Your brand, your contact info, zero competing agents. Every lead goes directly to your dashboard, and your AI assistant responds before anyone else can.",
    },
    {
      question: "How much does ListingFlare cost?",
      answer: "ListingFlare is $150 per month with a 14-day free trial and no credit card required to start. That includes unlimited listing websites, AI chat on every page, lead capture, automated follow-up, analytics, social media posts, open house flyers, and full agent branding. One deal from a lead you would have missed covers the cost many times over.",
    },
    {
      question: "Do I need technical skills to use ListingFlare?",
      answer: "Not at all. Enter your property details, upload photos, and hit publish. Your listing page is live in under 5 minutes with a shareable URL. The AI can even write your listing description and photo captions for you.",
    },
    {
      question: "What does the AI chatbot actually do?",
      answer: "It answers buyer questions instantly using your property details, things like bedrooms, square footage, neighborhood info, and specific features. When a buyer engages, the AI captures their name, email, and phone number, then invites them to schedule a showing. You get notified immediately with the lead ready in your dashboard.",
    },
    {
      question: "Can I use ListingFlare with my brokerage branding?",
      answer: "Yes. Your headshot, name, brokerage logo, phone number, and social links appear on every listing page. Sellers see a polished, professional presentation. Buyers see a premium experience that builds trust in you as their agent.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="bg-white">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Nav */}
      <nav className="fixed left-0 right-0 top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/blog"
              className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 md:block"
            >
              Blog
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full bg-gray-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">My Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:block"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-gray-950 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800 sm:px-5 sm:text-sm"
                >
                  Start Free Trial
                </Link>
                <button
                  onClick={handleBuyNow}
                  disabled={buyLoading}
                  className="rounded-full border-2 border-brand-400 bg-brand-50 px-4 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50 sm:px-5 sm:text-sm"
                >
                  {buyLoading ? "Loading..." : "Buy Now"}
                </button>
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
            <h1 className="font-serif text-4xl font-bold leading-tight text-gray-900 md:text-display">
              Last night, a buyer had a question
              <br />
              about your listing. Nobody answered.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 md:text-xl">
              ListingFlare gives every listing a branded page that answers buyers instantly, captures their info, and books the showing. Even at 11 PM on a Tuesday. Even while you sleep.
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
                className="group flex items-center gap-2 rounded-full border-2 border-brand-300 bg-brand-50 px-8 py-4 text-base font-medium text-brand-700 transition-all hover:bg-brand-100 hover:border-brand-400 hover:shadow-lg hover:shadow-brand-200/50"
              >
                See a Live Example
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="mt-6 text-sm font-medium text-gray-400">
              The agent who responds first gets the showing. This makes sure that agent is always you.
            </p>
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

      {/* Social Proof */}
      <section className="border-y border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-medium text-gray-500">
              Agents are waking up to booked showings from buyers who found their listing overnight.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-8 md:gap-14">
              <div className="text-center">
                <p className="font-serif text-3xl font-bold text-gray-900">5 min</p>
                <p className="mt-1 text-sm text-gray-500">From setup to live</p>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden sm:block" />
              <div className="text-center">
                <p className="font-serif text-3xl font-bold text-gray-900">Instant</p>
                <p className="mt-1 text-sm text-gray-500">Buyer response speed</p>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden sm:block" />
              <div className="text-center">
                <p className="font-serif text-3xl font-bold text-gray-900">24/7</p>
                <p className="mt-1 text-sm text-gray-500">Listing coverage</p>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden sm:block" />
              <div className="text-center">
                <p className="font-serif text-3xl font-bold text-gray-900">$0</p>
                <p className="mt-1 text-sm text-gray-500">To start your trial</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Before / After — Zillow vs ListingFlare */}
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
              See The Difference
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              On Zillow, you lose the lead.
              <br />
              On ListingFlare, you own it.
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {/* Zillow - Before */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                    </div>
                    <div className="mx-auto rounded-md bg-white px-8 py-1 text-xs text-gray-400 border border-gray-100">
                      zillow.com/homedetails/...
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  {/* Zillow nav bar */}
                  <div className="flex items-center gap-4 border-b border-gray-100 px-4 py-2 text-[10px] font-medium text-blue-600">
                    <span>Buy</span><span>Rent</span><span>Sell</span><span className="text-gray-400">Get a mortgage</span>
                    <span className="ml-auto text-gray-400">Sign in</span>
                  </div>
                  {/* Photo */}
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=280&fit=crop&q=80"
                      alt="Real estate listing on Zillow showing competing agent ads and distractions"
                      loading="lazy"
                      className="h-36 w-full object-cover"
                    />
                    <div className="absolute right-2 top-2 flex gap-1.5">
                      <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-gray-600">Save</span>
                      <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-gray-600">Share</span>
                    </div>
                  </div>
                  {/* Listing info */}
                  <div className="px-4 py-3 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-lg font-bold text-gray-900">$400,000</p>
                        <p className="text-[11px] text-gray-500">4423 Austin Dekota Dr, Charlotte, NC</p>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-3 text-[11px] text-gray-700">
                          <span><strong>4</strong> beds</span>
                          <span><strong>3</strong> baths</span>
                          <span><strong>2,864</strong> sqft</span>
                        </div>
                      </div>
                    </div>
                    {/* Zillow CTA */}
                    <div className="rounded-md bg-[#006AFF] px-3 py-2 text-center text-[11px] font-semibold text-white">
                      Request a tour
                    </div>
                    {/* Competing listings sidebar hint */}
                    <div className="border-t border-gray-100 pt-2.5">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Homes For You</p>
                      <div className="mt-1.5 flex gap-2">
                        <div className="flex-1 rounded border border-gray-100 p-1.5">
                          <div className="h-10 rounded bg-gray-100" />
                          <p className="mt-1 text-[9px] font-semibold text-gray-700">$410,000</p>
                          <p className="text-[8px] text-gray-400">1418 Summerville Rd</p>
                        </div>
                        <div className="flex-1 rounded border border-gray-100 p-1.5">
                          <div className="h-10 rounded bg-gray-100" />
                          <p className="mt-1 text-[9px] font-semibold text-gray-700">$389,000</p>
                          <p className="text-[8px] text-gray-400">2431 Brathay Ct</p>
                        </div>
                        <div className="hidden sm:block flex-1 rounded border border-gray-100 p-1.5">
                          <div className="h-10 rounded bg-gray-100" />
                          <p className="mt-1 text-[9px] font-semibold text-gray-700">$425,000</p>
                          <p className="text-[8px] text-gray-400">901 Kensington Dr</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-[#006AFF]">Your listing on Zillow</p>
                <p className="mt-1 text-xs text-gray-400">Your listing. Their platform. Competing agents shown. Leads redirected. Response delayed. You lose control.</p>
              </div>
            </motion.div>

            {/* ListingFlare - After */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <div className="overflow-hidden rounded-xl border-2 border-brand-300 bg-white shadow-xl shadow-brand-100/50">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-300" />
                    </div>
                    <div className="mx-auto rounded-md bg-white px-8 py-1 text-xs text-gray-400 border border-gray-100">
                      listingflare.com/listing/your-property
                    </div>
                  </div>
                </div>
                {/* Full-bleed hero with cycling photos */}
                <ComparisonHeroSlideshow />
                {/* Gallery grid with live video */}
                <div className="grid grid-cols-4 gap-1 p-1.5 bg-gray-50">
                  {/* Photo thumbnails */}
                  {[
                    "photo-1600607687939-ce8a6c25118c",
                    "photo-1600566753086-00f18fb6b3ea",
                    "photo-1616594039964-ae9021a400a0",
                  ].map((id) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={id}
                      src={`https://images.unsplash.com/${id}?w=200&h=150&fit=crop&q=80`}
                      alt="Property photo gallery thumbnail on ListingFlare listing page"
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded object-cover"
                    />
                  ))}
                  {/* Live auto-playing luxury home video */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded">
                    <video
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="h-full w-full object-cover"
                      poster="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=150&fit=crop&q=80"
                    >
                      <source src="https://videos.pexels.com/video-files/7578552/7578552-sd_640_360_30fps.mp4" type="video/mp4" />
                    </video>
                    <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[7px] font-bold text-white flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      8K VIDEO
                    </span>
                  </div>
                </div>
                {/* Features + Agent + CTA */}
                <div className="p-4 space-y-3">
                  {/* Features row */}
                  <div className="flex flex-wrap gap-1.5">
                    {["Ocean Views", "Infinity Pool", "Chef\u2019s Kitchen", "Smart Home"].map((f) => (
                      <span key={f} className="rounded-full bg-brand-50 border border-brand-100 px-2 py-0.5 text-[9px] font-medium text-brand-700">{f}</span>
                    ))}
                    <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[9px] font-medium text-purple-700 flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" /> AI Descriptions
                    </span>
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9px] font-medium text-blue-700 flex items-center gap-0.5">
                      <Send className="h-2.5 w-2.5" /> Share to Social
                    </span>
                    <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[9px] font-medium text-green-700 flex items-center gap-0.5">
                      <Bell className="h-2.5 w-2.5" /> Instant Lead Alerts
                    </span>
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-medium text-amber-700 flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" /> AI Follow-Up
                    </span>
                    <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[9px] font-medium text-orange-700 flex items-center gap-0.5">
                      <Eye className="h-2.5 w-2.5" /> Open House Flyers
                    </span>
                    <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[9px] font-medium text-rose-700 flex items-center gap-0.5">
                      <Upload className="h-2.5 w-2.5" /> 8K Video Upload
                    </span>
                    <span className="rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-[9px] font-medium text-cyan-700 flex items-center gap-0.5">
                      <BarChart3 className="h-2.5 w-2.5" /> Weekly Reports
                    </span>
                    <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[9px] font-medium text-indigo-700 flex items-center gap-0.5">
                      <MessageCircle className="h-2.5 w-2.5" /> 24/7 AI Chat
                    </span>
                    <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[9px] font-medium text-teal-700 flex items-center gap-0.5">
                      <View className="h-2.5 w-2.5" /> Virtual Tours
                    </span>
                  </div>
                  {/* Agent branding */}
                  <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-brand-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&q=80" alt="" loading="lazy" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Victoria Ashworth</p>
                      <p className="text-[10px] text-brand-500">Luxury Property Specialist &middot; Westside Luxury Realty</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-950 px-4 py-2.5 text-center text-xs font-medium text-white">
                    Schedule a Private Showing
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-gray-900">Your listing on ListingFlare</p>
                <p className="mt-1 text-xs text-gray-500">Your page. Your brand. Buyer answered instantly. Lead captured. Showing booked. You own everything.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Urgency Section */}
      <section className="bg-gray-950 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-serif text-3xl font-bold text-white md:text-display-sm">
              You&apos;re losing buyers after hours.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
              A buyer finds your listing at 10 PM. They want to know about the backyard. Nobody answers. They tap the next home. That was a serious buyer. You never knew they existed.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-gray-300">
              With ListingFlare, that buyer gets an answer, submits their info, and books a showing. You find out when you check your phone in the morning.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Agents Switch From Zillow */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
              The Real Problem
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Why agents stop relying on Zillow.
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">On Zillow</p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-500">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 text-xs font-bold">&times;</span>
                  Your leads get sold to whoever pays Zillow more
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-500">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 text-xs font-bold">&times;</span>
                  Competing agents are advertised on your listing page
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-500">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 text-xs font-bold">&times;</span>
                  Buyer messages sit unanswered while they move on
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-brand-200 bg-brand-50/50 p-6"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-brand-500">On ListingFlare</p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600"><Check className="h-3 w-3" /></span>
                  Every lead goes directly to you. No middleman.
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600"><Check className="h-3 w-3" /></span>
                  AI responds to buyers in seconds, not hours
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600"><Check className="h-3 w-3" /></span>
                  Showings get booked automatically while you sleep
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works While You Sleep */}
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
              Always Working For You
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              How it works while you sleep.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              This is what happened on a Tuesday night for an agent using ListingFlare.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                icon: Globe,
                title: "11:14 PM. A buyer finds your listing.",
                description: "They click a link from Instagram, a text you sent, or a Google search. They land on a clean, branded page with just your listing. No ads. No competitors.",
              },
              {
                step: "02",
                icon: MessageCircle,
                title: "They type a question into the chat.",
                description: "\"Is the backyard fenced? We have two dogs.\" The AI chat is right there on the page. No forms. No waiting.",
              },
              {
                step: "03",
                icon: CalendarCheck,
                title: "They get an answer in seconds.",
                description: "The AI responds with the real details. Then it asks: \"Would you like to schedule a showing this weekend?\" and offers your Calendly link.",
              },
              {
                step: "04",
                icon: UserPlus,
                title: "You wake up to a booked showing.",
                description: "The buyer left their name, email, and phone. They booked Saturday at 10 AM. The lead is already in your dashboard. You didn't do anything.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-gray-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">Step {item.step}</span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Moment */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
              Picture This
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              What this looks like in real life.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-10 space-y-3 text-center"
          >
            <p className="text-lg text-gray-600">10:42 PM. A buyer opens your listing.</p>
            <p className="text-lg text-gray-600">10:43 PM. They ask about the backyard.</p>
            <p className="text-lg text-gray-600">10:43 PM. They get an answer.</p>
            <p className="text-lg text-gray-600">10:44 PM. They book a showing for Saturday.</p>
            <p className="text-lg text-gray-600">10:45 PM. Their contact info hits your dashboard.</p>
            <p className="mt-6 font-serif text-xl font-semibold text-gray-900">
              You were asleep the entire time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What Happens When a Buyer Is Interested */}
      <section className="bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
              See It In Action
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              What happens when a buyer
              <br />
              is interested.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              This is exactly how buyers interact with your listing. Not a static page. A working assistant that handles the conversation, captures the lead, and gets the showing booked.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-14"
          >
            {/* Chat simulation */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-xl shadow-gray-200/30">
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100">
                  <MessageCircle className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">AI Assistant</p>
                  <p className="text-xs text-green-600">Online now</p>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {/* Timestamp */}
                <p className="text-center text-xs text-gray-400">Tuesday, 10:47 PM</p>

                {/* Buyer message 1 */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="flex justify-end"
                >
                  <div className="rounded-2xl rounded-br-md bg-gray-900 px-5 py-3 text-sm text-white max-w-sm">
                    We are relocating next month. Is this home still available? We need to move fast.
                  </div>
                </motion.div>

                {/* AI response */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="flex justify-start"
                >
                  <div className="rounded-2xl rounded-bl-md bg-white border border-gray-200 px-5 py-3 text-sm text-gray-700 max-w-sm shadow-sm">
                    Yes, this property is currently active! It features 4 bedrooms, 3.5 baths, a fully fenced backyard, and a renovated kitchen. Given your timeline, I would recommend scheduling a showing soon.
                  </div>
                </motion.div>

                {/* Buyer message 2 */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  className="flex justify-end"
                >
                  <div className="rounded-2xl rounded-br-md bg-gray-900 px-5 py-3 text-sm text-white max-w-sm">
                    Can we see it this Saturday? Preferably morning.
                  </div>
                </motion.div>

                {/* AI follow-up with booking */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 1.1 }}
                  className="flex justify-start"
                >
                  <div className="rounded-2xl rounded-bl-md bg-white border border-gray-200 px-5 py-3 text-sm text-gray-700 max-w-sm shadow-sm">
                    Absolutely. I have Saturday morning availability open. Just share your name and email below and I will get the showing confirmed for you right away.
                  </div>
                </motion.div>
              </div>

              {/* Outcome badges */}
              <div className="border-t border-gray-200 bg-white px-6 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 1.4 }}
                    className="flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-2"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Lead captured</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 1.6 }}
                    className="flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-2"
                  >
                    <CalendarCheck className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Showing requested</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 1.8 }}
                    className="flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-4 py-2"
                  >
                    <BellRing className="h-4 w-4 text-brand-600" />
                    <span className="text-sm font-medium text-brand-700">Agent notified</span>
                  </motion.div>
                </div>
                <p className="mt-3 text-sm text-gray-400">
                  This happened at 10:47 PM on a Tuesday. The agent was asleep. The lead was captured. The showing was booked.
                </p>
              </div>
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
              Stop missing buyers.
              <br />
              Start closing faster.
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3"
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
              Less than one missed showing
              <br />
              costs more than this.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-gray-400">
              Unlimited listing pages, AI chat, lead capture, automated follow-up, and analytics. One plan. Everything included.
            </p>
            <p className="mt-3 text-sm font-medium text-brand-400/80">
              One closed deal from a buyer you would have lost pays for this ten times over.
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
                Cancel anytime. No contracts.
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
              <p className="mt-3 text-center text-sm text-gray-500">
                No credit card required to start.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-gray-500">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <button
                onClick={handleBuyNow}
                disabled={buyLoading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-4 font-medium text-white transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20 disabled:opacity-50"
              >
                {buyLoading ? "Loading..." : "Buy Now — $150/mo"}
                {!buyLoading && <ArrowRight className="h-4 w-4" />}
              </button>
              <p className="mt-6 text-center text-xs text-gray-500">
                A 3% commission on a $400K home is $12,000. Missing that buyer costs more than a lifetime of this.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Latest from the Blog */}
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
              Real Estate Marketing Tips
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Insights for listing agents.
            </h2>
          </motion.div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {getAllPosts().slice(0, 6).map((post, i) => (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg hover:shadow-gray-200/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImage}
                      alt={post.coverImageAlt}
                      loading="lazy"
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="p-5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                        {post.category}
                      </span>
                      <h3 className="mt-2 font-serif text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-brand-600 transition-colors">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                        {post.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 text-base font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              View All Articles
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
              FAQ
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Common questions about
              <br />
              ListingFlare real estate software.
            </h2>
          </motion.div>

          <div className="mt-14 space-y-6">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-6"
              >
                <h3 className="font-serif text-lg font-bold text-gray-900">
                  {faq.question}
                </h3>
                <p className="mt-3 leading-relaxed text-gray-600">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Tonight, a buyer will find
              <br />
              one of your listings.
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              They will have a question. If nobody answers, they will move on. The only question is whether your listing is ready for that moment.
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
            <Link href="/blog" className="underline underline-offset-2 transition-colors hover:text-gray-900">Blog</Link>
            <span>&middot;</span>
            <Link href="/about" className="underline underline-offset-2 transition-colors hover:text-gray-900">About</Link>
            <span>&middot;</span>
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
