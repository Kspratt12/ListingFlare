import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About ListingFlare: Real Estate Software Built by Kelvin Spratt",
  description:
    "ListingFlare is real estate software built by Kelvin Spratt to help listing agents create property websites, capture leads, and close more deals with AI-powered tools.",
  alternates: {
    canonical: "https://www.listingflare.com/about",
  },
};

export default function AboutPage() {
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Kelvin Spratt",
    url: "https://www.listingflare.com/about",
    jobTitle: "Founder & CEO",
    worksFor: {
      "@type": "Organization",
      name: "ListingFlare",
      url: "https://www.listingflare.com",
    },
    knowsAbout: [
      "Real Estate Software",
      "Real Estate Marketing",
      "Lead Generation",
      "AI Technology",
      "Digital Marketing",
      "SEO",
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/"
            className="font-serif text-xl font-bold text-gray-900"
          >
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Blog
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="font-serif text-4xl font-bold text-gray-900 md:text-5xl">
          About ListingFlare
        </h1>

        <div className="mt-10 space-y-6 text-lg leading-relaxed text-gray-600">
          <p>
            ListingFlare is real estate software built for listing agents who want to stand out.
            Every listing deserves more than a basic MLS page or a Zillow profile where your
            leads get funneled to other agents. ListingFlare gives you a dedicated property
            website with AI-powered lead capture, so every buyer inquiry comes straight to you.
          </p>

          <h2 className="font-serif text-2xl font-bold text-gray-900 pt-4">
            Built by Kelvin Spratt
          </h2>
          <p>
            I built ListingFlare after watching real estate agents lose leads to platforms
            that were designed to sell those leads to competing agents. The problem was clear:
            agents needed a way to market their listings directly to buyers without a middleman
            taking a cut or redirecting attention to the competition.
          </p>
          <p>
            My background is in digital marketing, SEO, and building software products that
            solve real business problems. I have spent years studying how people search for
            homes online, what makes them reach out to an agent, and why most listing marketing
            fails to convert. ListingFlare is the result of everything I have learned about
            lead generation, conversion optimization, and the real estate industry.
          </p>

          <h2 className="font-serif text-2xl font-bold text-gray-900 pt-4">
            What Makes ListingFlare Different
          </h2>
          <p>
            Most real estate software tries to do everything and ends up doing nothing well.
            ListingFlare focuses on one thing: making your listings generate leads. Every
            feature we build, from the AI chatbot to the automated follow-up emails, exists
            to help you capture and convert more buyer leads from your listings.
          </p>
          <ul className="space-y-3 pl-1">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
              <span>Dedicated property websites that make your listings look premium</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
              <span>AI chatbot that answers buyer questions 24/7 and captures their contact info</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
              <span>Automated follow-up so you never lose a lead to slow response time</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
              <span>Analytics that show you exactly who is looking at your listings and when</span>
            </li>
          </ul>

          <h2 className="font-serif text-2xl font-bold text-gray-900 pt-4">
            Our Mission
          </h2>
          <p>
            Real estate agents are the backbone of the housing market. They deserve software
            that works for them, not against them. ListingFlare exists to give every listing
            agent the marketing tools they need to compete with teams, brokerages, and
            platforms that have ten times their budget. Your listings, your leads, your brand.
          </p>
        </div>

        <div className="mt-14 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
          <h2 className="font-serif text-2xl font-bold text-gray-900">
            Ready to try ListingFlare?
          </h2>
          <p className="mt-3 text-gray-600">
            Start your 14-day free trial. No credit card required.
          </p>
          <Link
            href="/signup"
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-gray-950 px-8 py-4 text-base font-medium text-white transition-all hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-950/10"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </main>

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
