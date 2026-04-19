"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Offer, Listing } from "@/lib/types";
import { HandshakeIcon, PlusCircle, X, DollarSign } from "lucide-react";

type OfferWithListing = Offer & {
  listing?: Pick<Listing, "street" | "city" | "state" | "id"> | null;
};

const STATUS_STYLES: Record<Offer["status"], { label: string; bg: string; text: string; border: string }> = {
  submitted: { label: "Submitted", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  countered: { label: "Countered", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  accepted: { label: "Accepted", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  rejected: { label: "Rejected", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  withdrawn: { label: "Withdrawn", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
  expired: { label: "Expired", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

const COMMON_CONTINGENCIES = [
  "Inspection",
  "Appraisal",
  "Financing",
  "Home sale",
  "Title",
  "Survey",
  "HOA documents",
];

function formatMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferWithListing[]>([]);
  const [listings, setListings] = useState<Pick<Listing, "id" | "street" | "city" | "state" | "price">[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Offer["status"] | "all">("all");
  const supabase = createClient();

  // New offer form state
  const [nListing, setNListing] = useState("");
  const [nBuyerName, setNBuyerName] = useState("");
  const [nBuyerEmail, setNBuyerEmail] = useState("");
  const [nBuyerPhone, setNBuyerPhone] = useState("");
  const [nBuyerAgent, setNBuyerAgent] = useState("");
  const [nBuyerAgentBrokerage, setNBuyerAgentBrokerage] = useState("");
  const [nBuyerAgentPhone, setNBuyerAgentPhone] = useState("");
  const [nOfferPrice, setNOfferPrice] = useState("");
  const [nEarnest, setNEarnest] = useState("");
  const [nClosingDate, setNClosingDate] = useState("");
  const [nFinancing, setNFinancing] = useState<Offer["financing_type"]>("conventional");
  const [nContingencies, setNContingencies] = useState<string[]>([]);
  const [nNotes, setNNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      const [offersRes, listingsRes] = await Promise.all([
        supabase
          .from("offers")
          .select(`*, listing:listings(id, street, city, state)`)
          .eq("agent_id", user.id)
          .order("received_at", { ascending: false }),
        supabase
          .from("listings")
          .select("id, street, city, state, price")
          .eq("agent_id", user.id)
          .in("status", ["published", "pending"])
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;
      setOffers((offersRes.data as OfferWithListing[]) || []);
      setListings((listingsRes.data as typeof listings) || []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (offerId: string, next: Offer["status"]) => {
    await supabase.from("offers").update({ status: next }).eq("id", offerId);
    setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: next } : o)));
  };

  const submitNewOffer = async () => {
    if (!nListing || !nBuyerName || !nOfferPrice) return;
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("offers")
        .insert({
          listing_id: nListing,
          agent_id: user.id,
          buyer_name: nBuyerName,
          buyer_email: nBuyerEmail || null,
          buyer_phone: nBuyerPhone || null,
          buyer_agent_name: nBuyerAgent || null,
          buyer_agent_brokerage: nBuyerAgentBrokerage || null,
          buyer_agent_phone: nBuyerAgentPhone || null,
          offer_price: parseInt(nOfferPrice.replace(/[^0-9]/g, "")) || 0,
          earnest_money: nEarnest ? parseInt(nEarnest.replace(/[^0-9]/g, "")) : null,
          closing_date: nClosingDate || null,
          financing_type: nFinancing,
          contingencies: nContingencies,
          notes: nNotes || null,
        })
        .select(`*, listing:listings(id, street, city, state)`)
        .single();

      if (error) throw error;

      setOffers((prev) => [data as OfferWithListing, ...prev]);
      setShowNewModal(false);
      // Reset form
      setNListing(""); setNBuyerName(""); setNBuyerEmail(""); setNBuyerPhone("");
      setNBuyerAgent(""); setNBuyerAgentBrokerage(""); setNBuyerAgentPhone("");
      setNOfferPrice(""); setNEarnest(""); setNClosingDate("");
      setNFinancing("conventional"); setNContingencies([]); setNNotes("");
    } catch (err) {
      console.error("Create offer error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = filterStatus === "all" ? offers : offers.filter((o) => o.status === filterStatus);

  const totalActive = offers.filter((o) => ["submitted", "countered"].includes(o.status)).length;
  const totalAccepted = offers.filter((o) => o.status === "accepted").length;
  const topOffer = offers.length > 0 ? Math.max(...offers.map((o) => o.offer_price)) : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">Offers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track every offer you receive from submission to close. Keeps the whole negotiation visible.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          disabled={listings.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          <PlusCircle className="h-4 w-4" />
          Log New Offer
        </button>
      </div>

      {/* Summary strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Active</p>
          <p className="mt-1 font-serif text-2xl font-bold text-gray-900">{totalActive}</p>
          <p className="text-[11px] text-gray-500">Submitted + Countered</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Accepted</p>
          <p className="mt-1 font-serif text-2xl font-bold text-gray-900">{totalAccepted}</p>
          <p className="text-[11px] text-gray-500">Headed to closing</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Highest offer</p>
          <p className="mt-1 font-serif text-2xl font-bold text-gray-900">{topOffer > 0 ? formatMoney(topOffer) : "—"}</p>
          <p className="text-[11px] text-gray-500">Across all offers</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "submitted", "countered", "accepted", "rejected", "withdrawn", "expired"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === s ? "bg-gray-950 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "All" : STATUS_STYLES[s].label}
            {s !== "all" && (
              <span className="ml-1 opacity-60">
                ({offers.filter((o) => o.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Offer list */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <HandshakeIcon className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 font-serif text-lg font-semibold text-gray-900">
            {offers.length === 0 ? "No offers yet" : `No ${STATUS_STYLES[filterStatus as Offer["status"]]?.label.toLowerCase() || filterStatus} offers`}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {offers.length === 0
              ? "When a buyer's agent sends over paperwork, log it here to keep everything in one place."
              : "Try a different status filter."}
          </p>
          {offers.length === 0 && listings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <PlusCircle className="h-4 w-4" />
              Log your first offer
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const style = STATUS_STYLES[o.status];
            const listPrice = listings.find((l) => l.id === o.listing_id)?.price || 0;
            const deltaPct = listPrice > 0 ? ((o.offer_price - listPrice) / listPrice) * 100 : null;
            return (
              <div
                key={o.id}
                className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text} ${style.border}`}>
                        {style.label}
                      </span>
                      {o.listing && (
                        <Link
                          href={`/listing/${o.listing.id}`}
                          target="_blank"
                          className="truncate text-xs text-gray-500 hover:text-brand-600"
                        >
                          {o.listing.street}, {o.listing.city}
                        </Link>
                      )}
                    </div>
                    <p className="mt-2 font-serif text-2xl font-bold text-gray-900">
                      {formatMoney(o.offer_price)}
                    </p>
                    {deltaPct != null && listPrice > 0 && (
                      <p
                        className={`mt-0.5 text-xs font-medium ${
                          deltaPct < 0 ? "text-amber-700" : deltaPct > 0 ? "text-emerald-700" : "text-gray-500"
                        }`}
                      >
                        {deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}% vs list ({formatMoney(listPrice)})
                      </p>
                    )}
                    <div className="mt-3 grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
                      <p>
                        <span className="text-gray-500">Buyer:</span>{" "}
                        <span className="font-medium text-gray-900">{o.buyer_name}</span>
                      </p>
                      {o.buyer_agent_name && (
                        <p>
                          <span className="text-gray-500">Buyer&apos;s agent:</span>{" "}
                          {o.buyer_agent_name}
                          {o.buyer_agent_brokerage && <span className="text-gray-500"> · {o.buyer_agent_brokerage}</span>}
                        </p>
                      )}
                      {o.earnest_money != null && (
                        <p>
                          <span className="text-gray-500">Earnest:</span> {formatMoney(o.earnest_money)}
                        </p>
                      )}
                      {o.closing_date && (
                        <p>
                          <span className="text-gray-500">Target close:</span> {formatDate(o.closing_date)}
                        </p>
                      )}
                      {o.financing_type && (
                        <p>
                          <span className="text-gray-500">Financing:</span>{" "}
                          <span className="uppercase">{o.financing_type}</span>
                        </p>
                      )}
                      <p>
                        <span className="text-gray-500">Received:</span> {formatDate(o.received_at)}
                      </p>
                    </div>
                    {o.contingencies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {o.contingencies.map((c) => (
                          <span key={c} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    {o.notes && (
                      <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs italic text-gray-600">{o.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value as Offer["status"])}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                      aria-label="Change status"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="countered">Countered</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New offer modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowNewModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <h2 className="font-serif text-lg font-semibold text-gray-900">Log a new offer</h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Listing *</label>
                <select
                  value={nListing}
                  onChange={(e) => setNListing(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  required
                >
                  <option value="">Select a listing…</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.street}, {l.city}, {l.state} {l.price ? `· ${formatMoney(l.price)}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Buyer name *</label>
                  <input type="text" value={nBuyerName} onChange={(e) => setNBuyerName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Offer price *</label>
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="text" inputMode="numeric" value={nOfferPrice} onChange={(e) => setNOfferPrice(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      placeholder="850000" required />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Buyer email</label>
                  <input type="email" value={nBuyerEmail} onChange={(e) => setNBuyerEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Buyer phone</label>
                  <input type="tel" value={nBuyerPhone} onChange={(e) => setNBuyerPhone(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Buyer&apos;s agent</label>
                  <input type="text" value={nBuyerAgent} onChange={(e) => setNBuyerAgent(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Buyer&apos;s brokerage</label>
                  <input type="text" value={nBuyerAgentBrokerage} onChange={(e) => setNBuyerAgentBrokerage(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Buyer&apos;s agent phone</label>
                  <input type="tel" value={nBuyerAgentPhone} onChange={(e) => setNBuyerAgentPhone(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Earnest money</label>
                  <input type="text" inputMode="numeric" value={nEarnest} onChange={(e) => setNEarnest(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="10000" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Target closing date</label>
                  <input type="date" value={nClosingDate} onChange={(e) => setNClosingDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Financing</label>
                  <select value={nFinancing || "conventional"} onChange={(e) => setNFinancing(e.target.value as Offer["financing_type"])}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400">
                    <option value="cash">Cash</option>
                    <option value="conventional">Conventional</option>
                    <option value="fha">FHA</option>
                    <option value="va">VA</option>
                    <option value="usda">USDA</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Contingencies</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_CONTINGENCIES.map((c) => {
                    const on = nContingencies.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setNContingencies(on ? nContingencies.filter((x) => x !== c) : [...nContingencies, c])
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          on ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
                <textarea value={nNotes} onChange={(e) => setNNotes(e.target.value)} rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="Quick-close desired, buyer is pre-approved, seller prefers closing after Oct 15..." />
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNewOffer}
                disabled={submitting || !nListing || !nBuyerName || !nOfferPrice}
                className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
