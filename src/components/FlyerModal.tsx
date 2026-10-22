"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Printer, X } from "lucide-react";
import type { FlyerData } from "@/lib/types";
import OpenHouseFlyer from "@/components/OpenHouseFlyer";

interface Props {
  listingId: string;
  onClose: () => void;
}

// Rendered in a portal directly under <body> so the print stylesheet can hide
// every other body child and print only the flyer.
export default function FlyerModal({ listingId, onClose }: Props) {
  const [data, setData] = useState<FlyerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventLabel, setEventLabel] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/listings/${listingId}/flyer`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't load the flyer");
        return res.json() as Promise<FlyerData>;
      })
      .then((d) => active && setData(d))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [listingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      id="flyer-print-root"
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-gray-900/80 print:static print:block print:overflow-visible print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Open house flyer"
    >
      <style>{`
        @page { size: letter; margin: 0; }
        @media print {
          body > *:not(#flyer-print-root) { display: none !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-3 shadow print:hidden">
        <h2 className="font-serif text-lg font-semibold text-gray-900">Open House Flyer</h2>
        <input
          type="text"
          value={eventLabel}
          onChange={(e) => setEventLabel(e.target.value)}
          placeholder="Date & time, e.g. Sat, Oct 25 · 1-4 PM"
          className="min-w-[16rem] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          maxLength={60}
        />
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!data}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 justify-center p-4 print:block print:p-0">
        {error ? (
          <p className="mt-16 h-fit rounded-lg bg-white px-4 py-3 text-sm text-red-600 print:hidden">{error}</p>
        ) : !data ? (
          <div className="mt-16 flex items-center gap-2 text-sm text-white print:hidden">
            <Loader2 className="h-4 w-4 animate-spin" />
            Building your flyer…
          </div>
        ) : (
          // On screen: a scaled-down preview. In print: natural size.
          <div className="h-[calc(11in*0.7)] w-[calc(8.5in*0.7)] flex-none print:h-auto print:w-auto">
            <div className="origin-top-left scale-[0.7] shadow-2xl print:scale-100 print:shadow-none">
              <OpenHouseFlyer data={data} eventLabel={eventLabel.trim() || undefined} />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
