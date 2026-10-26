import type { Metadata } from "next";
import NavAuthCta from "@/components/NavAuthCta";
import Link from "next/link";
import { TEMPLATES, downloadBox } from "@/content/templates";

const baseUrl = "https://www.listingflare.com";
const path = "/free-real-estate-templates";

export const metadata: Metadata = {
  title: "Free Real Estate Agent Templates (PDF, Word)",
  description:
    "Free real estate agent templates: listing presentation, marketing plan, open house checklist and sign-in sheet, seller updates. PDF, fillable PDF and Word.",
  alternates: { canonical: `${baseUrl}${path}` },
};

const FAQ = [
  {
    q: "Are these real estate templates really free?",
    a: "Yes. You can download them without an email address or an account. They are general guidance, not legal advice.",
  },
  {
    q: "Which format should I pick?",
    a: "PDF is for printing and filling in by hand. Fillable PDF lets you type into the blanks on screen and then save or print it; open it in a PDF reader such as Adobe Acrobat Reader, because some phone and browser previews do not support typing into forms. Word is for editing on a computer and adding your own branding.",
  },
  {
    q: "Can I use these instead of my brokerage's forms?",
    a: "Follow your brokerage's required forms, disclosures and policies first. Use these for the parts your brokerage leaves to you, and adjust them to your brokerage's and your state's requirements.",
  },
  {
    q: "Do the templates include prices or statistics?",
    a: "No. They have blanks for your own details and numbers, and nothing is prefilled.",
  },
];

export default function Page() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ListingFlare", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Free Real Estate Templates", item: `${baseUrl}${path}` },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="hidden text-sm text-gray-500 hover:text-gray-900 sm:block">
              Blog
            </Link>
            <NavAuthCta className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600" label="Start Free Trial" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">Free tools</p>
        <h1 className="mt-3 font-serif text-4xl font-bold text-gray-900 md:text-5xl">Free Real Estate Agent Templates</h1>
        <p className="mt-5 text-lg text-gray-600">
          Templates for the things listing agents do most: pitch a seller, plan the marketing, prepare a listing, run an open house, and keep the seller updated. Download them as a printable PDF, a fillable PDF or Word. No email or account needed.
        </p>
        <p className="mt-3 text-sm text-gray-500">
          These are starting points. Fill in your own details, and adjust them to your brokerage&apos;s and state&apos;s requirements. They are general guidance, not legal advice.
        </p>

        <div className="mt-8">
          {TEMPLATES.map((t) => (
            <div key={t.id}>
              <div dangerouslySetInnerHTML={{ __html: downloadBox(t.id) }} />
              <p className="-mt-3 mb-8 text-sm">
                <Link href={t.guideHref} className="font-medium text-brand-700 underline hover:text-brand-800">
                  {t.guideLabel} &rarr;
                </Link>
              </p>
            </div>
          ))}
        </div>

        <section className="mt-12 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
          <h2 className="font-serif text-xl font-bold text-gray-900">Give every listing its own page</h2>
          <p className="mt-2 text-sm text-gray-600">
            ListingFlare builds a branded page for each listing with a photo gallery, a lead form, an AI assistant that answers buyer questions, and a QR code for open houses. Try it free for 14 days.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="rounded-full bg-gray-950 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800">
              Start your free trial
            </Link>
            <Link href="/demo" className="rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              See a live example
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-2xl font-bold text-gray-900">Common questions</h2>
          <div className="mt-5 space-y-5">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-gray-900">{f.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-gray-100 pt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Keep reading</h2>
          <ul className="mt-4 space-y-2">
            {[
              { href: "/blog/real-estate-lead-follow-up-sequence", label: "Real estate lead follow-up: day 1, 3 and 7 templates" },
              { href: "/blog/open-house-follow-up", label: "Open house follow-up: what to say and when" },
              { href: "/single-property-website-builder", label: "Single property website builder for real estate agents" },
              { href: "/blog", label: "All articles" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  {l.label} &rarr;
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <Link href="/" aria-label="ListingFlare home" className="font-serif text-lg font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-gray-500">
            <Link href="/blog" className="hover:text-gray-900">Blog</Link>
            <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
            <Link href="/about" className="hover:text-gray-900">About</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <span>&copy; {new Date().getFullYear()} ListingFlare</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
