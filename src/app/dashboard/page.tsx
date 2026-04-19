"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Listing, AgentProfile } from "@/lib/types";
import { getSubscriptionLimits } from "@/lib/subscription";
import UpgradePrompt from "@/components/UpgradePrompt";
import Link from "next/link";
import { PlusCircle, Eye, Pencil, ArrowUpDown, Archive, ArchiveRestore, Search, Lock, Share2, Loader2 } from "lucide-react";
import UpcomingShowings from "@/components/UpcomingShowings";
import ActivityFeed from "@/components/ActivityFeed";
import SpeedToLead from "@/components/SpeedToLead";
import GettingStarted from "@/components/GettingStarted";
import DailyBriefing from "@/components/DailyBriefing";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
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

      const brand = data.brandColor || "#b8965a";

      // Kick off the AI caption in parallel with image rendering so the
      // agent doesn't wait twice. Fallback caption if the endpoint fails.
      const captionPromise = fetch("/api/ai/social-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street: data.street,
          city: data.city,
          state: data.state,
          price: data.price,
          beds: data.beds,
          baths: data.baths,
          sqft: data.sqft,
          features: data.features,
          description: data.description,
          publicUrl: data.publicUrl,
          agentName: data.agentName,
        }),
      })
        .then(async (r) => (r.ok ? (await r.json()).caption : ""))
        .catch(() => "");

      const html2canvas = (await import("html2canvas-pro")).default;
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const esc = (s: string) =>
        String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

      // Photo overlay template — used as the base for hero slides. Dark
      // bottom gradient keeps text readable over any photo.
      const photoSlide = (w: number, h: number, photoUrl: string, ribbonText: string) => `
        <div style="width:${w}px;height:${h}px;position:relative;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <img src="${esc(photoUrl)}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" />
          <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.55) 65%,rgba(0,0,0,0.9) 100%);"></div>
          ${ribbonText ? `
            <div style="position:absolute;top:${Math.round(40 * w / 1080)}px;left:${Math.round(40 * w / 1080)}px;background:${brand};color:white;padding:${Math.round(10 * w / 1080)}px ${Math.round(22 * w / 1080)}px;font-size:${Math.round(22 * w / 1080)}px;font-weight:700;letter-spacing:2px;text-transform:uppercase;border-radius:999px;">
              ${esc(ribbonText)}
            </div>
          ` : ""}
          <div style="position:absolute;bottom:${Math.round(48 * h / 1080)}px;left:${Math.round(48 * w / 1080)}px;right:${Math.round(48 * w / 1080)}px;color:white;">
            <div style="font-size:${Math.round(68 * w / 1080)}px;font-weight:800;font-family:Georgia,serif;line-height:1;">${esc(data.price)}</div>
            <div style="font-size:${Math.round(32 * w / 1080)}px;margin-top:${Math.round(14 * w / 1080)}px;font-weight:600;">${esc(data.street)}</div>
            <div style="font-size:${Math.round(24 * w / 1080)}px;opacity:0.85;margin-top:${Math.round(6 * w / 1080)}px;">${esc(data.cityState)}</div>
            <div style="font-size:${Math.round(22 * w / 1080)}px;color:${brand};font-weight:700;margin-top:${Math.round(18 * w / 1080)}px;letter-spacing:1px;">${esc(data.details)}</div>
          </div>
        </div>
      `;

      // Dark brand-tinted solid slide used for price, stats, CTA cards.
      const brandSlide = (w: number, h: number, inner: string) => `
        <div style="width:${w}px;height:${h}px;position:relative;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:white;background:linear-gradient(135deg, ${brand} 0%, rgba(0,0,0,0.85) 100%),${brand};overflow:hidden;">
          <div style="position:absolute;inset:0;background:radial-gradient(circle at 75% 20%, rgba(255,255,255,0.12) 0%, transparent 55%);"></div>
          <div style="position:absolute;top:${Math.round(36 * w / 1080)}px;left:${Math.round(40 * w / 1080)}px;font-family:Georgia,serif;font-size:${Math.round(26 * w / 1080)}px;font-weight:700;color:white;opacity:0.9;">
            <span style="color:white;">Listing</span><span style="color:rgba(255,255,255,0.7);">Flare</span>
          </div>
          <div style="position:relative;padding:${Math.round(140 * h / 1080)}px ${Math.round(70 * w / 1080)}px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;">
            ${inner}
          </div>
        </div>
      `;

      const footer = (w: number) => `
        <div style="position:absolute;bottom:${Math.round(40 * w / 1080)}px;left:${Math.round(40 * w / 1080)}px;right:${Math.round(40 * w / 1080)}px;border-top:1px solid rgba(255,255,255,0.25);padding-top:${Math.round(14 * w / 1080)}px;">
          <div style="font-size:${Math.round(22 * w / 1080)}px;font-weight:600;">${esc(data.agentName)}</div>
          <div style="font-size:${Math.round(18 * w / 1080)}px;opacity:0.8;margin-top:${Math.round(2 * w / 1080)}px;">${esc([data.agentPhone, data.brokerage].filter(Boolean).join("  |  "))}</div>
        </div>
      `;

      const priceSlideInner = (w: number) => `
        <div style="font-size:${Math.round(24 * w / 1080)}px;letter-spacing:4px;text-transform:uppercase;opacity:0.8;">Asking</div>
        <div style="font-family:Georgia,serif;font-size:${Math.round(150 * w / 1080)}px;font-weight:800;line-height:1;margin-top:${Math.round(20 * w / 1080)}px;">${esc(data.price)}</div>
        <div style="font-size:${Math.round(32 * w / 1080)}px;margin-top:${Math.round(40 * w / 1080)}px;font-weight:600;">${esc(data.street)}</div>
        <div style="font-size:${Math.round(24 * w / 1080)}px;opacity:0.8;margin-top:${Math.round(8 * w / 1080)}px;">${esc(data.cityState)}</div>
      `;

      const statsSlideInner = (w: number) => `
        <div style="font-size:${Math.round(24 * w / 1080)}px;letter-spacing:4px;text-transform:uppercase;opacity:0.8;">The Home</div>
        <div style="margin-top:${Math.round(50 * w / 1080)}px;display:flex;gap:${Math.round(60 * w / 1080)}px;flex-wrap:wrap;">
          <div>
            <div style="font-family:Georgia,serif;font-size:${Math.round(100 * w / 1080)}px;font-weight:800;line-height:1;">${data.beds}</div>
            <div style="font-size:${Math.round(22 * w / 1080)}px;opacity:0.8;margin-top:${Math.round(6 * w / 1080)}px;text-transform:uppercase;letter-spacing:2px;">Bedrooms</div>
          </div>
          <div>
            <div style="font-family:Georgia,serif;font-size:${Math.round(100 * w / 1080)}px;font-weight:800;line-height:1;">${data.baths}</div>
            <div style="font-size:${Math.round(22 * w / 1080)}px;opacity:0.8;margin-top:${Math.round(6 * w / 1080)}px;text-transform:uppercase;letter-spacing:2px;">Bathrooms</div>
          </div>
          <div>
            <div style="font-family:Georgia,serif;font-size:${Math.round(100 * w / 1080)}px;font-weight:800;line-height:1;">${Number(data.sqft || 0).toLocaleString()}</div>
            <div style="font-size:${Math.round(22 * w / 1080)}px;opacity:0.8;margin-top:${Math.round(6 * w / 1080)}px;text-transform:uppercase;letter-spacing:2px;">Sq Ft</div>
          </div>
        </div>
        ${Array.isArray(data.features) && data.features.length > 0 ? `
          <div style="margin-top:${Math.round(50 * w / 1080)}px;font-size:${Math.round(22 * w / 1080)}px;opacity:0.85;">
            ${data.features.slice(0, 3).map((f: string) => `<span style="display:inline-block;padding:${Math.round(8 * w / 1080)}px ${Math.round(18 * w / 1080)}px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:999px;margin-right:${Math.round(10 * w / 1080)}px;margin-top:${Math.round(10 * w / 1080)}px;">${esc(f)}</span>`).join("")}
          </div>
        ` : ""}
      `;

      const ctaSlideInner = (w: number) => `
        <div style="font-size:${Math.round(24 * w / 1080)}px;letter-spacing:4px;text-transform:uppercase;opacity:0.8;">See More</div>
        <div style="font-family:Georgia,serif;font-size:${Math.round(76 * w / 1080)}px;font-weight:800;line-height:1.1;margin-top:${Math.round(24 * w / 1080)}px;">
          Tour this home<br/>in seconds.
        </div>
        <div style="margin-top:${Math.round(40 * w / 1080)}px;font-size:${Math.round(22 * w / 1080)}px;opacity:0.85;">
          Full walk-through, mortgage calc, and instant showing booking at:
        </div>
        <div style="margin-top:${Math.round(20 * w / 1080)}px;display:inline-block;padding:${Math.round(18 * w / 1080)}px ${Math.round(32 * w / 1080)}px;background:white;color:#111;border-radius:12px;font-size:${Math.round(22 * w / 1080)}px;font-weight:700;word-break:break-all;">
          ${esc((data.publicUrl || "").replace(/^https?:\/\//, ""))}
        </div>
      `;

      // Full slide deck. Every slide shares the footer/agent info.
      const slides: { name: string; w: number; h: number; html: string }[] = [
        // IG carousel (1:1). Hero first, then price/stats/CTA cards.
        {
          name: "instagram_carousel_1_hero.png",
          w: 1080, h: 1080,
          html: photoSlide(1080, 1080, data.heroUrl, "Just Listed"),
        },
        {
          name: "instagram_carousel_2_price.png",
          w: 1080, h: 1080,
          html: `<div style="position:relative;width:1080px;height:1080px;">${brandSlide(1080, 1080, priceSlideInner(1080))}${footer(1080)}</div>`,
        },
        {
          name: "instagram_carousel_3_stats.png",
          w: 1080, h: 1080,
          html: `<div style="position:relative;width:1080px;height:1080px;">${brandSlide(1080, 1080, statsSlideInner(1080))}${footer(1080)}</div>`,
        },
        {
          name: "instagram_carousel_4_cta.png",
          w: 1080, h: 1080,
          html: `<div style="position:relative;width:1080px;height:1080px;">${brandSlide(1080, 1080, ctaSlideInner(1080))}${footer(1080)}</div>`,
        },
        // IG Story (9:16)
        {
          name: "instagram_story.png",
          w: 1080, h: 1920,
          html: photoSlide(1080, 1920, data.heroUrl, "Just Listed"),
        },
        // FB landscape post
        {
          name: "facebook_post.png",
          w: 1200, h: 630,
          html: photoSlide(1200, 630, data.heroUrl, "Just Listed"),
        },
      ];

      for (const slide of slides) {
        const container = document.createElement("div");
        container.style.cssText = `position:fixed;left:-9999px;top:0;width:${slide.w}px;height:${slide.h}px;overflow:hidden;`;
        container.innerHTML = slide.html;
        document.body.appendChild(container);

        // Wait for any <img> inside the container to finish loading
        const imgs = Array.from(container.querySelectorAll("img"));
        await Promise.all(
          imgs.map((im) =>
            im.complete
              ? Promise.resolve()
              : new Promise<void>((res) => {
                  im.onload = () => res();
                  im.onerror = () => res();
                })
          )
        );

        const canvas = await html2canvas(container, { width: slide.w, height: slide.h, scale: 1, useCORS: true });
        document.body.removeChild(container);

        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
        zip.file(slide.name, blob);
      }

      const caption = await captionPromise;
      if (caption) {
        zip.file("caption.txt", caption);
      } else {
        // Fallback caption so agents always have something to paste
        zip.file(
          "caption.txt",
          `✨ Just Listed ✨\n${data.street}, ${data.cityState}\n${data.price} | ${data.details}\n\nSchedule a showing and see the full tour: ${data.publicUrl || ""}\n\n#justlisted #realestate #dreamhome #newlisting`
        );
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `social_pack_${(data.street || "listing").replace(/\s+/g, "_").toLowerCase()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setToast({ message: "Social Media Pack downloaded. Includes 4-slide carousel, IG Story, FB post, and caption.", type: "success" });
      setTimeout(() => setToast(null), 5000);
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

  // Opposite of archive — flip back to draft so the agent can republish
  // or edit. One click from the Archived view, no menu dive.
  const handleRestore = async (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await supabase.from("listings").update({ status: "draft" }).eq("id", listingId);
    setListings((prev) => prev.map((l) => l.id === listingId ? { ...l, status: "draft" as Listing["status"] } : l));
    setToast({ message: "Listing restored to Draft. Edit or publish from the listing card.", type: "success" });
    setTimeout(() => setToast(null), 4000);
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
          {/* Push notifications opt-in - auto-hides when granted+dismissed or unsupported */}
          <PushNotificationPrompt />

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
                    <div className="relative">
                      <select
                        value={listing.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          await supabase.from("listings").update({ status: newStatus }).eq("id", listing.id);
                          setListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, status: newStatus as Listing["status"] } : l));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Change listing status"
                        title="Click to change status"
                        className={`appearance-none rounded-full border py-1 pl-3 pr-7 text-xs font-medium capitalize cursor-pointer ${statusBadge(listing.status)}`}
                      >
                        <option value="published">Published</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </select>
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-70"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.37a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {listing.status === "archived" ? (
                      <button
                        type="button"
                        onClick={(e) => handleRestore(e, listing.id)}
                        title="Restore to Draft"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Restore
                      </button>
                    ) : (
                      <Link
                        href={`/dashboard/edit/${listing.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                        title="Edit listing"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    )}
                    {/* Prominent Social Media Pack button — visible on
                        every published listing with photos. Replaces the
                        previously-hidden 3-dot menu item so agents
                        actually discover the feature. */}
                    {listing.status === "published" && listing.photos.length > 0 && (
                      limits.canGenerateSocialPosts ? (
                        <button
                          type="button"
                          onClick={(e) => handleGenerateSocialPosts(e, listing.id)}
                          disabled={generatingPosts === listing.id}
                          title="Generate Instagram carousel, Story, FB post, and caption"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-60"
                        >
                          {generatingPosts === listing.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" />
                          )}
                          {generatingPosts === listing.id ? "Building..." : "Social Pack"}
                        </button>
                      ) : (
                        <Link
                          href="/dashboard/billing"
                          onClick={(e) => e.stopPropagation()}
                          title="Upgrade to generate Social Media Pack"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Social Pack
                        </Link>
                      )
                    )}
                    <ListingActionsMenu
                      listing={listing}
                      copiedId={copiedId}
                      generatingQR={generatingQR}
                      duplicating={duplicating}
                      onCopyLink={handleCopyLink}
                      onDownloadQR={handleDownloadQR}
                      onDuplicate={handleDuplicate}
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
