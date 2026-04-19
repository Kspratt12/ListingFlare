import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Listing, AgentProfile } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, Star, Quote } from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("agent_profiles")
    .select("name, brokerage")
    .eq("id", params.id)
    .single();

  if (!data) return { title: "Agent Not Found" };

  return {
    title: `${data.name} - ${data.brokerage} | ListingFlare`,
    description: `View all property listings by ${data.name} at ${data.brokerage}.`,
  };
}

export default async function AgentProfilePage({ params }: Props) {
  const supabase = createServerSupabaseClient();

  const { data: agent } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!agent) notFound();

  const typedAgent = agent as AgentProfile;

  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("agent_id", params.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const typedListings = (listings || []) as Listing[];

  // Fetch approved testimonials
  const { data: testimonialsData } = await supabase
    .from("testimonials")
    .select("id, author_name, rating, quote, created_at")
    .eq("agent_id", params.id)
    .eq("approved", true)
    .not("quote", "eq", "")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const testimonials = testimonialsData || [];

  // Average rating for display
  const ratedTestimonials = testimonials.filter((t) => t.rating);
  const avgRating = ratedTestimonials.length > 0
    ? ratedTestimonials.reduce((sum, t) => sum + (t.rating || 0), 0) / ratedTestimonials.length
    : 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="font-serif text-xl font-bold text-gray-900">
          Listing<span className="text-brand-400">Flare</span>
        </Link>
      </nav>

      {/* Agent header */}
      <section className="bg-gray-950 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          {typedAgent.headshot_url && (
            <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-brand-400/30 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={typedAgent.headshot_url}
                alt={typedAgent.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <h1 className="mt-5 font-serif text-3xl font-bold text-white md:text-4xl">
            {typedAgent.name}
          </h1>
          <p className="mt-1 text-lg text-brand-400">{typedAgent.title}</p>
          <p className="mt-1 text-gray-400">{typedAgent.brokerage}</p>
          {avgRating > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${n <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-amber-400/30"}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-amber-100">
                {avgRating.toFixed(1)} from {ratedTestimonials.length} review{ratedTestimonials.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            {typedAgent.phone && (
              <a
                href={`tel:${typedAgent.phone}`}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
              >
                <Phone className="h-4 w-4" />
                {formatPhone(typedAgent.phone)}
              </a>
            )}
            <a
              href={`mailto:${typedAgent.email}`}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
            >
              <Mail className="h-4 w-4" />
              {typedAgent.email}
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-500">
                What clients say
              </p>
              <h2 className="mt-3 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
                Real words from real clients
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <Quote className="absolute right-4 top-4 h-6 w-6 text-brand-200" />
                  {t.rating && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-4 w-4 ${n <= (t.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-sm italic leading-relaxed text-gray-700">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="mt-4 text-sm font-semibold text-gray-900">
                    {t.author_name || "Verified client"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Listings */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            {typedListings.length > 0
              ? `${typedListings.length} Active Listing${typedListings.length !== 1 ? "s" : ""}`
              : "No Active Listings"}
          </h2>

          {typedListings.length > 0 && (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {typedListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.slug || listing.id}`}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    {listing.photos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.photos[0].src}
                        alt={listing.street}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        No Photos
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-lg font-semibold text-gray-900">
                      {listing.street}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {[listing.city, listing.state, listing.zip].filter(Boolean).join(", ")}
                    </p>
                    <p className="mt-2 font-serif text-xl font-bold text-gray-900">
                      {listing.price ? formatPrice(listing.price) : "Price TBD"}
                    </p>
                    <div className="mt-2 flex gap-3 text-sm text-gray-500">
                      {listing.beds > 0 && <span>{listing.beds} Beds</span>}
                      {listing.baths > 0 && <span>{listing.baths} Baths</span>}
                      {listing.sqft > 0 && <span>{listing.sqft.toLocaleString()} Sq Ft</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
