"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import PublicMobileMenu from "@/components/PublicMobileMenu";
import { createClient } from "@/lib/supabase/client";

// Only the fields the homepage cards render. The server page picks these so the
// full article bodies (~1.4 MB of HTML) never ship in the client bundle.
export interface LatestPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  coverImage: string;
  coverImageAlt: string;
}

// Below-the-fold sections lazy-loaded so the initial homepage JS
// payload stays small and LCP doesn't pay for code visitors may never
// scroll to. ssr:true keeps the HTML for SEO.
const ProductTestimonials = dynamic(() => import("@/components/ProductTestimonials"), { ssr: true });
const PipelineAnimation = dynamic(() => import("@/components/PipelineAnimation"), { ssr: true });
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
    title: "Win the listing presentation",
    description:
      "Show sellers a dedicated, branded website for their listing, built from your listing details. It is a concrete way to stand out in a listing presentation.",
  },
  {
    icon: MessageCircle,
    title: "Answer buyers when you cannot",
    description:
      "Every listing has an AI that answers buyer questions instantly. Bedrooms, backyard, neighborhood. The lead can be captured before they close the tab.",
  },
  {
    icon: BarChart3,
    title: "Reply to new leads right away",
    description:
      "AI drafts a personalized reply as soon as a lead comes in, so a new lead hears back right away, even when you are away from your phone.",
  },
  {
    icon: View,
    title: "More time on your page. More showings booked.",
    description:
      "Embed Matterport, Kuula, or any 3D tour right on the listing so buyers can explore the home without leaving the page.",
  },
  {
    icon: Zap,
    title: "Three steps to a live listing page. Buyers can ask questions right away.",
    description:
      "Enter details, upload photos, publish. Live with its own URL. Share it once. It works for you every night after that.",
  },
  {
    icon: Sparkles,
    title: "Sellers see your brand on every page",
    description:
      "Your headshot, brokerage, and contact info on every listing. Sellers see professionalism. Buyers see someone they trust.",
  },
  {
    icon: MessageCircle,
    title: "Text leads without a second phone number",
    description:
      "Tap the Text button on any lead and Messages opens with their number and a ready-to-send note. The text sends from your real phone, so replies land where you already answer. Works on iPhone and Android.",
  },
];

const included = [
  "Unlimited listing websites with your branding",
  "AI chat answers buyer questions 24/7",
  "AI auto-reply to every new lead",
  "Built-in showing requests, with a Google Calendar event once you confirm (optional)",
  "Text leads with one tap from your real phone number",
  "Seller transparency portal so your clients watch their listing live",
  "Hot Lead scoring + drag-and-drop pipeline view",
  "Showing reminder emails to buyers",
  "Social posts, open house flyers, QR sign-in, analytics",
  "One plan. Everything included. No add-ons.",
];

const walkthrough = [
  {
    step: "01",
    title: "Enter your property details",
    description: "Address, price, beds, baths. The AI writes the description if you want.",
    icon: PlusCircle,
    mockup: "create",
  },
  {
    step: "02",
    title: "Drop in your photos and video",
    description: "Drag and drop. They show up in a full-screen slideshow and gallery that looks like a custom site.",
    icon: Upload,
    mockup: "photos",
  },
  {
    step: "03",
    title: "Hit publish",
    description: "Your listing goes live with its own URL. Share it on social, text it to clients, put it on your card.",
    icon: Globe,
    mockup: "published",
  },
  {
    step: "04",
    title: "Check your phone in the morning",
    description: "For example: a buyer finds your listing at 11 PM, asks a question, and leaves their details. The lead is in your dashboard when you wake up.",
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
// Real photos from published listings (loaded server-side in page.tsx). With
// none available the original stock photos are used so the page never looks
// empty. If a live photo fails to load, a pulsing skeleton holds its place.
const LivePhotosContext = createContext<string[]>([]);

function ListingPhoto({
  index,
  fallback,
  alt,
  width,
  height,
  sizes,
  className,
  priority,
  forceSrc,
}: {
  index: number;
  fallback: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className: string;
  priority?: boolean;
  forceSrc?: string;
}) {
  const photos = useContext(LivePhotosContext);
  const [failed, setFailed] = useState(false);
  const src = forceSrc ?? (photos.length > 0 ? photos[index % photos.length] : fallback);

  if (!src || failed) {
    return <div aria-hidden="true" className={`animate-pulse bg-gray-200 ${className}`} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

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
        <div className="mx-auto rounded-md bg-white px-12 py-1 text-xs text-gray-500 border border-gray-100">
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
                      <div className="rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-500 h-16">Perched above the coastline with panoramic ocean views...</div>
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
                    <p className="mt-0.5 text-xs text-gray-500">Photos up to 20MB &middot; Videos up to 500MB &middot; Supports 4K/8K</p>
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
                        <ListingPhoto index={i} fallback={`https://images.unsplash.com/${id}?w=200&h=200&fit=crop&q=80`} alt="Property listing photo uploaded to ListingFlare real estate software" width={200} height={200} sizes="64px" className="h-full w-full object-cover" />
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
                      <ListingPhoto index={3} fallback="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=200&fit=crop&q=80" alt="4K property video thumbnail in ListingFlare listing builder" width={200} height={200} sizes="64px" className="h-full w-full object-cover opacity-70" />
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
                      <ListingPhoto index={0} forceSrc="/luxury.webp" fallback="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=300&fit=crop&q=80" alt="Published property listing on ListingFlare real estate software dashboard" width={800} height={300} sizes="(max-width: 1024px) 90vw, 480px" priority className="h-full w-full object-cover" />
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
                        <span className="flex items-center gap-1 text-xs text-gray-500"><Eye className="h-3 w-3" /> 0 views</span>
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
                    <p className="font-serif text-lg font-bold text-gray-900">Leads <span className="font-sans text-[10px] font-normal text-gray-500">(example data)</span></p>
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
                          <span className="text-[10px] text-gray-500">{lead.time}</span>
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
    <section className="overflow-x-clip bg-gray-50 py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
            How It Works
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
            From photos to published
            <br />
            in three steps.
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[340px_1fr] lg:gap-8">
          {/* Steps - only show active step on mobile, all on desktop */}
          <div>
            {/* Mobile: show only active step */}
            <div className="lg:hidden">
              <div className="flex items-center justify-center mb-4">
                {walkthrough.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Show step ${i + 1}: ${step.title}`}
                    aria-current={i === activeIndex ? "true" : undefined}
                    className="flex h-6 items-center justify-center px-2"
                  >
                    <span className={`block h-2 rounded-full transition-all ${i === activeIndex ? "w-8 bg-brand-500" : "w-2 bg-gray-300"}`} />
                  </button>
                ))}
              </div>
              <div className="relative rounded-xl bg-white shadow-lg shadow-gray-200/50 border border-gray-200 p-4 h-[160px] overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                      {(() => { const Icon = walkthrough[activeIndex].icon; return <Icon className="h-5 w-5" />; })()}
                    </div>
                    <div className="flex-1 min-w-0">
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
                  </motion.div>
                </AnimatePresence>
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

function LandingPageInner({ posts, showHomesLink = false }: { posts: LatestPost[]; showHomesLink?: boolean }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setAuthChecked(true);
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
    logo: {
      "@type": "ImageObject",
      url: "https://www.listingflare.com/icon.svg",
      width: 512,
      height: 512,
    },
    description:
      "Real estate software company building listing marketing tools for real estate agents. AI-powered property websites, lead capture, and an instant AI reply to new leads.",
    foundingDate: "2026",
    founder: {
      "@type": "Person",
      name: "Kelvin Spratt",
      url: "https://www.listingflare.com/about",
      jobTitle: "Founder & CEO",
    },
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "kelvin@listingflare.com",
      contactType: "customer support",
      availableLanguage: "English",
    },
    numberOfEmployees: {
      "@type": "QuantitativeValue",
      value: 1,
    },
    knowsAbout: [
      "Real Estate Software",
      "Single Property Websites",
      "AI Chatbots for Real Estate",
      "Real Estate Lead Generation",
      "Listing Marketing",
    ],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ListingFlare",
    alternateName: "ListingFlare Real Estate Software",
    url: "https://www.listingflare.com",
    description:
      "Real estate software for listing agents. Create property websites, capture leads with an AI chatbot, and reply to new leads instantly.",
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
      "Real estate software that helps listing agents create stunning single-property websites, capture buyer leads with an AI chatbot, and reply to new leads instantly. The all-in-one listing marketing platform for real estate professionals.",
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
      "AI-drafted replies to new leads",
      "Virtual tour integration (Matterport, Kuula)",
      "Analytics dashboard with weekly reports",
      "Social media post generation",
      "Open house flyer creation",
      "Custom agent branding",
      "AI listing description writer",
    ],
  };

  const faqs = [
    {
      question: "What is ListingFlare?",
      answer: "ListingFlare gives every listing its own branded property website with a built-in AI assistant. The AI answers buyer questions 24/7, captures their contact information, drafts a follow-up response instantly, and can share your Calendly link to help book showings. It answers from the listing details you enter, so buyers get quick answers without extra work from you.",
    },
    {
      question: "How is ListingFlare different from Zillow or Realtor.com?",
      answer: "ListingFlare is a listing marketing tool. It gives each of your listings its own branded page that you control, with your name and contact details, and inquiries from that page go to your dashboard, where the AI assistant can send an instant first reply. It does not syndicate your listing to the MLS or to portals such as Zillow or Realtor.com, so it works alongside them rather than replacing them.",
    },
    {
      question: "How much does ListingFlare cost?",
      answer: "ListingFlare is $150 per month with a 14-day free trial and no credit card required to start. That includes unlimited listing websites, AI chat on every page, lead capture, an instant AI reply to new leads, analytics, social media posts, open house flyers, and full agent branding. Results vary: one sale from a lead you would otherwise have missed would cover many months of the subscription, but no outcome is guaranteed.",
    },
    {
      question: "Do I need technical skills to use ListingFlare?",
      answer: "Not at all. Enter your property details, upload photos, and hit publish. Your listing page goes live with a shareable URL as soon as you publish. How long it takes depends on how much you enter and how many photos you upload. The AI can even write your listing description and photo captions for you.",
    },
    {
      question: "What does the AI chatbot actually do?",
      answer: "It answers buyer questions using the listing details you enter, such as bedrooms, square footage, and features. When a buyer engages, the AI can capture their name, email, and phone number and invite them to book a showing. Because it only knows what you entered, it can be wrong or incomplete if those details are, and it is not designed to negotiate and should not be relied on for legal or financial advice. If it does not know something, it offers to have you follow up.",
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
            <Link
              href="/pricing"
              className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 md:block"
            >
              Pricing
            </Link>
            <Link
              href="/demo"
              className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 md:block"
            >
              Live Demo
            </Link>
            {!authChecked ? (
              <div className="h-9 w-24 rounded-full bg-gray-100 animate-pulse" />
            ) : isLoggedIn ? (
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
                  className="rounded-full bg-gray-950 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800 sm:hidden sm:px-5 sm:text-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:block"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="hidden rounded-full bg-gray-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:inline-block sm:px-5"
                >
                  Start Free Trial
                </Link>
              </>
            )}
            <PublicMobileMenu />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-14 md:pt-24 md:pb-20">
        {/* Subtle gradient bg */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/50 to-white" />
        <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-100/30 blur-3xl" />

        <div className="mx-auto max-w-6xl px-6">
          {/* initial={false}: the hero renders visible in the server HTML. A fade-in
              from opacity 0 kept the headline invisible until JS hydrated, which
              pushed mobile LCP to ~6s. */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm shadow-emerald-200/40">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              14-day free trial. No credit card required.
            </div>
            <h1 className="font-serif text-4xl font-bold leading-tight text-gray-900 md:text-display">
              <span className="mb-3 block text-base font-semibold tracking-wide text-brand-700 md:text-lg" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>Real Estate Software for Listing Agents</span>{" "}
              Last night, a buyer asked about
              <br />
              your listing. You lost them.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-500 md:text-xl">
              Every listing gets its own branded page with an AI assistant that answers buyer questions at any hour, captures their contact info, and takes the showing request. You wake up to a new lead, not a lost one.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
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
            <p className="mt-5 text-sm font-medium text-gray-500">
              Buyers move on quickly. A fast reply helps you stay in the conversation.
            </p>
          </motion.div>

          {/* Preview mockup */}
          <motion.div
            id="preview"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-12"
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
                  <div className="mx-auto min-w-0 truncate rounded-md border border-gray-100 bg-white px-3 py-1 text-xs text-gray-500 sm:px-16">
                    listingflare.com/listing/1847-grandview
                  </div>
                </div>
                {/* Screenshot placeholder - hero image */}
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-900">
                  <ListingPhoto
                    index={1}
                    forceSrc="/luxury.webp"
                    fallback="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&h=1080&fit=crop&q=85&auto=format"
                    alt="ListingFlare single property website preview showing a luxury home listing page with AI chatbot, lead capture form, and agent branding"
                    width={1920}
                    height={1080}
                    priority
                    className="h-full w-full object-cover opacity-80"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  <div className="absolute bottom-8 left-8 text-white md:bottom-12 md:left-12">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                      Example Listing
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

      {/* Live Stats - hides until real data exists */}

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
              Here is what a late-night visit to your listing can look like.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-8 md:gap-14">
              <div className="text-center">
                <p className="font-serif text-3xl font-bold text-gray-900">3 steps</p>
                <p className="mt-1 text-sm text-gray-500">From details to live page</p>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden sm:block" />
              <div className="text-center">
                <p className="font-serif text-3xl font-bold text-gray-900">Instant</p>
                <p className="mt-1 text-sm text-gray-500">Buyer gets an answer</p>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden sm:block" />
              <div className="text-center">
                <p className="font-serif text-3xl font-bold text-gray-900">24/7</p>
                <p className="mt-1 text-sm text-gray-500">Chat always on</p>
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

      {/* Urgency Section */}
      <section className="bg-gray-950 py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-serif text-3xl font-bold text-white md:text-display-sm">
              Your open house visitors are walking out unnamed.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
              Picture a Saturday open house: 14 people walk through and 2 sign the guest book. The other 12 leave without giving you a name, an email, or any way to follow up.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-gray-300">
              With ListingFlare, every visitor who scans your QR code lands on a page with an AI that starts a conversation and captures their info before they drive away.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works While You Sleep */}
      <section className="bg-gray-50 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
              Always Working For You
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              How it works while you sleep.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              An example of a late-night visit to a listing page.
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
                description: "The AI responds with the real details. Then it asks: \"Would you like to schedule a showing this weekend?\" and offers your Calendly link if you have added one.",
              },
              {
                step: "04",
                icon: UserPlus,
                title: "You wake up to a new lead.",
                description: "The buyer left their name, email, and phone and asked about a showing. The lead is already in your dashboard.",
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
                  <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">Step {item.step}</span>
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

      {/* Your Dashboard Section */}
      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">
              Your Command Center
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Log in and see what ListingFlare did for you
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-gray-500">
              Every response time, every showing request, every reply sent. Visible in one place so you actually know your software is working.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-xs text-gray-500">
              Sample dashboard with illustrative numbers. Your dashboard shows your own leads and response times.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-12 grid gap-4 md:grid-cols-3"
          >
            {/* Speed to Lead mockup */}
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50 to-white p-5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-500" />
                <h3 className="text-sm font-semibold text-gray-900">Speed to Lead</h3>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="font-serif text-3xl font-bold text-gray-900">14s</p>
                <p className="text-xs text-gray-500">avg response (sample)</p>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                <p className="text-xs font-medium text-emerald-800">
                  Sample figure for illustration
                </p>
              </div>
            </div>

            {/* Upcoming Showings mockup */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-brand-500" />
                <h3 className="text-sm font-semibold text-gray-900">Upcoming Showings</h3>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">3</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-gray-100 p-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    Tomorrow · 10:00 AM
                  </span>
                  <p className="mt-1 text-sm font-medium text-gray-900">Sarah Thompson</p>
                  <p className="text-xs text-gray-500">604 Homeland Ave</p>
                </div>
                <div className="rounded-lg border border-gray-100 p-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    Friday · 2:30 PM
                  </span>
                  <p className="mt-1 text-sm font-medium text-gray-900">Mike Johnson</p>
                  <p className="text-xs text-gray-500">1230 Barn Cat Way</p>
                </div>
              </div>
            </div>

            {/* Activity Feed mockup */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-500" />
                <h3 className="text-sm font-semibold text-gray-900">What ListingFlare did today</h3>
              </div>
              <div className="mt-3 space-y-2.5">
                {[
                  { icon: Check, text: "Auto-replied to Sarah in 12s", color: "text-emerald-600 bg-emerald-50" },
                  { icon: Send, text: "Sent a showing reminder to Mike", color: "text-brand-600 bg-brand-50" },
                  { icon: CalendarCheck, text: "Showing confirmed with 2 buyers", color: "text-emerald-600 bg-emerald-50" },
                  { icon: UserPlus, text: "Notified you of 4 new leads", color: "text-sky-600 bg-sky-50" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${item.color.split(" ")[1]}`}>
                        <Icon className={`h-3 w-3 ${item.color.split(" ")[0]}`} />
                      </div>
                      <p className="text-xs text-gray-700">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Lead Pipeline mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-900">Lead Pipeline</h3>
              <span className="ml-auto text-xs text-gray-500">Drag to update status</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "New", count: 4, color: "border-blue-400 bg-blue-50" },
                { label: "Contacted", count: 7, color: "border-purple-400 bg-purple-50" },
                { label: "Showing", count: 3, color: "border-orange-400 bg-orange-50" },
                { label: "Closed", count: 2, color: "border-emerald-400 bg-emerald-50" },
              ].map((col) => (
                <div key={col.label} className={`rounded-lg border-l-4 ${col.color} px-3 py-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-900">{col.label}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700">
                      {col.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mt-8 text-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-gray-950 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pipeline animation - shows a lead card flowing through
          the kanban in real time. Visual payoff for the "we track
          every lead" claim. */}
      <PipelineAnimation />

      {/* Real Moment */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-2xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
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
            <p className="text-lg text-gray-600"><span className="font-semibold text-brand-700">10:42 PM.</span> A buyer opens your listing.</p>
            <p className="text-lg text-gray-600"><span className="font-semibold text-brand-700">10:43 PM.</span> They ask about the backyard.</p>
            <p className="text-lg text-gray-600"><span className="font-semibold text-brand-700">10:43 PM.</span> They get an answer.</p>
            <p className="text-lg text-gray-600"><span className="font-semibold text-brand-700">10:44 PM.</span> They ask for a showing on Saturday.</p>
            <p className="text-lg text-gray-600"><span className="font-semibold text-brand-700">10:45 PM.</span> Their contact info hits your dashboard.</p>
            <p className="mt-6 font-serif text-xl font-semibold text-gray-900">
              You were asleep the entire time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What Happens When a Buyer Is Interested */}
      <section className="bg-gray-50 py-14 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
              See It In Action
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              What happens when a buyer
              <br />
              is interested.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              This is exactly how buyers interact with your listing. Not a static page. A working assistant that handles the conversation, captures the lead, and passes the showing request to you.
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
                <p className="text-center text-xs text-gray-500">Tuesday, 10:47 PM</p>

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
                    Happy to help with that. Share your name and email below and I will pass your request to the agent so they can confirm a time.
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
                <p className="mt-3 text-sm text-gray-500">
                  Example conversation. The agent is notified and follows up to confirm a time.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
              Everything You Need
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Answer more buyers.
              <br />
              Follow up faster.
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

      {/* Agent testimonials - auto-hides until you have real ones */}
      <ProductTestimonials />

      {/* How It Works - Animated Walkthrough */}
      <HowItWorks />

      {/* Pricing */}
      <section className="bg-gray-950 py-14 md:py-20">
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
              One plan.
              <br />
              $150 a month, 14-day free trial.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-gray-400">
              Listing pages, AI chat, lead management, a showing scheduler and automation. One plan, with the full feature list on the pricing page.
            </p>
            <p className="mt-3 text-sm font-medium text-brand-400/80">
              At $150 a month, a year of ListingFlare is $1,800. Not every lead closes.
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
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-sm text-gray-400">
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
                className="mt-3 w-full text-center text-sm text-gray-400 underline underline-offset-2 transition-colors hover:text-white disabled:opacity-50"
              >
                {buyLoading ? "Loading..." : "Skip the trial and subscribe now ($150/mo)"}
              </button>
              <p className="mt-6 text-center text-xs text-gray-400">
                For scale: a 3% commission on a $400K sale is $12,000 before splits. ListingFlare is about $5 a day.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Latest from the Blog */}
      <section className="bg-gray-50 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
              Real Estate Marketing Tips
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Insights for listing agents.
            </h2>
          </motion.div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {posts.map((post, i) => (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg hover:shadow-gray-200/50">
                    <Image
                      src={post.coverImage}
                      alt={post.coverImageAlt}
                      width={600}
                      height={315}
                      sizes="(max-width: 768px) 90vw, 33vw"
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="p-5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
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
              className="group inline-flex items-center gap-2 text-base font-medium text-brand-700 transition-colors hover:text-brand-800"
            >
              View All Articles
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Resources: internal links to the main landing pages and free templates */}
      <section className="border-t border-gray-100 bg-gray-50 py-14 md:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            Guides, comparisons and free templates for listing agents
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: "/single-property-website-builder", title: "Single Property Website Builder", text: "A branded page for every listing, with lead capture." },
              { href: "/real-estate-ai-chatbot", title: "AI Chatbot for Real Estate Listings", text: "Answers buyer questions at any hour." },
              { href: "/real-estate-lead-capture-software", title: "Real Estate Lead Capture Software", text: "Capture and follow up with leads you own." },
              { href: "/listingflare-vs-rela", title: "ListingFlare vs Rela", text: "A side-by-side feature comparison." },
              { href: "/listingflare-vs-singlepropertysites", title: "ListingFlare vs SinglePropertySites.com", text: "How the two compare." },
              { href: "/free-real-estate-templates", title: "Free Real Estate Templates", text: "Listing presentation, open house and seller update templates." },
              { href: "/homes", title: "Homes for Sale by City", text: "Browse listings published on ListingFlare, city by city." },
            ]
              // Same rule as the footer link: the city directory is linked only once real customers have
              // published listings. Before that it is an empty noindex page.
              .filter((r) => r.href !== "/homes" || showHomesLink)
              .map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-brand-300"
              >
                <span className="block text-sm font-semibold text-gray-900">{r.title} &rarr;</span>
                <span className="mt-1 block text-xs text-gray-500">{r.text}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
              FAQ
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              Common questions about
              <br />
              ListingFlare real estate software.
            </h2>
          </motion.div>

          {/* Native details/summary for zero-JS, SEO-friendly, accessible
              accordion. The first item is open by default so the section
              doesn't feel like an empty wall of closed rows. */}
          <div className="mt-14 space-y-4">
            {faqs.map((faq, i) => (
              <motion.details
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                {...(i === 0 ? { open: true } : {})}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 transition-colors hover:border-brand-300"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-serif text-lg font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-all group-open:rotate-45 group-open:border-brand-400 group-open:text-brand-600"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </summary>
                <p className="px-6 pb-6 leading-relaxed text-gray-600">
                  {faq.answer}
                </p>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-50 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-serif text-3xl font-bold text-gray-900 md:text-display-sm">
              A buyer will find your listing tonight.
              <br />
              Will anyone be there to answer?
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              A buyer who does not get a quick answer may move on to another listing, and you may never know they stopped by.
            </p>
            <Link
              href="/signup"
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-gray-950 px-8 py-4 text-base font-medium text-white transition-all hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-950/10"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <Link href="/" aria-label="ListingFlare home" className="font-serif text-lg font-bold text-gray-900">
            Listing<span className="text-brand-700">Flare</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <Link href="/blog" className="inline-block py-2 underline underline-offset-2 transition-colors hover:text-gray-900">Blog</Link>
            <span>&middot;</span>
            <Link href="/free-real-estate-templates" className="inline-block py-2 underline underline-offset-2 transition-colors hover:text-gray-900">Free Templates</Link>
            <span>&middot;</span>
            {showHomesLink && (
              <>
                <Link href="/homes" className="inline-block py-2 underline underline-offset-2 transition-colors hover:text-gray-900">Homes by City</Link>
                <span>&middot;</span>
              </>
            )}
            <Link href="/about" className="inline-block py-2 underline underline-offset-2 transition-colors hover:text-gray-900">About</Link>
            <span>&middot;</span>
            <Link href="/privacy" className="inline-block py-2 underline underline-offset-2 transition-colors hover:text-gray-900">Privacy Policy</Link>
            <span>&middot;</span>
            <Link href="/terms" className="inline-block py-2 underline underline-offset-2 transition-colors hover:text-gray-900">Terms of Service</Link>
            <span>&middot;</span>
            <a href="mailto:kelvin@listingflare.com" className="inline-block py-2 underline underline-offset-2 transition-colors hover:text-gray-900">Contact</a>
            <span>&middot;</span>
            <span>&copy; {new Date().getFullYear()} ListingFlare</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage({
  livePhotos = [],
  latestPosts = [],
  showHomesLink = false,
}: {
  livePhotos?: string[];
  latestPosts?: LatestPost[];
  showHomesLink?: boolean;
}) {
  return (
    <LivePhotosContext.Provider value={livePhotos}>
      <LandingPageInner posts={latestPosts} showHomesLink={showHomesLink} />
    </LivePhotosContext.Provider>
  );
}
