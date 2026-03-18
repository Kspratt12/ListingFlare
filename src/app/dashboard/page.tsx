"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Listing, AgentProfile } from "@/lib/types";
import { getSubscriptionLimits } from "@/lib/subscription";
import UpgradePrompt from "@/components/UpgradePrompt";
import Link from "next/link";
import { PlusCircle, Eye, Pencil, Share2, Loader2, Trash2, Lock, ArrowUpDown } from "lucide-react";

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPosts, setGeneratingPosts] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hasEverCreated, setHasEverCreated] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "city" | "state" | "price">("newest");
  const supabase = createClient();
  const limits = getSubscriptionLimits(profile);

  const handleGenerateSocialPosts = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setGeneratingPosts(listingId);
    try {
      const res = await fetch("/api/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (!res.ok) throw new Error("Failed to get listing data");
      const data = await res.json();

      const html2canvas = (await import("html2canvas-pro")).default;
      const JSZip = (await import("jszip")).default;

      const sizes = [
        { name: "instagram_post", w: 1080, h: 1080 },
        { name: "facebook_post", w: 1200, h: 630 },
        { name: "instagram_story", w: 1080, h: 1920 },
      ];

      const zip = new JSZip();

      for (const size of sizes) {
        const container = document.createElement("div");
        container.style.cssText = `position:fixed;left:-9999px;top:0;width:${size.w}px;height:${size.h}px;overflow:hidden;`;
        container.innerHTML = `
          <div style="width:${size.w}px;height:${size.h}px;position:relative;background:#000;">
            <img src="${data.heroUrl}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" />
            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.7) 70%,rgba(0,0,0,0.9) 100%);"></div>
            <div style="position:absolute;top:20px;left:30px;font-family:serif;font-size:${Math.round(24 * size.w / 1080)}px;font-weight:bold;color:#b8965a;">ListingFlare</div>
            <div style="position:absolute;bottom:${Math.round(40 * size.h / 1080)}px;left:30px;right:30px;color:white;">
              <div style="font-size:${Math.round(56 * size.w / 1080)}px;font-weight:bold;font-family:sans-serif;">${data.price}</div>
              <div style="font-size:${Math.round(26 * size.w / 1080)}px;margin-top:8px;">${data.street}</div>
              <div style="font-size:${Math.round(20 * size.w / 1080)}px;opacity:0.8;margin-top:4px;">${data.cityState}</div>
              <div style="font-size:${Math.round(20 * size.w / 1080)}px;color:#b8965a;font-weight:bold;margin-top:16px;">${data.details}</div>
              <div style="border-top:1px solid rgba(184,150,90,0.4);margin-top:16px;padding-top:12px;">
                <div style="font-size:${Math.round(18 * size.w / 1080)}px;">${data.agentName}</div>
                <div style="font-size:${Math.round(16 * size.w / 1080)}px;opacity:0.7;margin-top:2px;">${[data.agentPhone, data.brokerage].filter(Boolean).join("  |  ")}</div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(container);

        // Wait for image to load
        const img = container.querySelector("img");
        if (img && !img.complete) {
          await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        }

        const canvas = await html2canvas(container, { width: size.w, height: size.h, scale: 1, useCORS: true });
        document.body.removeChild(container);

        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
        zip.file(`${size.name}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "social_posts.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate social posts");
    } finally {
      setGeneratingPosts(null);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile for subscription status
      const { data: profileData } = await supabase
        .from("agent_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData as AgentProfile);

      // Fetch only this agent's listings
      const { data, count } = await supabase
        .from("listings")
        .select("*", { count: "exact" })
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false });

      setListings((data as Listing[]) || []);
      setHasEverCreated((count || 0) > 0 || (data || []).length > 0);
      setLoading(false);
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      pending: "bg-blue-50 text-blue-700 border-blue-200",
      closed: "bg-brand-50 text-brand-700 border-brand-300 font-semibold",
      archived: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return styles[status] || styles.draft;
  };

  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === "city") return (a.city || "").localeCompare(b.city || "");
    if (sortBy === "state") return (a.state || "").localeCompare(b.state || "");
    if (sortBy === "price") return (b.price || 0) - (a.price || 0);
    return 0; // newest — already sorted by created_at desc from DB
  });

  return (
    <div>
      {!loading && limits.isExpired && listings.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <Lock className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Your trial has expired</p>
            <p className="mt-0.5 text-xs text-red-600">Your listing is locked and hidden from visitors. Upgrade to reactivate it and unlock all features.</p>
          </div>
          <Link href="/dashboard/billing" className="flex-shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
            Upgrade Now
          </Link>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
            My Listings
          </h1>
          <p className="mt-1 text-gray-500">
            Manage your property listing websites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && listings.length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              {(["newest", "city", "state", "price"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    sortBy === s
                      ? "bg-gray-900 text-white"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200" />
          ) : !limits.isPaid && profile && listings.length >= limits.maxListings ? (
            <Link
              href="/dashboard/billing"
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              <Lock className="h-4 w-4" />
              Upgrade to Add More
            </Link>
          ) : (
            <Link
              href="/dashboard/create"
              className="flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              <PlusCircle className="h-4 w-4" />
              New Listing
            </Link>
          )}
        </div>
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
          {!limits.isPaid && hasEverCreated ? (
            <>
              <UpgradePrompt
                title="Listing Limit Reached"
                message="You've used your free trial listing. Upgrade to create unlimited listings with full photo galleries, 8K video, lead replies, and more."
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {sortedListings.map((listing) => (
            <div
              key={listing.id}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
            >
              {/* Thumbnail — clicks through to live listing page */}
              <Link
                href={`/listing/${listing.id}`}
                className="relative block h-44 overflow-hidden bg-gray-100"
              >
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
                <span
                  className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(listing.status)}`}
                >
                  {listing.status}
                </span>
              </Link>

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
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Eye className="h-4 w-4" />
                      {listing.view_count} views
                    </div>
                    <select
                      value={listing.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        await supabase.from("listings").update({ status: newStatus }).eq("id", listing.id);
                        setListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, status: newStatus as Listing["status"] } : l));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`appearance-none rounded-full border py-0.5 pl-2.5 pr-6 text-[11px] font-medium capitalize cursor-pointer ${statusBadge(listing.status)}`}
                    >
                      <option value="published">Published</option>
                      <option value="pending">Pending</option>
                      <option value="closed">Closed</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    {listing.status === "published" && listing.photos.length > 0 && limits.canGenerateSocialPosts && (
                      <span
                        onClick={(e) => handleGenerateSocialPosts(e, listing.id)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-gray-400 transition-colors hover:bg-purple-50 hover:text-purple-600 cursor-pointer"
                        title="Generate Social Posts"
                      >
                        {generatingPosts === listing.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Share2 className="h-3.5 w-3.5" />
                        )}
                        <span className="text-xs font-medium">Social</span>
                      </span>
                    )}
                    {listing.status === "published" && listing.photos.length > 0 && !limits.canGenerateSocialPosts && (
                      <Link
                        href="/dashboard/billing"
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-gray-300 transition-colors hover:bg-gray-50 cursor-pointer"
                        title="Upgrade to generate social posts"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Social</span>
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/edit/${listing.id}`}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-brand-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
                      title="Edit listing"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Edit</span>
                    </Link>
                    <span
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(listing.id); }}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer"
                      title="Delete listing"
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-gray-900">Delete this listing?</h3>
            {!limits.isPaid && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-800">Warning: Free trial allows only 1 listing</p>
                <p className="mt-1 text-xs text-red-600">If you delete this listing, you will not be able to create a new one. You&apos;ll need to upgrade to create more listings.</p>
              </div>
            )}
            <p className="mt-3 text-sm text-gray-500">This will permanently remove the listing page, all photos, and lead data. This action cannot be undone.</p>
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await supabase.from("listings").delete().eq("id", deleteConfirm);
                  setListings((prev) => prev.filter((l) => l.id !== deleteConfirm));
                  setHasEverCreated(true);
                  setDeleteConfirm(null);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
