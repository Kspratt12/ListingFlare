"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Listing } from "@/lib/types";
import Link from "next/link";
import { PlusCircle, Eye, ExternalLink, MoreVertical } from "lucide-react";

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });

      setListings((data as Listing[]) || []);
      setLoading(false);
    }
    fetchListings();
  }, [supabase]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-50 text-green-700 border-green-200",
      draft: "bg-gray-50 text-gray-600 border-gray-200",
      archived: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return styles[status] || styles.draft;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            My Listings
          </h1>
          <p className="mt-1 text-gray-500">
            Manage your property listing websites.
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <PlusCircle className="h-4 w-4" />
          New Listing
        </Link>
      </div>

      {loading ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-gray-200 bg-white"
            />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <PlusCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-4 font-serif text-xl font-semibold text-gray-900">
            No listings yet
          </h3>
          <p className="mt-2 text-gray-500">
            Create your first property listing website to get started.
          </p>
          <Link
            href="/dashboard/create"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-950 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            <PlusCircle className="h-4 w-4" />
            Create Listing
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/dashboard/edit/${listing.id}`}
              className="group block overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
            >
              {/* Thumbnail */}
              <div className="relative h-44 overflow-hidden bg-gray-100">
                {listing.photos.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.photos[0].src}
                    alt={listing.street}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300">
                    No Photos
                  </div>
                )}
                <span
                  className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(listing.status)}`}
                >
                  {listing.status}
                </span>
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="font-serif text-lg font-semibold text-gray-900">
                  {listing.street || "Untitled Listing"}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {[listing.city, listing.state, listing.zip]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="mt-2 font-serif text-xl font-bold text-gray-900">
                  {listing.price ? formatPrice(listing.price) : "Price TBD"}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-400">
                    <Eye className="h-4 w-4" />
                    {listing.view_count} views
                  </div>
                  <div className="flex items-center gap-2">
                    {listing.status === "published" && (
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(`/listing/${listing.id}`, "_blank");
                        }}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 cursor-pointer"
                        title="View live page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </span>
                    )}
                    <span
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                      title="Edit"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
