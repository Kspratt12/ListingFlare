"use client";

import type { Lead } from "@/lib/types";
import { Globe, ChevronRight } from "lucide-react";

interface Props {
  leads: Lead[];
}

function formatSource(source: string): string {
  const s = source.toLowerCase();
  if (s === "direct") return "Direct / Typed URL";
  if (s === "instagram") return "Instagram";
  if (s === "facebook") return "Facebook";
  if (s === "zillow") return "Zillow";
  if (s === "realtor") return "Realtor.com";
  if (s === "google") return "Google";
  if (s === "tiktok") return "TikTok";
  if (s === "linkedin") return "LinkedIn";
  if (s === "twitter") return "Twitter / X";
  if (s === "qr") return "QR Code";
  if (s === "email") return "Email Link";
  if (s === "sms") return "SMS / Text";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sourceColor(source: string): string {
  const s = source.toLowerCase();
  const palette: Record<string, string> = {
    instagram: "bg-pink-500",
    facebook: "bg-blue-500",
    zillow: "bg-sky-500",
    realtor: "bg-red-500",
    google: "bg-amber-500",
    tiktok: "bg-gray-900",
    linkedin: "bg-blue-600",
    twitter: "bg-gray-900",
    direct: "bg-gray-400",
    qr: "bg-emerald-500",
    email: "bg-purple-500",
  };
  return palette[s] || "bg-gray-400";
}

export default function LeadSourcesCard({ leads }: Props) {
  // Only count leads with a REAL source set (null = predates attribution, skip it)
  const counts = new Map<string, { total: number; hot: number }>();
  for (const lead of leads) {
    if (!lead.source) continue;
    const source = lead.source;
    const entry = counts.get(source) || { total: 0, hot: 0 };
    entry.total++;
    // "Hot" = pre-approved or cash buyer or showing/offer/contract status
    const hotSignal =
      lead.pre_approved === "yes" ||
      lead.pre_approved === "cash" ||
      ["showing_scheduled", "offer_made", "under_contract", "closed"].includes(lead.status);
    if (hotSignal) entry.hot++;
    counts.set(source, entry);
  }

  // Hide until there's real source variety — one bar at 100% is useless.
  // Need 2+ distinct sources OR any non-direct source to be insightful.
  const distinctSources = counts.size;
  const hasNonDirect = Array.from(counts.keys()).some((s) => s.toLowerCase() !== "direct");
  if (distinctSources < 2 && !hasNonDirect) return null;

  // Sort by total descending
  const sorted = Array.from(counts.entries()).sort(([, a], [, b]) => b.total - a.total);
  const maxCount = sorted[0]?.[1].total || 1;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-gray-900">Leads by Source</h3>
      </div>
      <p className="mb-3 text-[11px] text-gray-500">
        Where your buyers came from. Double down on what&apos;s working.
      </p>
      <div className="space-y-2">
        {sorted.slice(0, 6).map(([source, entry]) => {
          const pct = Math.round((entry.total / maxCount) * 100);
          return (
            <div key={source}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">{formatSource(source)}</span>
                <span className="text-gray-500">
                  {entry.total} total{entry.hot > 0 && (
                    <span className="ml-1 font-semibold text-emerald-600">
                      ({entry.hot} hot)
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${sourceColor(source)} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1 text-[10px] text-gray-400">
        <ChevronRight className="h-3 w-3" />
        Add <code className="rounded bg-gray-100 px-1">?src=NAME</code> to any listing URL to tag custom sources.
      </p>
    </div>
  );
}
