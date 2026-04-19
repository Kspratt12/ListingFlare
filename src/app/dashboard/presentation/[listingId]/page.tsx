"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  Phone,
  Mail,
  CheckCircle,
  Loader2,
  Sparkles,
  Zap,
  CalendarCheck,
  MessageSquare,
} from "lucide-react";
import { formatPhone } from "@/lib/formatters";

interface PresentationData {
  paragraphs: string[];
  agent: {
    name: string;
    title: string;
    brokerage: string;
    phone: string;
    email: string;
    headshot_url: string | null;
  };
  listing: {
    street: string;
    city: string;
    state: string;
    zip: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    photos: Array<{ src: string; alt: string }>;
  };
  stats: {
    totalListings: number;
    totalLeads: number;
    totalShowings: number;
  };
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PresentationPage() {
  const params = useParams();
  const listingId = params?.listingId as string;
  const [data, setData] = useState<PresentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ai/listing-presentation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Failed");
        }
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Could not generate presentation");
        setLoading(false);
      });
  }, [listingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <p className="mt-4 text-sm text-gray-500">Writing your presentation...</p>
        <p className="mt-1 text-xs text-gray-400">Takes about 10 seconds</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <p className="text-sm text-gray-600">{error || "Something went wrong"}</p>
        <Link
          href="/dashboard"
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { paragraphs, agent, listing, stats } = data;
  const hero = listing.photos?.[0]?.src;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Action bar */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3 shadow-sm print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Presentation */}
      <div className="mx-auto max-w-4xl px-6 py-8 print:p-0">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm print:rounded-none print:shadow-none">
          {/* Hero */}
          <div className="relative">
            {hero && (
              <div className="relative h-72 w-full overflow-hidden md:h-96">
                <Image
                  src={hero}
                  alt={listing.street}
                  fill
                  sizes="(max-width: 768px) 100vw, 896px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
                    Listing Presentation
                  </p>
                  <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
                    {listing.street}
                  </h1>
                  <p className="mt-1 text-base text-gray-200">
                    {listing.city}, {listing.state} {listing.zip}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Property summary */}
          <div className="border-b border-gray-100 bg-gradient-to-br from-brand-50/40 to-white p-8">
            <div className="grid gap-6 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">
                  Listed At
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-gray-900">
                  {formatMoney(listing.price)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">
                  Bedrooms
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-gray-900">
                  {listing.beds}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">
                  Bathrooms
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-gray-900">
                  {listing.baths}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">
                  Square Feet
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-gray-900">
                  {listing.sqft?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* AI-generated paragraphs */}
          <div className="space-y-6 border-b border-gray-100 p-8">
            {paragraphs.length >= 1 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100">
                    <span className="font-serif text-sm font-bold text-brand-700">1</span>
                  </div>
                  <h2 className="font-serif text-lg font-bold text-gray-900">
                    Why this home stands out
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{paragraphs[0]}</p>
              </section>
            )}

            {paragraphs.length >= 2 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100">
                    <span className="font-serif text-sm font-bold text-brand-700">2</span>
                  </div>
                  <h2 className="font-serif text-lg font-bold text-gray-900">
                    My marketing plan
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{paragraphs[1]}</p>
              </section>
            )}

            {paragraphs.length >= 3 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100">
                    <span className="font-serif text-sm font-bold text-brand-700">3</span>
                  </div>
                  <h2 className="font-serif text-lg font-bold text-gray-900">
                    Why choose me
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{paragraphs[2]}</p>
              </section>
            )}
          </div>

          {/* Marketing system features */}
          <div className="border-b border-gray-100 p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              What You Get When You List With Me
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Sparkles,
                  title: "24/7 AI Chatbot",
                  desc: "Buyers get instant answers to questions about your home, any time of day.",
                },
                {
                  icon: Zap,
                  title: "Sub-15 Second Lead Response",
                  desc: "Every buyer inquiry gets an AI reply in seconds. First response wins.",
                },
                {
                  icon: CalendarCheck,
                  title: "Direct Showing Booking",
                  desc: "Buyers pick their own time from my calendar, synced instantly.",
                },
                {
                  icon: MessageSquare,
                  title: "Automated Follow-Up",
                  desc: "Day 1, 3, and 7 follow-ups sent in my voice. Nothing slips through.",
                },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100">
                      <Icon className="h-4 w-4 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                      <p className="mt-0.5 text-xs text-gray-600">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track record */}
          <div className="border-b border-gray-100 bg-gray-950 p-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
              Track Record
            </p>
            <div className="mt-4 grid grid-cols-3 gap-6">
              <div>
                <p className="font-serif text-3xl font-bold text-white">
                  {stats.totalListings}
                </p>
                <p className="mt-1 text-xs text-gray-400">Active listings</p>
              </div>
              <div>
                <p className="font-serif text-3xl font-bold text-white">
                  {stats.totalLeads}
                </p>
                <p className="mt-1 text-xs text-gray-400">Buyer inquiries handled</p>
              </div>
              <div>
                <p className="font-serif text-3xl font-bold text-white">
                  {stats.totalShowings}
                </p>
                <p className="mt-1 text-xs text-gray-400">Showings booked</p>
              </div>
            </div>
          </div>

          {/* Agent signature */}
          <div className="p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Ready when you are
            </p>
            <div className="mt-3 flex items-center gap-4">
              {agent.headshot_url ? (
                <Image
                  src={agent.headshot_url}
                  alt={agent.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 font-serif text-xl font-bold text-gray-500">
                  {(agent.name || "?").charAt(0)}
                </div>
              )}
              <div>
                <p className="font-serif text-lg font-bold text-gray-900">{agent.name}</p>
                <p className="text-xs text-gray-500">
                  {agent.title}
                  {agent.brokerage && ` - ${agent.brokerage}`}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
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

            <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <p className="text-xs font-medium text-emerald-800">
                When you&apos;re ready, I&apos;ll have your listing live and marketing in under 24 hours.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400 print:hidden">
          Tip: Print this to PDF and send to your seller before your listing appointment.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0.4in;
          }
        }
      `}</style>
    </div>
  );
}
