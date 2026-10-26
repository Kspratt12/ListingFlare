import Link from "next/link";
import { getPublicCities } from "@/lib/publicCities";
import NavAuthCta from "@/components/NavAuthCta";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const URL = "https://www.listingflare.com/homes";

const baseMetadata: Metadata = {
  title: "Homes for Sale by City",
  description:
    "Browse homes for sale by city. Each listing has its own page with photos, details and a direct way to contact the listing agent.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Homes for Sale by City on ListingFlare",
    description: "Browse listings by city, each with its own page and a direct line to the listing agent.",
    url: URL,
    images: [{ url: "https://www.listingflare.com/opengraph-image", width: 1200, height: 630, alt: "ListingFlare" }],
  },
};

// The admin/demo account's listings are never shown here. The page only asks Google
// to index it once real customers have published enough listings to list cities.
export async function generateMetadata(): Promise<Metadata> {
  const cities = await getPublicCities();
  return { ...baseMetadata, robots: { index: cities.length > 0, follow: true } };
}

export default async function HomesIndexPage() {
  const cities = await getPublicCities();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ListingFlare", item: "https://www.listingflare.com" },
      { "@type": "ListItem", position: 2, name: "Homes by City", item: URL },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </Link>
          <NavAuthCta className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600" label="Start Free Trial" />
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <h1 className="font-serif text-4xl font-bold text-gray-900 md:text-5xl">Homes for Sale by City</h1>
        <p className="mt-5 max-w-3xl text-lg text-gray-600">
          Listings published on ListingFlare, grouped by city. Each home has its own page with photos, details and a direct way to contact the listing agent.
        </p>

        {cities.length > 0 ? (
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link href={`/homes/${c.slug}`} className="block rounded-xl border border-gray-200 px-5 py-4 transition-colors hover:border-brand-300">
                  <span className="block text-sm font-semibold text-gray-900">
                    {c.name}, {c.state}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    {c.count} {c.count === 1 ? "listing" : "listings"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-gray-500">No cities to show yet. Check back soon.</p>
        )}

        <section className="mt-14 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
          <h2 className="font-serif text-xl font-bold text-gray-900">Listing agents: give every home its own page</h2>
          <p className="mt-2 text-sm text-gray-600">
            ListingFlare builds a branded page for each listing with a lead form, a QR code and an AI assistant that answers buyer questions.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/single-property-website-builder" className="rounded-full bg-gray-950 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800">
              See how it works
            </Link>
            <Link href="/demo" className="rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              See a live example
            </Link>
          </div>
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
