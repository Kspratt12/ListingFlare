"use client";

import { TrendingDown, TrendingUp, Tag, Clock } from "lucide-react";
import type { PriceHistoryEntry } from "@/lib/types";

interface Props {
  history: PriceHistoryEntry[] | undefined | null;
  currentPrice: number;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function eventLabel(event: PriceHistoryEntry["event"]): string {
  switch (event) {
    case "listed": return "Listed";
    case "reduced": return "Price Reduced";
    case "increased": return "Price Raised";
    case "pending": return "Pending";
    case "sold": return "Sold";
    case "relisted": return "Back on Market";
    default: return "Update";
  }
}

// Tiny SVG line chart that plots the price-over-time trajectory of a
// listing. Only rendered when there are 2+ price events; a single data
// point doesn't make a meaningful line. Pure SVG so there's no chart
// library weight — all scaling and pathing is computed inline.
function PriceTrajectoryChart({
  chronological,
}: {
  chronological: PriceHistoryEntry[];
}) {
  if (chronological.length < 2) return null;

  const W = 800;
  const H = 180;
  const PAD_X = 30;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 36;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const prices = chronological.map((e) => e.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = Math.max(maxPrice - minPrice, 1); // avoid divide-by-zero

  const times = chronological.map((e) => new Date(e.date).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = Math.max(maxTime - minTime, 1);

  const points = chronological.map((e) => {
    const x = PAD_X + ((new Date(e.date).getTime() - minTime) / timeRange) * innerW;
    const y = PAD_TOP + (1 - (e.price - minPrice) / priceRange) * innerH;
    return { x, y, price: e.price, date: e.date, event: e.event };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Build the filled area under the line for a Zillow-style shaded curve
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${PAD_TOP + innerH} L ${points[0].x.toFixed(1)} ${PAD_TOP + innerH} Z`;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/40 md:p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
          Price trajectory
        </p>
        <p className="text-[10px] text-gray-400">
          {new Date(minTime).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          {" – "}
          {new Date(maxTime).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full md:h-52" preserveAspectRatio="none">
        <defs>
          <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--agent-brand, #b8965a)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--agent-brand, #b8965a)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal guide lines — min, mid, max */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_TOP + innerH * t}
            y2={PAD_TOP + innerH * t}
            stroke="#e5e7eb"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}

        {/* Min / Max labels */}
        <text x={PAD_X} y={PAD_TOP - 8} fontSize="10" fill="#9ca3af" fontWeight="600">
          ${Math.round(maxPrice).toLocaleString()}
        </text>
        <text x={PAD_X} y={PAD_TOP + innerH + 16} fontSize="10" fill="#9ca3af" fontWeight="600">
          ${Math.round(minPrice).toLocaleString()}
        </text>

        {/* Shaded area under the line */}
        <path d={areaD} fill="url(#priceArea)" />

        {/* Trend line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--agent-brand, #b8965a)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Point markers */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={5}
              fill="white"
              stroke="var(--agent-brand, #b8965a)"
              strokeWidth={2.5}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function PriceHistory({ history, currentPrice }: Props) {
  if (!history || history.length === 0) return null;

  // Chronological (oldest-first) for the trajectory chart.
  const chronological = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Sort newest first for the list display below.
  const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate initial listing price vs current for the summary
  const initialPrice = chronological[0]?.price || currentPrice;
  const totalChange = currentPrice - initialPrice;
  const pctChange = initialPrice > 0 ? (totalChange / initialPrice) * 100 : 0;
  const reduced = totalChange < 0;
  const raised = totalChange > 0;

  return (
    <section className="relative overflow-hidden py-14 md:py-16">
      {/* Subtle brand-tinted light backdrop so this section reads as part
          of the same premium set as the dark Property Details stat sheet
          without being as heavy (two dark sections in a row = too much). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, color-mix(in srgb, var(--agent-brand, #b8965a) 5%, #f9fafb) 40%, color-mix(in srgb, var(--agent-brand, #b8965a) 7%, #f9fafb) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top right, var(--agent-brand, #b8965a) 0%, transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div
              className="mb-3 h-px w-16"
              style={{ background: "linear-gradient(90deg, transparent, var(--agent-brand, #b8965a), transparent)" }}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              Price History
            </p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              How this home has priced
            </h2>
          </div>
          {(reduced || raised) && (
            <div
              className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold ${
                reduced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {reduced ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              {reduced ? "Reduced" : "Raised"} {formatMoney(Math.abs(totalChange))} ({pctChange.toFixed(1)}%)
            </div>
          )}
        </div>

        {/* Zillow-style trajectory chart — hidden when only 1 entry */}
        <PriceTrajectoryChart chronological={chronological} />

        <ol className="mt-6 space-y-3">
          {sorted.map((entry, i) => {
            const prev = sorted[i + 1]; // next-older entry
            const diff = prev ? entry.price - prev.price : 0;
            const isReduction = diff < 0;
            const isIncrease = diff > 0;
            return (
              <li
                key={`${entry.date}-${i}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/40 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                    entry.event === "reduced" ? "bg-emerald-100 text-emerald-700"
                    : entry.event === "increased" ? "bg-amber-100 text-amber-700"
                    : entry.event === "listed" || entry.event === "relisted" ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                  }`}>
                    {entry.event === "reduced" ? <TrendingDown className="h-4 w-4" />
                    : entry.event === "increased" ? <TrendingUp className="h-4 w-4" />
                    : entry.event === "sold" ? <Tag className="h-4 w-4" />
                    : <Clock className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{eventLabel(entry.event)}</p>
                    <p className="text-xs text-gray-500">{formatDate(entry.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-serif text-base font-bold text-gray-900 md:text-lg">{formatMoney(entry.price)}</p>
                  {(isReduction || isIncrease) && (
                    <p className={`text-xs font-medium ${isReduction ? "text-emerald-600" : "text-amber-600"}`}>
                      {isReduction ? "−" : "+"}{formatMoney(Math.abs(diff))}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
