"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Listing, AgentProfile } from "@/lib/types";
import { getSubscriptionLimits } from "@/lib/subscription";
import UpgradePrompt from "@/components/UpgradePrompt";
import Link from "next/link";
import { PlusCircle, Eye, Pencil, ArrowUpDown, Archive, Search, Lock } from "lucide-react";
import UpcomingShowings from "@/components/UpcomingShowings";
import ActivityFeed from "@/components/ActivityFeed";
import SpeedToLead from "@/components/SpeedToLead";
import GettingStarted from "@/components/GettingStarted";
import DailyBriefing from "@/components/DailyBriefing";
import RevenueStat from "@/components/RevenueStat";
import ListingActionsMenu from "@/components/ListingActionsMenu";

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPosts, setGeneratingPosts] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hasEverCreated, setHasEverCreated] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "city" | "state" | "price">("newest");
  const [priceDir, setPriceDir] = useState<"desc" | "asc">("desc");
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
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
      setToast({ message: err instanceof Error ? err.message : "Failed to generate social posts", type: "error" });
      setTimeout(() => setToast(null), 5000);
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

  const matchesSearch = (listing: Listing) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (listing.street || "").toLowerCase().includes(q) ||
      (listing.city || "").toLowerCase().includes(q) ||
      (listing.state || "").toLowerCase().includes(q) ||
      String(listing.price || "").includes(q)
    );
  };

  const filteredListings = (showArchived ? listings : listings.filter((l) => l.status !== "archived"))
    .filter(matchesSearch);
  const archivedCount = listings.filter((l) => l.status === "archived").length;

  const handleCopyLink = async (e: React.MouseEvent, listing: Listing) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/listing/${listing.slug || listing.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(listing.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setToast({ message: "Couldn't copy. Try again.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDownloadQR = async (e: React.MouseEvent, listing: Listing) => {
    e.preventDefault();
    e.stopPropagation();
    setGeneratingQR(listing.id);
    try {
      const QRCode = (await import("qrcode")).default;
      const url = `${window.location.origin}/listing/${listing.slug || listing.id}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 800,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      const slug = (listing.slug || listing.street || "listing").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      a.download = `qr-${slug}.png`;
      a.click();
      setToast({ message: "QR code downloaded.", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: "QR generation failed.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setGeneratingQR(null);
    }
  };

  const handleArchive = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await supabase.from("listings").update({ status: "archived" }).eq("id", listingId);
    setListings((prev) => prev.map((l) => l.id === listingId ? { ...l, status: "archived" as Listing["status"] } : l));
  };

  const handleDeleteRequest = (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm(listingId);
  };

  const handleDuplicate = async (e: React.MouseEvent, listing: Listing) => {
    e.preventDefault();
    e.stopPropagation();
    setDuplicating(listing.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: newListing, error } = await supabase.from("listings").insert({
        agent_id: user.id,
        status: "draft",
        street: listing.street ? `${listing.street} (copy)` : "",
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        price: listing.price,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        year_built: listing.year_built,
        lot_size: listing.lot_size,
        description: listing.description,
        features: listing.features,
        photos: listing.photos,
        videos: listing.videos,
        virtual_tour_url: listing.virtual_tour_url,
      }).select("*").single();

      if (error) throw error;
      if (newListing) {
        setListings((prev) => [newListing as Listing, ...prev]);
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to duplicate listing", type: "error" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setDuplicating(null);
    }
  };

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === "city") return (a.city || "").localeCompare(b.city || "");
    if (sortBy === "state") return (a.state || "").localeCompare(b.state || "");
    if (sortBy === "price") return priceDir === "desc" ? (b.price || 0) - (a.price || 0) : (a.price || 0) - (b.price || 0);
    return 0; // newest - already sorted by created_at desc from DB
  });

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg ${
          toast.type === "error"
            ? "border border-red-200 bg-red-50 text-red-800"
            : "border border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}>
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="ml-2 text-current opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}
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
      {!loading && (
        <div className="mb-6 space-y-4">
          {/* Getting Started - auto-hides when complete */}
          <GettingStarted />

          {/* Daily briefing - auto-hides when nothing to report */}
          <DailyBriefing />

          {/* Revenue stat - hides if no commission logged yet */}
          <RevenueStat />

          {/* Top row: equal-height cards */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <SpeedToLead />
            </div>
            <div className="lg:col-span-2">
              <UpcomingShowings limit={3} />
            </div>
          </div>

          {/* Activity feed */}
          <ActivityFeed />
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
              <ArrowUpDown className="h-3.5 w-3.5 text-brand-400" />
              {(["newest", "city", "state"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    sortBy === s
                      ? "bg-brand-500 text-white"
                      : "text-brand-400 hover:bg-brand-50 hover:text-brand-600 border border-brand-200"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <button
                onClick={() => {
                  if (sortBy === "price") {
                    setPriceDir((d) => d === "desc" ? "asc" : "desc");
                  } else {
                    setSortBy("price");
                  }
                }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  sortBy === "price"
                    ? "bg-brand-500 text-white"
                    : "text-brand-400 hover:bg-brand-50 hover:text-brand-600 border border-brand-200"
                }`}
              >
                Price {sortBy === "price" ? (priceDir === "desc" ? "↓" : "↑") : ""}
              </button>
            </div>
          )}
          {!loading && archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                showArchived
                  ? "bg-gray-900 text-white"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-200"
              }`}
            >
              <Archive className="h-3 w-3" />
              Archived ({archivedCount})
            </button>
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

      {/* Search */}
      {!loading && listings.length > 3 && (
        <div className="mt-5 relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by address, city, state, price…"
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>
      )}

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
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/dashboard/create"
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Listing
                </Link>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/demo/seed", { method: "POST" });
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        throw new Error(j.error || "Failed");
                      }
                      const { listing } = await res.json();
                      setListings((prev) => [listing, ...prev]);
                      setToast({ message: "Demo listing loaded. Click Edit to make it yours.", type: "success" });
                      setTimeout(() => setToast(null), 4000);
                    } catch (err) {
                      setToast({ message: err instanceof Error ? err.message : "Failed to load demo", type: "error" });
                      setTimeout(() => setToast(null), 4000);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Try with demo data
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Load a sample property so you can see the full product in 30 seconds.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {sortedListings.map((listing) => (
            <div
              key={listing.id}
              className={`group overflow-hidden rounded-xl border transition-shadow hover:shadow-lg ${
                listing.status === "closed"
                  ? "border-brand-300 bg-gradient-to-br from-brand-50 via-white to-brand-50 ring-1 ring-brand-200"
                  : "border-gray-200 bg-white"
              }`}
            >
              {/* Thumbnail - clicks through to live listing page */}
              <Link
                href={`/listing/${listing.slug || listing.id}`}
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
                      aria-label="Change listing status"
                      className={`appearance-none rounded-full border py-1 pl-3 pr-7 text-xs font-medium capitalize cursor-pointer ${statusBadge(listing.status)}`}
                    >
                      <option value="published">Published</option>
                      <option value="pending">Pending</option>
                      <option value="closed">Closed</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/edit/${listing.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                      title="Edit listing"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <ListingActionsMenu
                      listing={listing}
                      canGenerateSocialPosts={limits.canGenerateSocialPosts}
                      copiedId={copiedId}
                      generatingQR={generatingQR}
                      duplicating={duplicating}
                      generatingPosts={generatingPosts}
                      onCopyLink={handleCopyLink}
                      onDownloadQR={handleDownloadQR}
                      onDuplicate={handleDuplicate}
                      onGenerateSocialPosts={handleGenerateSocialPosts}
                      onArchive={handleArchive}
                      onDelete={handleDeleteRequest}
                    />
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
