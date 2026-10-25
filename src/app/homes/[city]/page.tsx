import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { slugifyCity, MIN_LISTINGS_TO_INDEX } from "@/lib/cities";
import { isAgentInactive, firstRelation } from "@/lib/listingVisibility";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ city: string }>;
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Convert slug to display name: "raleigh-nc" -> "Raleigh, NC" */
function cityDisplayName(slug: string): string {
  const parts = slug.split("-");
  const state = parts.pop()?.toUpperCase() || "";
  const city = parts
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${city}, ${state}`;
}

/** Split "fuquay-varina-nc" into { citySlug: "fuquay-varina", state: "NC" } */
function parseCitySlug(slug: string): { citySlug: string; state: string } {
  const parts = slug.split("-");
  const state = (parts.pop() || "").toUpperCase();
  return { citySlug: parts.join("-"), state };
}

// Cities are matched by slug, not by rebuilding the name from the URL, so
// hyphenated names ("Fuquay-Varina") and multi-word names both resolve.
// cache() lets generateMetadata and the page share one query per request.
const getCityListings = cache(async (slug: string) => {
  const { citySlug, state } = parseCitySlug(slug);
  if (!citySlug || !state) return { listings: [], cityName: null as string | null, state };

  const db = getAdminClient();
  const { data } = await db
    .from("listings")
    .select("id, slug, agent_id, street, city, state, price, beds, baths, sqft, photos, description, agent:agent_profiles(name, title, brokerage, headshot_url, subscription_status, trial_ends_at)")
    .eq("status", "published")
    .ilike("state", state)
    .order("created_at", { ascending: false });

  const listings = (data || []).filter(
    (l) => slugifyCity(l.city || "") === citySlug && !isAgentInactive(firstRelation(l.agent as never))
  );
  return { listings, cityName: (listings[0]?.city as string | undefined) ?? null, state };
});

function displayFor(slug: string, cityName: string | null, state: string) {
  return cityName ? `${cityName}, ${state}` : cityDisplayName(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug } = await params;
  const { listings, cityName, state } = await getCityListings(citySlug);
  const display = displayFor(citySlug, cityName, state);

  return {
    title: `Homes for Sale in ${display}`,
    description: `Browse homes for sale in ${display}. View property details, photos, and connect with listing agents on ListingFlare.`,
    // Thin pages stay reachable but out of Google's index
    robots: { index: listings.length >= MIN_LISTINGS_TO_INDEX, follow: true },
    openGraph: {
      title: `Homes for Sale in ${display}`,
      description: `Browse available homes and listings in ${display} on ListingFlare.`,
      url: `https://www.listingflare.com/homes/${citySlug}`,
      images: [{ url: "https://www.listingflare.com/opengraph-image", width: 1200, height: 630, alt: "ListingFlare" }],
    },
    alternates: {
      canonical: `https://www.listingflare.com/homes/${citySlug}`,
    },
  };
}

export default async function CityPage({ params }: Props) {
  const { city: citySlug } = await params;

  // Not a "city-state" shaped slug at all
  if (citySlug.split("-").length < 2) {
    notFound();
  }

  const { listings, cityName, state } = await getCityListings(citySlug);
  const display = displayFor(citySlug, cityName, state);
  const hasListings = listings.length > 0;

  // JSON-LD for the city page
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Homes for Sale in ${display}`,
    description: `Browse available homes and listings in ${display} on ListingFlare.`,
    url: `https://www.listingflare.com/homes/${citySlug}`,
    publisher: {
      "@type": "Organization",
      name: "ListingFlare",
      url: "https://www.listingflare.com",
    },
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold text-gray-900">
            Listing<span className="text-brand-400">Flare</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 md:block"
            >
              Blog
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="mx-auto max-w-5xl px-6 pt-16 pb-10">
        <h1 className="font-serif text-3xl font-bold text-gray-900 md:text-4xl">
          Homes for Sale in {display}
        </h1>
        <p className="mt-3 text-gray-600">
          {hasListings
            ? `${listings.length} ${listings.length === 1 ? "property" : "properties"} available in ${display}. Each listing features a dedicated property page with photos, details, and AI-powered chat.`
            : `No listings currently available in ${display}. Check back soon or browse homes in other cities.`}
        </p>
      </header>

      {/* Listings Grid */}
      <main className="mx-auto max-w-5xl px-6 pb-24">
        {hasListings ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => {
              const photo = listing.photos?.[0];
              const agent = Array.isArray(listing.agent) ? listing.agent[0] : listing.agent;
              return (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.slug || listing.id}`}
                  className="group overflow-hidden rounded-xl border border-gray-200 transition-all hover:border-brand-300 hover:shadow-lg"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                    {photo?.src ? (
                      <Image
                        src={photo.src}
                        alt={photo.alt || `${listing.street}, ${listing.city}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-serif text-xl font-bold text-gray-900">
                      {formatPrice(listing.price)}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {listing.beds} bed &middot; {listing.baths} bath
                      &middot; {listing.sqft?.toLocaleString()} sqft
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {listing.street}, {listing.city}, {listing.state}
                    </p>
                    {agent?.name && (
                      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                        {agent.headshot_url ? (
                          <Image
                            src={agent.headshot_url}
                            alt={agent.name}
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                            {agent.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-700">
                            Listed by {agent.name}
                          </p>
                          {agent.brokerage && (
                            <p className="truncate text-[10px] text-gray-500">
                              {agent.brokerage}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
            <p className="text-gray-500">
              No active listings in {display} right now.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Are you an agent with listings in {display}?
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              List Your Properties
            </Link>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif text-2xl font-bold text-gray-900">
            Real estate agent in {display}?
          </h2>
          <p className="mt-3 text-gray-600">
            Give every listing its own stunning website with AI chatbot, lead
            capture, and instant follow-up. Your properties will appear on this
            page automatically.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/demo"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              See a Demo
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
