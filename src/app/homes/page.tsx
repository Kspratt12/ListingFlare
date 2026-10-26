import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { slugifyCity, MIN_LISTINGS_TO_INDEX } from "@/lib/cities";
import { isAgentInactive, firstRelation } from "@/lib/listingVisibility";
import { isDemoAgentId } from "@/lib/demoAgents";

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

interface CityRow {
  slug: string;
  name: string;
  state: string;
  count: number;
  realCount: number;
}

async function getCities(): Promise<CityRow[]> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await db
      .from("listings")
      .select("city, state, agent_id, agent:agent_profiles(subscription_status, trial_ends_at)")
      .eq("status", "published")
      .limit(5000);
    const map = new Map<string, CityRow>();
    for (const l of data || []) {
      if (!l.city || !l.state) continue;
      if (isAgentInactive(firstRelation(l.agent as never))) continue;
      const slug = `${slugifyCity(l.city)}-${String(l.state).toLowerCase()}`;
      const real = isDemoAgentId(l.agent_id as string | null) ? 0 : 1;
      const row = map.get(slug);
      if (row) { row.count += 1; row.realCount += real; }
      else map.set(slug, { slug, name: l.city as string, state: String(l.state).toUpperCase(), count: 1, realCount: real });
    }
    // Same rule as the city pages and the sitemap: thin cities are left out.
    return Array.from(map.values())
      .filter((c) => c.count >= MIN_LISTINGS_TO_INDEX)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

// Sample listings from demo accounts still appear here, but the page only asks
// Google to index it once there are real cities to list.
export async function generateMetadata(): Promise<Metadata> {
  const cities = await getCities();
  const hasRealCities = cities.some((c) => c.realCount >= MIN_LISTINGS_TO_INDEX);
  return { ...baseMetadata, robots: { index: hasRealCities, follow: true } };
}

export default async function HomesIndexPage() {
  const cities = await getCities();
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
          <Link href="/signup" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600">
            Start Free Trial
          </Link>
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
          <span className="font-serif text-lg font-bold text-gray-900">
            Listing<span className="text-brand-500">Flare</span>
          </span>
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
