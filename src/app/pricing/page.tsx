import Link from "next/link";
import NavAuthCta from "@/components/NavAuthCta";
import type { Metadata } from "next";
import {
  Check,
  ArrowRight,
  Globe,
  Sparkles,
  MessageSquare,
  CalendarDays,
  BarChart3,
  Zap,
} from "lucide-react";
import RoiCalculator from "@/components/RoiCalculator";

export const metadata: Metadata = {
  title: "Pricing: $150/Month, Unlimited Listing Sites",
  description:
    "ListingFlare pricing: $150/month for unlimited listing websites with AI chat, lead capture and an instant AI reply to new leads. 14-day free trial, no card required.",
  alternates: {
    canonical: "https://www.listingflare.com/pricing",
  },
  openGraph: {
    type: "website",
    siteName: "ListingFlare",
    locale: "en_US",
    title: "Pricing: $150/Month, Unlimited Listing Sites | ListingFlare",
    description:
      "ListingFlare pricing: $150/month for unlimited listing websites with AI chat, lead capture and an instant AI reply to new leads. 14-day free trial, no card required.",
    url: "https://www.listingflare.com/pricing",
    images: [{ url: "https://www.listingflare.com/opengraph-image", width: 1200, height: 630, alt: "ListingFlare" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing: $150/Month, Unlimited Listing Sites | ListingFlare",
    description:
      "ListingFlare pricing: $150/month for unlimited listing websites with AI chat, lead capture and an instant AI reply to new leads. 14-day free trial, no card required.",
  },
};

const featureGroups = [
  {
    icon: Globe,
    title: "Premium Listing Pages",
    items: [
      "Unlimited branded listing websites",
      "Custom agent branding on every page",
      "Mobile-optimized layouts",
      "Virtual tour embeds (Matterport, Kuula, 360)",
      "Photo gallery with drag-to-reorder",
      "Video uploads (10 per listing)",
      "Auto-generated SEO metadata and sitemaps",
      "Public city pages, eligible for search indexing once qualifying inventory requirements are met",
    ],
  },
  {
    icon: Sparkles,
    title: "AI That Works While You Sleep",
    items: [
      "AI chatbot answers buyer questions 24/7",
      "AI email replies to new leads, with optional approval before sending",
      "AI Approval Mode (review before sending)",
      "AI business assistant (analyzes your listings and leads)",
      "AI listing description writer",
      "AI photo captions",
      "AI-drafted replies to buyer inquiries",
    ],
  },
  {
    icon: MessageSquare,
    title: "Lead Management That Feels Like a Real CRM",
    items: [
      "Conversation thread for each lead, with replies sent by email from your dashboard",
      "Text leads with one tap - sends from your real phone number",
      "Pipeline kanban view with drag-and-drop",
      "Hot Lead scoring (hot, warm, cold)",
      "Speed-to-Lead tracker showing your own response times",
      "Bulk status updates and bulk delete",
      "CSV export of filtered leads",
      "Full lead search across name, email, phone, address",
      "Hot visitor alerts (3+ views flags a returning buyer)",
    ],
  },
  {
    icon: CalendarDays,
    title: "Built-In Showing Scheduler",
    items: [
      "3-step date, time, and info flow (no Calendly needed)",
      "Automatic .ics calendar invites in confirmations",
      "Showing reminder emails to buyers",
      "Google Calendar events for confirmed showings (optional)",
      "Manual showing creation for phone or text bookings",
      "Edit, reschedule, or cancel any showing",
      "Showings page grouped by date",
    ],
  },
  {
    icon: Zap,
    title: "Automation in the Background",
    items: [
      "Open house QR sign-in that turns each submitted sign-in into a lead",
      "Agent activity feed (see what the AI did for you today)",
      "Weekly performance email (views, leads, conversions)",
      "Hot visitor alerts when buyers keep coming back",
      "All automation runs in the background with no setup",
    ],
  },
  {
    icon: Sparkles,
    title: "Keep Your Sellers Obsessed",
    items: [
      "Private real-time dashboard for each seller (no login required)",
      "Seller sees live views, inquiries, showings, and AI chats",
      "Branded with your name, headshot, and click-to-text / call",
      "Anonymized activity (your buyer privacy stays protected)",
      "Magic-link invite email with your brand, sent with one click",
      "Visit tracking so you know when your seller checks in",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics and Growth Tools",
    items: [
      "Full analytics dashboard (views, leads, conversions)",
      "Per-listing performance breakdown",
      "Lead pipeline stats with click-to-filter",
      "Social media post generator (Instagram, Facebook, Stories)",
      "Open house flyer generator (PDF with QR)",
      "QR code generator for every listing",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <NavAuthCta className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors" label="Start Free Trial" />
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-gray-900 md:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            One plan. Everything included. No hidden fees.
          </p>
        </div>

        {/* Pricing card */}
        <div className="mt-12 rounded-2xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-8 shadow-lg shadow-brand-100/50 md:p-10">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                ListingFlare Pro
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-serif text-5xl font-bold text-gray-900">$150</span>
                <span className="text-lg text-gray-500">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                That is about $5 a day. A single closed sale can cover many months of the subscription, but closings are never guaranteed.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/signup"
                className="group flex items-center justify-center gap-2 rounded-full bg-gray-950 px-8 py-4 text-base font-medium text-white transition-all hover:bg-gray-800 hover:shadow-xl"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="text-center text-sm text-gray-600">
                14-day free trial. No credit card required.
              </p>
            </div>
          </div>

          <hr className="my-8 border-brand-200" />

          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Everything included
          </p>
          <p className="mt-1 text-xs text-gray-500">
            What the plan covers, grouped by task.
          </p>

          <div className="mt-6 space-y-6">
            {featureGroups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
                      <Icon className="h-4 w-4 text-brand-600" />
                    </div>
                    <h2 className="font-serif text-base font-bold text-gray-900">
                      {group.title}
                    </h2>
                  </div>
                  <div className="mt-3 grid gap-2 pl-1 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROI Calculator */}
        <RoiCalculator />

        {/* Teams */}
        <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
          <h2 className="font-serif text-2xl font-bold text-gray-900">Running a team or brokerage?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray-600">
            Shared dashboards, team analytics, centralized billing, and volume pricing for 5, 10, or 25+ agents. Email us and we&apos;ll put something together.
          </p>
          <a
            href="mailto:kelvin@listingflare.com?subject=Team%20Plan%20Inquiry"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Get Team Pricing
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* FAQ-style objection handling */}
        <div className="mt-16 space-y-6">
          <h2 className="font-serif text-2xl font-bold text-gray-900 text-center">
            Common questions about pricing
          </h2>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-900">Is there a free trial?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Yes. You get 14 days free, no credit card required to start. The trial includes 1 listing with up to 5 photos. Video uploads, replying to leads from your dashboard and social post generation are part of the paid plan. Cancel anytime.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-900">Are there any contracts?</h3>
              <p className="mt-2 text-sm text-gray-600">
                No contracts. Month-to-month billing. Cancel whenever you want with one click.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-900">Is $150/month worth it?</h3>
              <p className="mt-2 text-sm text-gray-600">
                It depends on your listings and how many buyers you reach. A lead is not a sale, and most leads do not close. Use the break-even calculator above with your own numbers (it starts at zero additional sales, so it shows the plan as a cost until you assume otherwise). Nothing here is a guarantee of leads, showings or sales.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-900">What happens after the trial?</h3>
              <p className="mt-2 text-sm text-gray-600">
                After 14 days, you can upgrade to continue using ListingFlare at $150/month. If you do not upgrade, your listings will be paused until you subscribe. No surprise charges.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl bg-gray-950 p-8 text-center md:p-10">
          <h2 className="font-serif text-2xl font-bold text-white">
            Ready to capture more leads from your listings?
          </h2>
          <p className="mt-3 text-gray-400">
            Start your 14-day free trial. No credit card required.
          </p>
          <Link
            href="/signup"
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-brand-700 px-8 py-4 text-base font-medium text-white transition-all hover:bg-brand-800 hover:shadow-xl hover:shadow-brand-500/20"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <Link href="/" aria-label="ListingFlare home" className="font-serif text-lg font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <Link href="/blog" className="transition-colors hover:text-gray-900">Blog</Link>
            <Link href="/about" className="transition-colors hover:text-gray-900">About</Link>
            <Link href="/privacy" className="transition-colors hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-gray-900">Terms</Link>
            <span>&copy; {new Date().getFullYear()} ListingFlare</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
