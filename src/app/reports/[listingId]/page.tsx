"use client";

import { factsLine } from "@/lib/listingFacts";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Printer, Mail, Phone, Loader2, CheckCircle, Info } from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import type { SellerReport } from "@/lib/sellerReport";

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
  report: SellerReport;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const PERIODS = [7, 14, 30] as const;

// Seller report: a preview the agent reviews, then prints / saves as PDF and sends to the seller
// themselves. Nothing is emailed automatically from this page.
export default function SellerReportPage() {
  const params = useParams();
  const listingId = params?.listingId as string;
  const [days, setDays] = useState<(typeof PERIODS)[number]>(7);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [showDefinitions, setShowDefinitions] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    setData(null);
    fetch(`/api/reports/seller?listingId=${encodeURIComponent(listingId)}&days=${days}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Could not load report");
        }
        return r.json();
      })
      .then((d) => active && setData(d))
      .catch((err) => active && setError(err.message || "Could not load report"));
    return () => {
      active = false;
    };
  }, [listingId, days, reloadKey]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-600">{error}</p>
        <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Try again
        </button>
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

  const { listing, agent, report } = data;
  const hero = listing.photos?.[0]?.src;
  const periodMetrics = report.metrics.filter((m) => m.scope === "period");
  const totalMetrics = report.metrics.filter((m) => m.scope === "since_live");

  const MetricCard = ({ m }: { m: (typeof report.metrics)[number] }) => (
    <div className="rounded-xl border border-gray-200 p-4 break-inside-avoid">
      <p className="text-xs font-medium text-gray-500">{m.label}</p>
      <p className="mt-2 font-serif text-2xl font-bold text-gray-900">{m.value.toLocaleString("en-US")}</p>
      {showDefinitions && <p className="mt-1 text-[11px] leading-snug text-gray-500">{m.definition}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Action bar - hidden in print */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm print:hidden sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-gray-900">Seller report preview</p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="report-period" className="text-xs text-gray-500">Period</label>
            <select
              id="report-period"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as (typeof PERIODS)[number])}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>Last {p} days</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" checked={showDefinitions} onChange={(e) => setShowDefinitions(e.target.checked)} />
              Show definitions
            </label>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 print:p-0">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm print:rounded-none print:shadow-none">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-950 px-6 py-6 text-white sm:px-8 print:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-serif text-xl font-bold">Listing Activity Report</p>
                <p className="mt-0.5 text-sm text-gray-300">Prepared by {agent?.name || "your agent"}</p>
              </div>
              <p className="text-right text-xs text-gray-300">Period: {report.period.label}</p>
            </div>
          </div>

          {/* Property */}
          <div className="border-b border-gray-100 p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">{listing.street}</h1>
                <p className="mt-1 text-gray-600">{[listing.city, listing.state].filter(Boolean).join(", ")} {listing.zip}</p>
                {listing.price > 0 && <p className="mt-3 font-serif text-2xl font-bold text-gray-900">{formatMoney(listing.price)}</p>}
                <p className="mt-1 text-sm text-gray-500">{factsLine(listing)}</p>
                {report.liveSince && (
                  <p className="mt-1 text-xs text-gray-500">
                    Live since {new Date(report.liveSince).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              {hero && (
                <div className="relative h-32 w-48 overflow-hidden rounded-lg md:h-36 md:w-56">
                  <Image src={hero} alt={listing.street} fill className="object-cover" sizes="224px" />
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="border-b border-gray-100 bg-brand-50/30 p-6 sm:p-8">
            <p className="text-sm font-medium text-gray-900">{report.summary}</p>
          </div>

          {/* This period */}
          <div className="border-b border-gray-100 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{report.period.label}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {periodMetrics.map((m) => <MetricCard key={m.key} m={m} />)}
            </div>
          </div>

          {/* Since live */}
          <div className="border-b border-gray-100 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Since the listing page went live</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {totalMetrics.map((m) => <MetricCard key={m.key} m={m} />)}
            </div>
          </div>

          {/* What is running */}
          <div className="border-b border-gray-100 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">On your listing page</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {report.running.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-b border-gray-100 px-6 py-4 sm:px-8">
            {report.notes.map((n) => (
              <p key={n} className="flex items-start gap-1.5 text-[11px] text-gray-500">
                <Info className="mt-0.5 h-3 w-3 flex-none" /> {n}
              </p>
            ))}
          </div>

          {/* Agent signature */}
          {agent && (
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-4">
                {agent.headshot_url ? (
                  <Image src={agent.headshot_url} alt={agent.name} width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500">
                    {(agent.name || "").charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-serif text-base font-bold text-gray-900">{agent.name}</p>
                  {agent.brokerage && <p className="text-xs text-gray-500">{agent.brokerage}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
                    {agent.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {formatPhone(agent.phone)}
                      </span>
                    )}
                    {agent.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {agent.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 print:hidden">
          Review the numbers, then use &ldquo;Print / Save PDF&rdquo; and send it to your seller. Nothing is sent from this page.
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
