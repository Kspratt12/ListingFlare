"use client";

import { Clock, Eye, DollarSign } from "lucide-react";

interface Props {
  price: number;
  sqft: number;
  viewCount?: number | null;
  publishedAt?: string | null;
  createdAt?: string | null;
}

function daysBetween(iso: string): number {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

// Compact social-proof strip between the hero and the property details.
// Renders only the stats that actually have data so we never show "0 views"
// or "1 day on market" before a listing has any real activity.
export default function ListingStatsBar({ price, sqft, viewCount, publishedAt, createdAt }: Props) {
  const pricePerSqft = price > 0 && sqft > 0 ? Math.round(price / sqft) : null;

  const startIso = publishedAt || createdAt || null;
  const dom = startIso ? daysBetween(startIso) : null;

  const stats: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string }> = [];

  if (pricePerSqft) {
    stats.push({
      icon: DollarSign,
      label: "per sqft",
      value: `$${pricePerSqft.toLocaleString()}`,
    });
  }
  if (dom != null && dom > 0) {
    stats.push({
      icon: Clock,
      label: dom === 1 ? "day on market" : "days on market",
      value: dom.toLocaleString(),
    });
  }
  if (typeof viewCount === "number" && viewCount > 5) {
    // Skip until there's at least a few - otherwise "1 view" looks embarrassing
    stats.push({
      icon: Eye,
      label: viewCount === 1 ? "view" : "views",
      value: viewCount.toLocaleString(),
    });
  }

  if (stats.length === 0) return null;

  return (
    <section className="border-b border-gray-100 bg-white py-5">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 md:justify-start md:gap-x-10">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-serif text-base font-bold text-gray-900 leading-none md:text-lg">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
