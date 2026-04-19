"use client";

import { useMemo } from "react";
import { MapPin, TrendingUp, Home, Bed, Bath, Ruler } from "lucide-react";
import type { ComparableSale } from "@/lib/types";

interface Props {
  comps: ComparableSale[] | undefined | null;
  thisPrice: number;
  thisSqft?: number;
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function pricePerSqft(price: number, sqft?: number | null) {
  if (!sqft || sqft <= 0) return null;
  return Math.round(price / sqft);
}

// Agent-curated comps. Buyers see 3-5 recently sold nearby homes and
// how this listing compares on price, price-per-sqft, and the basic
// specs. Huge trust signal — Zillow's "Comparable Homes" section is one
// of the first things buyers scroll to. Empty state just hides the
// section, so listings without comps aren't affected.
export default function ComparableSales({ comps, thisPrice, thisSqft }: Props) {
  const rows = useMemo(() => {
    if (!comps || comps.length === 0) return [];
    return [...comps].sort(
      (a, b) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime()
    );
  }, [comps]);

  if (rows.length === 0) return null;

  // Market-level summary line: average comp price + average $/sqft
  const avgPrice = Math.round(rows.reduce((a, r) => a + r.soldPrice, 0) / rows.length);
  const compPpsfs = rows
    .map((r) => pricePerSqft(r.soldPrice, r.sqft))
    .filter((v): v is number => v != null);
  const avgPpsf = compPpsfs.length
    ? Math.round(compPpsfs.reduce((a, b) => a + b, 0) / compPpsfs.length)
    : null;
  const thisPpsf = pricePerSqft(thisPrice, thisSqft);
  const priceDelta = thisPrice - avgPrice;
  const ppsfDelta = thisPpsf != null && avgPpsf != null ? thisPpsf - avgPpsf : null;

  return (
    <section className="relative overflow-hidden bg-white py-14 md:py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, var(--agent-brand, #b8965a) 0%, transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-px w-20"
            style={{ background: "linear-gradient(90deg, transparent, var(--agent-brand, #b8965a), transparent)" }}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">
            Comparable Sales
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
            What&apos;s sold nearby
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
            Recently sold homes with similar size and location, so you can see where this one lands.
          </p>
        </div>

        {/* Market summary strip */}
        <div className="mt-8 grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-5 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Comp avg price
            </p>
            <p className="mt-1 font-serif text-xl font-bold text-gray-900">{formatMoney(avgPrice)}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Across {rows.length} recent sale{rows.length !== 1 ? "s" : ""}
            </p>
          </div>
          {avgPpsf != null && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Comp avg $/sqft
              </p>
              <p className="mt-1 font-serif text-xl font-bold text-gray-900">${avgPpsf}</p>
              {thisPpsf != null && ppsfDelta != null && (
                <p
                  className={`mt-0.5 text-[11px] font-medium ${
                    ppsfDelta < 0 ? "text-emerald-600" : ppsfDelta > 0 ? "text-amber-600" : "text-gray-500"
                  }`}
                >
                  This home: ${thisPpsf} / sqft
                  {ppsfDelta !== 0 ? ` (${ppsfDelta > 0 ? "+" : ""}${ppsfDelta})` : ""}
                </p>
              )}
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              This home
            </p>
            <p className="mt-1 font-serif text-xl font-bold text-gray-900">{formatMoney(thisPrice)}</p>
            <p
              className={`mt-0.5 text-[11px] font-medium ${
                priceDelta < 0 ? "text-emerald-600" : priceDelta > 0 ? "text-amber-600" : "text-gray-500"
              }`}
            >
              {priceDelta === 0 ? "Matches comp avg" : `${priceDelta < 0 ? "−" : "+"}${formatMoney(Math.abs(priceDelta))} vs avg`}
            </p>
          </div>
        </div>

        {/* Comp cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((c, i) => {
            const ppsf = pricePerSqft(c.soldPrice, c.sqft);
            return (
              <div
                key={`${c.address}-${i}`}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/40 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div
                  className="absolute left-0 top-0 h-full w-1 opacity-80"
                  style={{ backgroundColor: "var(--agent-brand, #b8965a)" }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5">
                        <TrendingUp className="h-3 w-3" />
                        Sold {formatDate(c.soldDate)}
                      </span>
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-gray-900">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{c.address}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg font-bold text-gray-900">
                      {formatMoney(c.soldPrice)}
                    </p>
                    {ppsf != null && (
                      <p className="text-[11px] text-gray-500">${ppsf}/sqft</p>
                    )}
                  </div>
                </div>

                {(c.beds || c.baths || c.sqft) && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-600">
                    {c.beds != null && (
                      <span className="inline-flex items-center gap-1">
                        <Bed className="h-3 w-3 text-gray-400" />
                        {c.beds} bd
                      </span>
                    )}
                    {c.baths != null && (
                      <span className="inline-flex items-center gap-1">
                        <Bath className="h-3 w-3 text-gray-400" />
                        {c.baths} ba
                      </span>
                    )}
                    {c.sqft != null && (
                      <span className="inline-flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-gray-400" />
                        {c.sqft.toLocaleString()} sqft
                      </span>
                    )}
                  </div>
                )}

                {c.note && (
                  <p className="mt-2 text-xs italic text-gray-500">&ldquo;{c.note}&rdquo;</p>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          <Home className="mr-1 inline h-3 w-3" />
          Comparable sales provided by the listing agent.
        </p>
      </div>
    </section>
  );
}
