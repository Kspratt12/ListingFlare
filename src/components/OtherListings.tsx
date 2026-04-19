"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Home, ArrowRight } from "lucide-react";

interface Props {
  agentId: string;
  currentListingId: string;
  agentName: string;
}

interface MiniListing {
  id: string;
  slug: string | null;
  street: string;
  city: string;
  state: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  photos: Array<{ src: string }> | null;
}

// Bottom-of-page upsell. If the agent has other active listings, show
// thumbnails so a buyer who liked this home might check the others.
// Only renders when there's at least 1 other listing.
export default function OtherListings({ agentId, currentListingId, agentName }: Props) {
  const [listings, setListings] = useState<MiniListing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("listings")
          .select("id, slug, street, city, state, price, beds, baths, sqft, photos")
          .eq("agent_id", agentId)
          .eq("status", "published")
          .neq("id", currentListingId)
          .order("created_at", { ascending: false })
          .limit(4);
        if (active) {
          setListings((data as MiniListing[]) || []);
          setLoaded(true);
        }
      } catch {
        if (active) setLoaded(true);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [agentId, currentListingId]);

  if (!loaded || listings.length === 0) return null;

  const firstName = agentName?.split(" ")[0] || "this agent";

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              More from {firstName}
            </p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              Other homes you might like
            </h2>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((l) => {
            const href = l.slug ? `/listing/${l.slug}` : `/listing/${l.id}`;
            const hero = l.photos?.[0]?.src;
            return (
              <Link
                key={l.id}
                href={href}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                  {hero ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={hero}
                      alt={l.street}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <Home className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-serif text-lg font-bold text-gray-900">
                    ${Math.round(l.price).toLocaleString()}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-700">{l.street}</p>
                  <p className="truncate text-xs text-gray-500">{l.city}, {l.state}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-600">
                    <span>{l.beds} bd</span>
                    <span className="text-gray-300">·</span>
                    <span>{l.baths} ba</span>
                    {l.sqft > 0 && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>{l.sqft.toLocaleString()} sqft</span>
                      </>
                    )}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 group-hover:underline">
                    View home
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
