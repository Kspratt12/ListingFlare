"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Listing, Lead } from "@/lib/types";
import { Eye, Users, TrendingUp, Home, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [listingsRes, leadsRes] = await Promise.all([
        supabase
          .from("listings")
          .select("id, street, city, state, status, view_count, photos, created_at")
          .eq("agent_id", user.id)
          .order("view_count", { ascending: false }),
        supabase
          .from("leads")
          .select("id, listing_id, status, created_at")
          .eq("agent_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      setListings((listingsRes.data as Listing[]) || []);
      setLeads((leadsRes.data as Lead[]) || []);
      setLoading(false);
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalViews = listings.reduce((sum, l) => sum + (l.view_count || 0), 0);
  const totalLeads = leads.length;
  const activeListings = listings.filter((l) => l.status === "published").length;
  const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : "0";

  // Leads per listing for the breakdown
  const leadsPerListing = leads.reduce((acc, lead) => {
    acc[lead.listing_id] = (acc[lead.listing_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Recent leads (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLeads = leads.filter((l) => new Date(l.created_at) >= sevenDaysAgo).length;

  // Lead status breakdown
  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">Analytics</h1>
      <p className="mt-1 text-gray-500">Track performance across all your listings.</p>

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Views</p>
                  <p className="font-serif text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <Link href="/dashboard/leads" className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md hover:border-green-200 block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Leads</p>
                  <p className="font-serif text-2xl font-bold text-gray-900">{totalLeads}</p>
                  {recentLeads > 0 && (
                    <p className="text-xs text-green-600">+{recentLeads} this week</p>
                  )}
                </div>
              </div>
            </Link>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                  <TrendingUp className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                  <p className="font-serif text-2xl font-bold text-gray-900">{conversionRate}%</p>
                  <p className="text-xs text-gray-400">views → leads</p>
                </div>
              </div>
            </div>

            <Link href="/dashboard" className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md hover:border-purple-200 block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                  <Home className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Listings</p>
                  <p className="font-serif text-2xl font-bold text-gray-900">{activeListings}</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Lead Pipeline */}
          {totalLeads > 0 && (
            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="font-serif text-lg font-semibold text-gray-900">Lead Pipeline</h2>
              <p className="mt-1 text-sm text-gray-500">Where your leads stand right now.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { key: "new", label: "New", color: "bg-blue-500" },
                  { key: "contacted", label: "Contacted", color: "bg-purple-500" },
                  { key: "showing_scheduled", label: "Showing", color: "bg-orange-500" },
                  { key: "offer_made", label: "Offer Made", color: "bg-amber-500" },
                  { key: "under_contract", label: "Under Contract", color: "bg-teal-500" },
                  { key: "closed", label: "Closed", color: "bg-emerald-500" },
                  { key: "lost", label: "Lost", color: "bg-gray-400" },
                ].map((s) => {
                  const count = statusCounts[s.key] || 0;
                  if (count === 0) return null;
                  const pct = ((count / totalLeads) * 100).toFixed(0);
                  return (
                    <Link key={s.key} href="/dashboard/leads" className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 transition-all hover:shadow-sm hover:border-gray-200 hover:bg-white">
                      <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{count} {s.label}</p>
                        <p className="text-xs text-gray-400">{pct}%</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-Listing Breakdown */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-gray-900">
                <BarChart3 className="h-5 w-5 text-brand-500" />
                Listing Performance
              </h2>
            </div>

            {listings.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                No listings yet. Create your first listing to see analytics.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {listings.map((listing) => {
                  const leadCount = leadsPerListing[listing.id] || 0;
                  const listingConversion = listing.view_count > 0 ? ((leadCount / listing.view_count) * 100).toFixed(1) : "0";
                  return (
                    <Link key={listing.id} href={`/dashboard/edit/${listing.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      {/* Thumbnail */}
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {listing.photos?.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={listing.photos[0].src} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300">
                            <Home className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{listing.street || "Untitled"}</p>
                        <p className="text-sm text-gray-500">{listing.city}, {listing.state}</p>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6">
                        <div className="text-center">
                          <p className="font-serif text-lg font-bold text-gray-900">{(listing.view_count || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-400">Views</p>
                        </div>
                        <div className="text-center">
                          <p className="font-serif text-lg font-bold text-gray-900">{leadCount}</p>
                          <p className="text-xs text-gray-400">Leads</p>
                        </div>
                        <div className="text-center">
                          <p className="font-serif text-lg font-bold text-gray-900">{listingConversion}%</p>
                          <p className="text-xs text-gray-400">Conv.</p>
                        </div>
                      </div>

                      {/* Mobile stats */}
                      <div className="flex sm:hidden items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Eye className="h-3.5 w-3.5" /> {listing.view_count || 0}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Users className="h-3.5 w-3.5" /> {leadCount}
                        </span>
                      </div>

                      {/* Status */}
                      <span className={`hidden lg:inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                        listing.status === "published" ? "bg-green-50 text-green-700 border-green-200" :
                        listing.status === "closed" ? "bg-brand-50 text-brand-700 border-brand-300" :
                        "bg-gray-50 text-gray-600 border-gray-200"
                      }`}>
                        {listing.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
