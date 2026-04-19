"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SellerProspect } from "@/lib/types";
import { Trophy, MessageSquare, ChevronDown, ChevronUp, Check, AlertCircle } from "lucide-react";
import { buildSmsLink, firstName } from "@/lib/contactLinks";
import { formatPhone } from "@/lib/formatters";

interface Props {
  listingAddress: string;
  listingPrice: number | null;
  daysOnMarket?: number | null;
  agentFirstName?: string | null;
}

// This renders on closed/sold listings. One tap per prospect opens Messages
// on the agent's phone with a pre-filled just-sold bragging note. Builds
// agent authority and keeps the seller prospects tab engaged.
export default function JustSoldBlast({
  listingAddress,
  listingPrice,
  daysOnMarket,
  agentFirstName,
}: Props) {
  const [prospects, setProspects] = useState<SellerProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("seller_prospects")
          .select("*")
          .in("stage", ["prospect", "met", "presentation"])
          .order("created_at", { ascending: false });
        if (active) {
          setProspects((data as SellerProspect[]) || []);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [expanded]);

  const priceFormatted = useMemo(() => {
    if (!listingPrice) return null;
    return `$${Math.round(listingPrice).toLocaleString()}`;
  }, [listingPrice]);

  const defaultMessage = useMemo(() => {
    const me = agentFirstName || "I";
    const pricePart = priceFormatted ? ` for ${priceFormatted}` : "";
    const domPart = daysOnMarket && daysOnMarket > 0 ? ` in ${daysOnMarket} ${daysOnMarket === 1 ? "day" : "days"}` : "";
    return `Hey {first_name}, ${me} just sold ${listingAddress}${pricePart}${domPart}. Happy to chat about yours when you're ready.`;
  }, [agentFirstName, priceFormatted, listingAddress, daysOnMarket]);

  const currentMessage = customMessage ?? defaultMessage;

  const buildBodyFor = (prospect: SellerProspect) => {
    const first = firstName(prospect.name);
    return currentMessage.replace(/\{first_name\}/g, first);
  };

  const markSent = (id: string) => {
    setSentSet((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Also mark the prospect as contacted server-side (non-blocking)
    fetch(`/api/seller-prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markContacted: true }),
    }).catch(() => {});
  };

  return (
    <section className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-gray-900">
              Send a Just Sold blast
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              Turn this win into referrals. Text every active seller prospect a one-tap brag with the closing price. Builds authority, no extra typing.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide" : "Open"}
        </button>
      </div>

      {expanded && (
        <div className="mt-5 space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Message preview</p>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="text-[11px] font-medium text-brand-700 hover:underline"
              >
                {editing ? "Done" : "Customize"}
              </button>
            </div>
            {editing ? (
              <textarea
                value={currentMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                {currentMessage.replace(/\{first_name\}/g, "Sarah")}
              </p>
            )}
            <p className="mt-2 text-[10px] text-gray-400">
              {"{first_name}"} is replaced with each prospect&apos;s first name automatically.
            </p>
          </div>

          {loading ? (
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ) : prospects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-500">
              <AlertCircle className="mx-auto mb-2 h-4 w-4 text-gray-400" />
              No active seller prospects yet. Add some in the Seller Prospects tab first, then come back here.
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs text-gray-600">
                {prospects.length} active {prospects.length === 1 ? "prospect" : "prospects"}. Tap Text next to each to send from your phone.
              </p>
              <ul className="space-y-1.5">
                {prospects.map((p) => {
                  const sms = buildSmsLink(p.phone, buildBodyFor(p));
                  const sent = sentSet.has(p.id);
                  return (
                    <li
                      key={p.id}
                      className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors ${
                        sent ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="truncate text-[11px] text-gray-500">
                          {p.phone ? formatPhone(p.phone) : "No phone on file"}
                          {p.stage && <span className="ml-2 capitalize">{p.stage}</span>}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {sms ? (
                          <a
                            href={sms}
                            onClick={() => markSent(p.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-emerald-600"
                          >
                            {sent ? <Check className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                            {sent ? "Sent" : "Text"}
                          </a>
                        ) : (
                          <span className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-400">
                            No phone
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[10px] text-gray-400">
                Texts send from your real phone number. This just opens Messages with the text pre-filled.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
