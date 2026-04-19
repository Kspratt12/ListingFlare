import Link from "next/link";
import type { Metadata } from "next";
import {
  Check,
  ArrowRight,
  ShieldCheck,
  Globe,
  Sparkles,
  MessageSquare,
  CalendarDays,
  BarChart3,
  Zap,
} from "lucide-react";
import RoiCalculator from "@/components/RoiCalculator";

export const metadata: Metadata = {
  title: "Pricing - ListingFlare",
  description:
    "ListingFlare pricing: $150/month for unlimited listing websites with AI chatbot, lead capture, and automated follow-up. 14-day free trial, no credit card required.",
  alternates: {
    canonical: "https://www.listingflare.com/pricing",
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
      "Public city directory pages (listingflare.com/homes/your-city)",
    ],
  },
  {
    icon: Sparkles,
    title: "AI That Works While You Sleep",
    items: [
      "AI chatbot answers buyer questions 24/7",
      "Instant AI auto-reply to every new lead",
      "AI Approval Mode (review before sending)",
      "Day 1, 3, and 7 follow-up sequences written by AI",
      "AI business assistant (analyzes your listings and leads)",
      "AI listing description writer",
      "AI photo captions",
      "AI-drafted replies to buyer emails",
    ],
  },
  {
    icon: MessageSquare,
    title: "Lead Management That Feels Like a Real CRM",
    items: [
      "Two-way threaded conversation inbox",
      "Pipeline kanban view with drag-and-drop",
      "Hot Lead scoring (hot, warm, cold)",
      "Speed-to-Lead tracker vs 47-minute industry avg",
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
      "24-hour reminder emails to buyers",
      "Google Calendar 2-way sync (optional)",
      "Manual showing creation for phone or text bookings",
      "Edit, reschedule, or cancel any showing",
      "Showings page grouped by date",
      "Auto-feedback request 2 hours after every showing",
    ],
  },
  {
    icon: Zap,
    title: "Automation That Never Sleeps",
    items: [
      "New listing goes live, past leads in same city auto-notified",
      "Testimonial requests sent after closed deals",
      "Open house QR sign-in with instant drip enrollment",
      "Agent activity feed (see what the AI did for you today)",
      "Weekly performance email (views, leads, conversions)",
      "Hot visitor alerts when buyers keep coming back",
      "All automation runs in the background with no setup",
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
          <Link
            href="/signup"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Start Free Trial
          </Link>
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
                That is $5 a day. One closed deal pays for years of the subscription.
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
              <p className="text-center text-xs text-gray-400">
                14-day free trial. No credit card required.
              </p>
            </div>
          </div>

          {/* Money-back guarantee badge */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                30-day money-back guarantee
              </p>
              <p className="mt-0.5 text-xs text-emerald-800">
                If ListingFlare doesn&apos;t help you book a showing in your first 30 days, email us and we&apos;ll refund 100% of your first month. No hoops.
              </p>
            </div>
          </div>

          <hr className="my-8 border-brand-200" />

          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Everything included
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {featureGroups.reduce((sum, g) => sum + g.items.length, 0)} features across every piece of your workflow.
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
                    <h3 className="font-serif text-base font-bold text-gray-900">
                      {group.title}
                    </h3>
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
        <div className="mt-12 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Coming Soon</p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-gray-900">Team Plans</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray-600">
            Plans for teams of 5, 10, and 25 agents with shared dashboards, team analytics,
            and centralized billing. If you need a team plan now, reach out and we will set you up.
          </p>
          <a
            href="mailto:kelvin@listingflare.com?subject=Team%20Plan%20Inquiry"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Contact Us About Teams
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
                Yes. You get 14 days free with full access to every feature. No credit card required to start. Cancel anytime.
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
                One buyer lead from a $400,000 home is worth $12,000 in commission at 3%. If ListingFlare captures even one extra lead per year that you would have missed, it pays for itself more than six times over.
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
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-8 py-4 text-base font-medium text-white transition-all hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/20"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <span className="font-serif text-lg font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </span>
          <div className="flex items-center gap-5 text-sm text-gray-500">
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
