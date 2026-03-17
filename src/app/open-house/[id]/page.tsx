"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { CheckCircle, Loader2, Home } from "lucide-react";
import { formatPhone } from "@/lib/formatters";

export default function OpenHouseSignIn() {
  const params = useParams();
  const listingId = params.id as string;
  const supabase = createClient();

  const [listing, setListing] = useState<{ street: string; city: string; state: string; agent_id: string; photos: { src: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    async function fetchListing() {
      const { data } = await supabase
        .from("listings")
        .select("street, city, state, agent_id, photos")
        .eq("id", listingId)
        .single();
      setListing(data);
      setLoading(false);
    }
    fetchListing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!listing) return;
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const { data: leadData } = await supabase.from("leads").insert({
      listing_id: listingId,
      agent_id: listing.agent_id,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: phone,
      message: `[Open House Sign-In] ${formData.get("working_with_agent") === "yes" ? "Working with an agent" : "Not working with an agent"}`,
      status: "new",
    }).select("id").single();

    // Fire notification
    if (leadData?.id) {
      fetch("/api/leads/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: leadData.id, listingId, agentId: listing.agent_id }),
      }).catch(() => {});
    }

    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-gray-900">Listing not found</h1>
          <p className="mt-2 text-gray-500">This open house link may have expired.</p>
        </div>
      </div>
    );
  }

  const heroUrl = listing.photos?.[0]?.src;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero */}
      <div
        className="relative flex h-48 items-end bg-cover bg-center"
        style={{ backgroundImage: heroUrl ? `url(${heroUrl})` : undefined }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        <div className="relative px-6 pb-6">
          <span className="inline-block rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
            Open House
          </span>
          <h1 className="mt-2 font-serif text-2xl font-bold text-white">
            {listing.street}
          </h1>
          <p className="text-sm text-gray-300">
            {listing.city}, {listing.state}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-8">
        {submitted ? (
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-400" />
            <h2 className="mt-4 font-serif text-2xl font-bold text-white">Welcome!</h2>
            <p className="mt-2 text-gray-400">
              Thanks for signing in. We&apos;ll keep you updated on this property.
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl font-bold text-white">Sign In</h2>
            <p className="mt-1 text-sm text-gray-400">
              Welcome! Please sign in so we can keep you updated.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="555-000-0000"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Are you currently working with a real estate agent?
                </label>
                <div className="mt-2 flex gap-3">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 py-3 text-sm text-white transition-colors has-[:checked]:border-brand-400 has-[:checked]:bg-brand-500/10">
                    <input type="radio" name="working_with_agent" value="no" defaultChecked className="sr-only" />
                    No
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 py-3 text-sm text-white transition-colors has-[:checked]:border-brand-400 has-[:checked]:bg-brand-500/10">
                    <input type="radio" name="working_with_agent" value="yes" className="sr-only" />
                    Yes
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3.5 font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Home className="h-4 w-4" />
                )}
                {submitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Branding */}
      <div className="px-6 pb-8 text-center">
        <p className="text-xs text-gray-600">
          Powered by <span className="font-serif text-brand-400">ListingFlare</span>
        </p>
      </div>
    </div>
  );
}
