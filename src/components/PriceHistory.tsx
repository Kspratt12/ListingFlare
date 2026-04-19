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

export default function PriceHistory({ history, currentPrice }: Props) {
  if (!history || history.length === 0) return null;

  // Sort newest first for display. Data is stored oldest-first but we flip here.
  const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate initial listing price vs current for the summary
  const initialEntry = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const initialPrice = initialEntry?.price || currentPrice;
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

        <ol className="mt-8 space-y-3">
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
