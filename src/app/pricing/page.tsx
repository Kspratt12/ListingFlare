import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing - ListingFlare",
  description:
    "ListingFlare pricing: $150/month for unlimited listing websites with AI chatbot, lead capture, and automated follow-up. 14-day free trial, no credit card required.",
  alternates: {
    canonical: "https://www.listingflare.com/pricing",
  },
};

const features = [
  "Unlimited listing websites",
  "AI chatbot on every listing page",
  "Lead capture with instant notifications",
  "AI-drafted follow-up emails",
  "Virtual tour embeds (Matterport, Kuula)",
  "Analytics dashboard with weekly reports",
  "Social media post generation",
  "Open house flyer creation",
  "Custom agent branding on every page",
  "AI listing description writer",
  "AI photo captions",
  "QR code generation",
  "Mobile-optimized listing pages",
  "Calendly integration for showing booking",
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

          <hr className="my-8 border-brand-200" />

          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Everything included
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
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
