"use client";

import { useState } from "react";
import { Calculator, TrendingUp } from "lucide-react";

export default function RoiCalculator() {
  const [homePrice, setHomePrice] = useState(400000);
  const [commissionPct, setCommissionPct] = useState(2.5);
  const [extraClosingsPerYear, setExtraClosingsPerYear] = useState(1);

  const commissionPerDeal = (homePrice * commissionPct) / 100;
  const annualEarnings = commissionPerDeal * extraClosingsPerYear;
  const annualCost = 150 * 12;
  const roiMultiple = Math.round(annualEarnings / annualCost);
  const daysToBreakEven = Math.ceil((annualCost / annualEarnings) * 365);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          ROI Calculator
        </h3>
      </div>
      <h2 className="mt-2 font-serif text-2xl font-bold text-gray-900">
        What&apos;s ListingFlare worth to you?
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Drag the sliders to see how fast it pays for itself.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Avg home price you list
              </label>
              <span className="font-serif text-base font-bold text-gray-900">
                {formatMoney(homePrice)}
              </span>
            </div>
            <input
              type="range"
              min="150000"
              max="1500000"
              step="25000"
              value={homePrice}
              onChange={(e) => setHomePrice(parseInt(e.target.value))}
              className="mt-2 w-full accent-brand-500"
              aria-label="Average home price"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Your commission rate
              </label>
              <span className="font-serif text-base font-bold text-gray-900">
                {commissionPct.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              step="0.1"
              value={commissionPct}
              onChange={(e) => setCommissionPct(parseFloat(e.target.value))}
              className="mt-2 w-full accent-brand-500"
              aria-label="Commission percent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Extra closings/year from ListingFlare
              </label>
              <span className="font-serif text-base font-bold text-gray-900">
                {extraClosingsPerYear}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={extraClosingsPerYear}
              onChange={(e) => setExtraClosingsPerYear(parseInt(e.target.value))}
              className="mt-2 w-full accent-brand-500"
              aria-label="Extra closings per year"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-3 rounded-xl bg-gradient-to-br from-brand-50 to-white border border-brand-200 p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Commission per deal
            </p>
            <p className="font-serif text-2xl font-bold text-gray-900">
              {formatMoney(commissionPerDeal)}
            </p>
          </div>
          <div className="border-t border-brand-100 pt-3">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Extra income per year
            </p>
            <p className="font-serif text-3xl font-bold text-brand-700">
              {formatMoney(annualEarnings)}
            </p>
          </div>
          <div className="border-t border-brand-100 pt-3">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              ListingFlare pays for itself in
            </p>
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-gray-900">
                {daysToBreakEven < 1 ? "less than 1" : daysToBreakEven}
              </span>
              <span className="text-sm text-gray-500">
                {daysToBreakEven === 1 ? "day" : "days"}
              </span>
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-medium text-emerald-800">
              {roiMultiple}× return on a $1,800/year investment
            </p>
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-gray-400">
        This is an estimate. Your actual results depend on how well you use the platform.
      </p>
    </div>
  );
}
