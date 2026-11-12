"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator } from "lucide-react";

// A what-if tool, not a forecast. Every number below the inputs is arithmetic on
// values the visitor types in. Nothing is stored or sent anywhere, and nothing here
// is a measured result. The only fact is the plan price.
const PLAN_PER_YEAR = 150 * 12;

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

interface SliderProps {
  id: string; label: string; value: number; display: string;
  min: number; max: number; step: number; onChange: (n: number) => void;
}

function Slider(p: SliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={p.id} className="text-sm font-medium text-gray-700">{p.label}</label>
        <span className="font-serif text-base font-bold text-gray-900">{p.display}</span>
      </div>
      <input
        id={p.id}
        type="range"
        min={p.min}
        max={p.max}
        step={p.step}
        value={p.value}
        onChange={(e) => p.onChange(parseFloat(e.target.value))}
        className="mt-2 w-full accent-brand-500"
      />
    </div>
  );
}

export default function RoiCalculator() {
  const [homePrice, setHomePrice] = useState(400000);
  const [commissionPct, setCommissionPct] = useState(2.5);
  const [keepPct, setKeepPct] = useState(70);
  const [closings, setClosings] = useState(0);

  const grossPerSale = (homePrice * commissionPct) / 100;
  const netPerSale = (grossPerSale * keepPct) / 100;
  const assumedIncome = netPerSale * closings;
  const netResult = assumedIncome - PLAN_PER_YEAR;
  const closingsToCover = netPerSale > 0 ? PLAN_PER_YEAR / netPerSale : null;

  return (
    <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-600">Break-even calculator</h3>
      </div>
      <h2 className="mt-2 font-serif text-2xl font-bold text-gray-900">What would it take to cover the plan?</h2>
      <p className="mt-1 text-sm text-gray-500">
        A what-if tool using numbers you choose. Example values are pre-filled; replace them with yours. Nothing you enter is saved or sent.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Your assumptions</p>
          <Slider id="roi-price" label="Typical sale price" value={homePrice} display={money(homePrice)}
            min={150000} max={1500000} step={25000} onChange={setHomePrice} />
          <Slider id="roi-commission" label="Commission rate on your side" value={commissionPct} display={`${commissionPct.toFixed(1)}%`}
            min={1} max={6} step={0.1} onChange={setCommissionPct} />
          <Slider id="roi-keep" label="Share you keep after brokerage split and fees" value={keepPct} display={`${keepPct}%`}
            min={10} max={100} step={5} onChange={setKeepPct} />
          <Slider id="roi-closings" label="Additional sales you credit to ListingFlare this year" value={closings} display={String(closings)}
            min={0} max={6} step={1} onChange={setClosings} />
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-5" aria-live="polite">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Plan cost (fact)</p>
            <p className="font-serif text-2xl font-bold text-gray-900">{money(PLAN_PER_YEAR)} <span className="text-sm font-normal text-gray-500">per year at $150/month</span></p>
          </div>
          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs uppercase tracking-wider text-gray-500">Assumed take-home per sale</p>
            <p className="font-serif text-xl font-bold text-gray-900">{money(netPerSale)}</p>
            <p className="text-xs text-gray-500">{money(grossPerSale)} gross commission x {keepPct}% kept. Before taxes and your own costs.</p>
          </div>
          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs uppercase tracking-wider text-gray-500">Assumed net after plan cost</p>
            <p className={`font-serif text-3xl font-bold ${netResult < 0 ? "text-red-700" : "text-gray-900"}`}>
              {netResult < 0 ? "-" : ""}{money(Math.abs(netResult))}
            </p>
            <p className="text-xs text-gray-500">
              {closings === 0
                ? "With no additional sales, the plan is a cost."
                : `${closings} additional ${closings === 1 ? "sale" : "sales"} x ${money(netPerSale)} minus ${money(PLAN_PER_YEAR)}.`}
            </p>
          </div>
          {closingsToCover !== null && (
            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs uppercase tracking-wider text-gray-500">Break-even at your numbers</p>
              <p className="text-sm text-gray-800">About {closingsToCover.toFixed(1)} additional sales per year to cover the plan.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-800">Assumptions are yours; outcomes are measured separately.</p>
        <p className="mt-1">
          This calculator measures nothing and does not predict results. A lead is not a sale, and leads, showing requests and
          sales are not guaranteed. Once you use ListingFlare, your dashboard shows the real inquiries and showing requests
          your listings received, and any sales you record yourself.
        </p>
        <Link href="/signup" className="mt-3 inline-block font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
          Try it free for 14 days, no card required
        </Link>
        <span className="text-gray-500"> (the trial has limits; see the questions below)</span>
      </div>
    </div>
  );
}
