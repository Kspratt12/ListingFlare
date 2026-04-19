"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types";
import { DollarSign, X, Trophy, Loader2 } from "lucide-react";

interface Props {
  lead: Lead;
  onClose: () => void;
  onSaved: (closedPrice: number, commission: number) => void;
}

export default function CommissionModal({ lead, onClose, onSaved }: Props) {
  const [salePrice, setSalePrice] = useState<string>(
    lead.closed_price ? String(lead.closed_price) : ""
  );
  const [commission, setCommission] = useState<string>(
    lead.commission_amount ? String(lead.commission_amount) : ""
  );
  const [commissionPct, setCommissionPct] = useState<string>("2.5");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  // Auto-compute commission when price or % changes
  const handlePriceChange = (v: string) => {
    const clean = v.replace(/[^\d]/g, "");
    setSalePrice(clean);
    const price = parseInt(clean, 10);
    const pct = parseFloat(commissionPct);
    if (!isNaN(price) && !isNaN(pct)) {
      setCommission(String(Math.round((price * pct) / 100)));
    }
  };

  const handlePctChange = (v: string) => {
    setCommissionPct(v);
    const price = parseInt(salePrice, 10);
    const pct = parseFloat(v);
    if (!isNaN(price) && !isNaN(pct)) {
      setCommission(String(Math.round((price * pct) / 100)));
    }
  };

  const handleSave = async () => {
    const price = parseInt(salePrice, 10);
    const comm = parseInt(commission, 10);
    if (!price || price <= 0) {
      setError("Please enter the sale price");
      return;
    }
    if (!comm || comm <= 0) {
      setError("Please enter your commission");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      await supabase
        .from("leads")
        .update({
          status: "closed",
          closed_price: price,
          commission_amount: comm,
          closed_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      onSaved(price, comm);
      onClose();
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-br from-emerald-50 to-white px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-gray-900">Deal Closed!</h3>
              <p className="text-[11px] text-gray-500">Log the commission for {lead.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Final sale price
            </label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                value={salePrice ? parseInt(salePrice, 10).toLocaleString() : ""}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="450,000"
                className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Your commission rate
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={commissionPct}
                onChange={(e) => handlePctChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Your commission amount
            </label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                value={commission ? parseInt(commission, 10).toLocaleString() : ""}
                onChange={(e) => setCommission(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="11,250"
                className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Adjust if your actual commission differs from the auto-calculation.
            </p>
          </div>

          {parseInt(commission, 10) > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-900">
                Logging{" "}
                <span className="font-serif text-base font-bold">
                  {formatMoney(parseInt(commission, 10))}
                </span>{" "}
                attributed to ListingFlare
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-gray-950 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {saving ? "Saving..." : "Log Commission"}
          </button>
        </div>
      </div>
    </div>
  );
}
