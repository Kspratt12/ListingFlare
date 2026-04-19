"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Eye,
  MessageSquare,
  CalendarCheck,
  TrendingUp,
  Printer,
  Mail,
  Phone,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { formatPhone } from "@/lib/formatters";

interface ReportData {
  listing: {
    id: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    photos: Array<{ src: string; alt: string }>;
    status: string;
    view_count: number;
    slug: string | null;
    created_at: string;
  };
  agent: {
    name: string;
    phone: string;
    email: string;
    brokerage: string;
    headshot_url: string | null;
  } | null;
  stats: {
    totalViews: number;
    avgViewsPerWeek: number;
    leadsThisWeek: number;
    leadsTotal: number;
    showingsTotal: number;
  };
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SellerReportPage() {
  const params = useParams();
  const listingId = params?.listingId as string;
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/reports/seller?listingId=${listingId}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Failed");
        }
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || "Could not load report"));
  }, [listingId]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const { listing, agent, stats } = data;
  const hero = listing.photos?.[0]?.src;
  const dateRange = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Action bar - hidden in print */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3 shadow-sm print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <p className="text-sm font-medium text-gray-900">
            Listing Performance Report
          </p>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Report */}
      <div className="mx-auto max-w-4xl px-6 py-8 print:p-0">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-950 px-8 py-6 text-white print:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-xl font-bold">
                  Listing<span className="text-brand-400">Flare</span>
                </p>
                <p className="mt-0.5 text-sm text-gray-300">Weekly Listing Report</p>
              </div>
              <p className="text-right text-xs text-gray-400">{dateRange}</p>
            </div>
          </div>

          {/* Property */}
          <div className="border-b border-gray-100 p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Your Listing
                </p>
                <h1 className="mt-1 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
                  {listing.street}
                </h1>
                <p className="mt-1 text-gray-600">
                  {listing.city}, {listing.state} {listing.zip}
                </p>
                <p className="mt-3 font-serif text-2xl font-bold text-gray-900">
                  {formatMoney(listing.price)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {listing.beds} bed &middot; {listing.baths} bath &middot;{" "}
                  {listing.sqft?.toLocaleString()} sqft
                </p>
              </div>
              {hero && (
                <div className="relative h-32 w-48 overflow-hidden rounded-lg md:h-36 md:w-56">
                  <Image
                    src={hero}
                    alt={listing.street}
                    fill
                    className="object-cover"
                    sizes="224px"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Headline stat */}
          <div className="border-b border-gray-100 bg-gradient-to-br from-brand-50/50 to-white p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              This week
            </p>
            <p className="mt-2 font-serif text-4xl font-bold text-gray-900 md:text-5xl">
              {stats.avgViewsPerWeek.toLocaleString()}{" "}
              <span className="text-2xl text-gray-500 md:text-3xl">views</span>
            </p>
            <p className="mt-2 text-sm text-gray-600">
              on your listing page at www.listingflare.com
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid gap-4 border-b border-gray-100 p-8 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <p className="text-xs font-medium text-gray-500">Total Views</p>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-gray-900">
                {stats.totalViews.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">Since listing went live</p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                <p className="text-xs font-medium text-gray-500">Buyer Inquiries</p>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-gray-900">
                {stats.leadsTotal}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {stats.leadsThisWeek} this week
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-medium text-gray-500">Showings</p>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-gray-900">
                {stats.showingsTotal}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">Booked to date</p>
            </div>
          </div>

          {/* What we are doing */}
          <div className="border-b border-gray-100 p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              What we are doing for you
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>
                  <strong>24/7 AI chat</strong> answers buyer questions on your listing page instantly, even at 11pm.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>
                  <strong>Instant response</strong> to every buyer inquiry in under 15 seconds. First to respond wins the buyer.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>
                  <strong>Automated follow-ups</strong> on day 1, 3, and 7 to keep buyers engaged.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>
                  <strong>Direct showing booking</strong> from your listing page, synced to my calendar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>
                  <strong>Hot lead detection</strong> when buyers return to the page 3 or more times.
                </span>
              </li>
            </ul>
          </div>

          {/* Performance insight */}
          <div className="border-b border-gray-100 bg-brand-50/30 p-8">
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-1 h-5 w-5 flex-shrink-0 text-brand-600" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Bottom line
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {stats.totalViews > 0
                    ? `Your listing has generated ${stats.totalViews.toLocaleString()} views and ${stats.leadsTotal} qualified inquiries through my marketing system. Every buyer who looked at your home was captured into my follow-up system.`
                    : "Your listing is live and actively being marketed through our system. Views and inquiries will populate here as buyers engage."}
                </p>
              </div>
            </div>
          </div>

          {/* Agent signature */}
          {agent && (
            <div className="p-8">
              <div className="flex items-center gap-4">
                {agent.headshot_url ? (
                  <Image
                    src={agent.headshot_url}
                    alt={agent.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500">
                    {(agent.name || "").charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-serif text-base font-bold text-gray-900">{agent.name}</p>
                  {agent.brokerage && (
                    <p className="text-xs text-gray-500">{agent.brokerage}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
                    {agent.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {formatPhone(agent.phone)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {agent.email}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400 print:hidden">
          Tip: Click &ldquo;Print / Save PDF&rdquo; to send this to your seller.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}
