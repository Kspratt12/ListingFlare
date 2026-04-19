"use client";

import { useMemo, useState } from "react";
import { Calculator, Info } from "lucide-react";

interface Props {
  listingPrice: number;
  state?: string | null;
}

// State-level average effective property tax rates. Used as the default
// starting point - buyers can override. Source: Tax Foundation 2024.
const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.41, AK: 1.23, AZ: 0.66, AR: 0.64, CA: 0.75, CO: 0.55, CT: 2.14,
  DE: 0.61, FL: 0.91, GA: 0.92, HI: 0.32, ID: 0.69, IL: 2.27, IN: 0.85,
  IA: 1.57, KS: 1.41, KY: 0.86, LA: 0.55, ME: 1.36, MD: 1.09, MA: 1.23,
  MI: 1.54, MN: 1.12, MS: 0.81, MO: 1.01, MT: 0.84, NE: 1.73, NV: 0.60,
  NH: 2.18, NJ: 2.49, NM: 0.80, NY: 1.72, NC: 0.84, ND: 0.98, OH: 1.62,
  OK: 0.90, OR: 0.97, PA: 1.58, RI: 1.63, SC: 0.57, SD: 1.31, TN: 0.71,
  TX: 1.80, UT: 0.63, VT: 1.90, VA: 0.82, WA: 0.98, WV: 0.58, WI: 1.85,
  WY: 0.61, DC: 0.57,
};

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function monthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0;
  const n = termYears * 12;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export default function MortgageCalculator({ listingPrice, state }: Props) {
  const defaultTaxRate = (state && STATE_TAX_RATES[state.toUpperCase()]) || 1.10;

  const [downPct, setDownPct] = useState<string>("20");
  const [rate, setRate] = useState<string>("7.0");
  const [term, setTerm] = useState<number>(30);
  const [taxRate, setTaxRate] = useState<string>(defaultTaxRate.toFixed(2));
  const [insurance, setInsurance] = useState<string>("1200"); // annual
  const [hoa, setHoa] = useState<string>("0"); // monthly

  const downAmount = useMemo(() => {
    const pct = Number(downPct) || 0;
    return Math.round((listingPrice * pct) / 100);
  }, [listingPrice, downPct]);

  const principal = Math.max(0, listingPrice - downAmount);

  const monthlyPI = useMemo(() => {
    return monthlyPayment(principal, Number(rate) || 0, term);
  }, [principal, rate, term]);

  const monthlyTax = (listingPrice * (Number(taxRate) || 0)) / 100 / 12;
  const monthlyInsurance = (Number(insurance) || 0) / 12;
  const monthlyHoa = Number(hoa) || 0;

  const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyHoa;

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{
              backgroundColor: "color-mix(in srgb, var(--agent-brand, #b8965a) 12%, white)",
              color: "var(--agent-brand, #b8965a)",
            }}
          >
            <Calculator className="h-3.5 w-3.5" />
            Monthly Payment
          </div>
          <h2 className="mt-4 font-serif text-3xl font-bold text-gray-900 md:text-4xl">
            What would this cost me?
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Estimate your monthly payment. Adjust any number to match your situation.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-5 md:gap-8">
          {/* Inputs */}
          <div className="md:col-span-3 space-y-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-5 md:p-6">
            <div className="flex items-baseline justify-between border-b border-gray-200 pb-3">
              <label className="text-xs font-medium text-gray-600">Home price</label>
              <span className="font-serif text-lg font-semibold text-gray-900">${formatMoney(listingPrice)}</span>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-gray-600">Down payment</label>
                {/* Inline editable chips — users can either drag the slider
                    or type an exact % or $ amount. Both inputs drive the
                    same shared percentage state, kept in sync. */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center rounded-md border border-gray-300 bg-white px-2 py-0.5 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-400">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label="Down payment dollars"
                      value={downAmount > 0 ? formatMoney(downAmount) : ""}
                      onChange={(e) => {
                        const raw = Number(e.target.value.replace(/[^0-9]/g, ""));
                        const pct = listingPrice > 0 ? Math.min(100, (raw / listingPrice) * 100) : 0;
                        setDownPct(pct.toFixed(2).replace(/\.?0+$/, ""));
                      }}
                      className="w-24 bg-transparent text-right text-sm font-semibold text-gray-900 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center rounded-md border border-gray-300 bg-white px-2 py-0.5 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-400">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Down payment percent"
                      value={downPct}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        const num = Number(raw);
                        if (raw === "" || (num >= 0 && num <= 100)) {
                          setDownPct(raw);
                        }
                      }}
                      className="w-10 bg-transparent text-right text-sm font-semibold text-gray-900 focus:outline-none"
                      placeholder="20"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.min(50, Math.max(0, Number(downPct) || 0))}
                onChange={(e) => setDownPct(e.target.value)}
                className="brand-slider mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200"
              />
              <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Interest rate (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Loan term</label>
                <div className="flex gap-2">
                  {[15, 20, 30].map((yrs) => {
                    const selected = term === yrs;
                    return (
                      <button
                        key={yrs}
                        type="button"
                        onClick={() => setTerm(yrs)}
                        className={`flex-1 rounded-md border px-2 py-2 text-xs font-semibold transition-colors ${
                          selected ? "" : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                        }`}
                        style={
                          selected
                            ? {
                                backgroundColor:
                                  "color-mix(in srgb, var(--agent-brand, #b8965a) 15%, white)",
                                borderColor: "var(--agent-brand, #b8965a)",
                                color: "var(--agent-brand, #b8965a)",
                              }
                            : undefined
                        }
                      >
                        {yrs} yr
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
                  Property tax (%)
                  <span title={`State default: ${defaultTaxRate.toFixed(2)}%`}>
                    <Info className="h-3 w-3 text-gray-400" />
                  </span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Insurance ($/yr)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">HOA ($/mo)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={hoa}
                  onChange={(e) => setHoa(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            </div>
          </div>

          {(() => {
            // Donut chart segments, computed inline so they always
            // reflect the live slider values. P&I gets the brand
            // color; tax/insurance/HOA step down through muted whites
            // so the breakdown reads at a glance without a legend table.
            const SEG_COLORS = ["var(--agent-brand, #b8965a)", "rgba(255,255,255,0.65)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0.22)"] as const;
            const SEG_LABELS = ["Principal + Interest", "Property tax", "Insurance", "HOA"] as const;
            const values = [monthlyPI, monthlyTax, monthlyInsurance, monthlyHoa];
            const total = values.reduce((a, b) => a + b, 0) || 1;
            const r = 42;
            const C = 2 * Math.PI * r; // circumference
            let cumulative = 0;
            const segments = values.map((v, i) => {
              const pct = v / total;
              const length = pct * C;
              const offset = cumulative * C;
              cumulative += pct;
              return { length, offset, color: SEG_COLORS[i], label: SEG_LABELS[i], value: v, pct };
            });

            return (
              <div
                className="md:col-span-2 flex flex-col gap-3 rounded-2xl p-6 text-white shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--agent-brand, #0f172a) 55%, #0a0a0a) 0%, color-mix(in srgb, var(--agent-brand, #0f172a) 35%, #0a0a0a) 100%)",
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  Estimated monthly
                </p>

                {/* Headline number + donut side by side */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-serif text-4xl font-bold md:text-5xl">
                        ${formatMoney(Math.round(totalMonthly))}
                      </span>
                      <span className="text-sm text-white/60">/ mo</span>
                    </div>
                  </div>
                  <svg viewBox="0 0 120 120" className="h-24 w-24 flex-shrink-0">
                    {/* Track */}
                    <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
                    {/* Segments — rotated so they start at 12 o'clock */}
                    {segments.map((seg, i) =>
                      seg.length > 0 ? (
                        <circle
                          key={i}
                          cx="60"
                          cy="60"
                          r={r}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="14"
                          strokeDasharray={`${seg.length} ${C}`}
                          strokeDashoffset={-seg.offset}
                          transform="rotate(-90 60 60)"
                          style={{ transition: "stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease" }}
                        />
                      ) : null
                    )}
                  </svg>
                </div>

                <div className="my-1 h-px w-full bg-white/20" />

                <div className="space-y-1.5 text-xs text-white/80">
                  {segments.map((seg) => {
                    if (seg.value <= 0 && seg.label === "HOA") return null;
                    return (
                      <div key={seg.label} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className="truncate">{seg.label}</span>
                        </span>
                        <span className="flex-shrink-0 font-semibold text-white">
                          ${formatMoney(Math.round(seg.value))}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-white/60">
                  Estimate only. Your actual payment depends on your credit, PMI, and exact tax/insurance quotes.
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
