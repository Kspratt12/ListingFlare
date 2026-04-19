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
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
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
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-medium text-gray-600">Down payment</label>
                <span className="text-sm font-semibold text-gray-900">${formatMoney(downAmount)} ({downPct}%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={downPct}
                onChange={(e) => setDownPct(e.target.value)}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-brand-500"
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
                  {[15, 20, 30].map((yrs) => (
                    <button
                      key={yrs}
                      type="button"
                      onClick={() => setTerm(yrs)}
                      className={`flex-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                        term === yrs
                          ? "border-brand-400 bg-brand-50 text-brand-700"
                          : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {yrs} yr
                    </button>
                  ))}
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

          {/* Output */}
          <div className="md:col-span-2 flex flex-col gap-3 rounded-2xl border border-gray-950 bg-gray-950 p-6 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
              Estimated monthly
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-4xl font-bold md:text-5xl">
                ${formatMoney(Math.round(totalMonthly))}
              </span>
              <span className="text-sm text-gray-400">/ mo</span>
            </div>
            <div className="my-3 h-px w-full bg-white/10" />
            <div className="space-y-1.5 text-xs text-gray-300">
              <div className="flex justify-between">
                <span>Principal + Interest</span>
                <span className="font-medium text-white">${formatMoney(Math.round(monthlyPI))}</span>
              </div>
              <div className="flex justify-between">
                <span>Property tax</span>
                <span className="font-medium text-white">${formatMoney(Math.round(monthlyTax))}</span>
              </div>
              <div className="flex justify-between">
                <span>Insurance</span>
                <span className="font-medium text-white">${formatMoney(Math.round(monthlyInsurance))}</span>
              </div>
              {monthlyHoa > 0 && (
                <div className="flex justify-between">
                  <span>HOA</span>
                  <span className="font-medium text-white">${formatMoney(monthlyHoa)}</span>
                </div>
              )}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-gray-500">
              Estimate only. Your actual payment depends on your credit, PMI, and exact tax/insurance quotes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
