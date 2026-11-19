"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Printer, X, RotateCcw } from "lucide-react";
import type { FlyerData } from "@/lib/types";
import OpenHouseFlyer from "@/components/OpenHouseFlyer";
import {
  DEFAULT_FLYER_OPTIONS,
  FLYER_COLORS,
  FLYER_LAYOUTS,
  FLYER_LIMITS,
  HEADLINE_PRESETS,
  flyerStorageKey,
  sanitizeFlyerOptions,
  timeRangeProblem,
  type FlyerOptions,
} from "@/lib/flyerOptions";

interface Props {
  listingId: string;
  onClose: () => void;
}

// Customizable printable flyer for one of the signed-in agent's own listings.
// Rendered in a portal directly under <body> so the print stylesheet can hide
// every other body child and print only the flyer.
//
// Choices are remembered per listing in this browser only (localStorage), as a convenience.
export default function FlyerModal({ listingId, onClose }: Props) {
  const [data, setData] = useState<FlyerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [options, setOptions] = useState<FlyerOptions>(DEFAULT_FLYER_OPTIONS);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(flyerStorageKey(listingId));
      if (saved) setOptions(sanitizeFlyerOptions(JSON.parse(saved)));
    } catch {
      // storage unavailable or corrupt: keep defaults
    }
  }, [listingId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(flyerStorageKey(listingId), JSON.stringify(options));
    } catch {
      // ignore
    }
  }, [listingId, options]);

  useEffect(() => {
    let active = true;
    setError(null);
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
  }, [listingId, reloadKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const set = <K extends keyof FlyerOptions>(key: K, value: FlyerOptions[K]) =>
    setOptions((prev) => sanitizeFlyerOptions({ ...prev, [key]: value }));
  const timeProblem = timeRangeProblem(options);
  const qrUrl = options.qrTarget === "signin" ? data?.signInUrl : data?.listingUrl;
  const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400";

  return createPortal(
    <div
      id="flyer-print-root"
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-gray-900/80 print:static print:block print:overflow-visible print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Listing flyer"
    >
      <style>{`
        @page { size: letter; margin: 0; }
        @media print {
          body > *:not(#flyer-print-root) { display: none !important; }
        }
      `}</style>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-white px-4 py-3 shadow print:hidden">
        <h2 className="mr-auto font-serif text-lg font-semibold text-gray-900">Listing Flyer</h2>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!data || !!timeProblem}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-start print:block print:p-0">
        {/* Controls */}
        <div className="w-full flex-none space-y-4 rounded-xl bg-white p-4 text-sm lg:sticky lg:top-20 lg:w-80 print:hidden">
          <fieldset>
            <legend className="mb-1.5 font-medium text-gray-700">Layout</legend>
            <div className="grid grid-cols-3 gap-2">
              {FLYER_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => set("layout", l.id)}
                  aria-pressed={options.layout === l.id}
                  title={l.description}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium ${options.layout === l.id ? "border-gray-950 bg-gray-950 text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 font-medium text-gray-700">Color</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set("accent", null)}
                aria-pressed={options.accent === null}
                className={`rounded-md border px-2 text-xs ${options.accent === null ? "border-gray-950 font-semibold" : "border-gray-200"}`}
              >
                Brand
              </button>
              {FLYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("accent", c)}
                  aria-label={`Use color ${c}`}
                  aria-pressed={options.accent === c}
                  style={{ backgroundColor: c }}
                  className={`h-7 w-7 rounded-md border-2 ${options.accent === c ? "border-gray-950" : "border-transparent"}`}
                />
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="flyer-headline" className="mb-1.5 block font-medium text-gray-700">Headline</label>
            <input id="flyer-headline" type="text" value={options.headline} maxLength={FLYER_LIMITS.headline}
              onChange={(e) => setOptions((p) => ({ ...p, headline: e.target.value.slice(0, FLYER_LIMITS.headline) }))}
              onBlur={() => setOptions((p) => sanitizeFlyerOptions(p))}
              className={inputCls} />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {HEADLINE_PRESETS.map((h) => (
                <button key={h} type="button" onClick={() => set("headline", h)} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-200">
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <label htmlFor="flyer-date" className="mb-1 block font-medium text-gray-700">Open house date (optional)</label>
              <input id="flyer-date" type="date" value={options.eventDate} onChange={(e) => set("eventDate", e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-3 grid grid-cols-2 gap-2 sm:col-span-3">
              <div>
                <label htmlFor="flyer-start" className="mb-1 block text-xs text-gray-600">Start</label>
                <input id="flyer-start" type="time" value={options.startTime} onChange={(e) => set("startTime", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="flyer-end" className="mb-1 block text-xs text-gray-600">End</label>
                <input id="flyer-end" type="time" value={options.endTime} onChange={(e) => set("endTime", e.target.value)} className={inputCls} />
              </div>
            </div>
            {timeProblem && <p className="col-span-3 text-xs text-red-600">{timeProblem}</p>}
          </div>

          <div>
            <label htmlFor="flyer-text" className="mb-1.5 block font-medium text-gray-700">Short message (optional)</label>
            <textarea id="flyer-text" rows={2} value={options.customText} maxLength={FLYER_LIMITS.customText}
              onChange={(e) => setOptions((p) => ({ ...p, customText: e.target.value.slice(0, FLYER_LIMITS.customText) }))}
              onBlur={() => setOptions((p) => sanitizeFlyerOptions(p))}
              placeholder="Refreshments served. Park on Elm St."
              className={inputCls} />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="mb-1 font-medium text-gray-700">Show</legend>
            {([
              ["showDescription", "Listing description"],
              ["showFeatures", "Feature list"],
              ["showAgentPhoto", "My headshot"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-gray-700">
                <input type="checkbox" checked={options[key]} onChange={(e) => set(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 font-medium text-gray-700">QR code opens</legend>
            <label className="flex items-start gap-2 text-gray-700">
              <input type="radio" name="flyer-qr" checked={options.qrTarget === "listing"} onChange={() => set("qrTarget", "listing")} className="mt-1" />
              <span>The listing page <span className="block text-xs text-gray-500">Inquiries from it are tagged &ldquo;flyer&rdquo;.</span></span>
            </label>
            <label className="mt-1 flex items-start gap-2 text-gray-700">
              <input type="radio" name="flyer-qr" checked={options.qrTarget === "signin"} onChange={() => set("qrTarget", "signin")} className="mt-1" />
              <span>The open-house sign-in page <span className="block text-xs text-gray-500">For visitors at the door.</span></span>
            </label>
            {qrUrl && <p className="mt-2 break-all text-[11px] text-gray-500">Opens: {qrUrl}</p>}
            <p className="mt-1 text-[11px] text-gray-500">
              A scan only opens the page. Nobody is identified or added as a lead unless they submit a form.
            </p>
          </fieldset>

          <button
            type="button"
            onClick={() => setOptions(DEFAULT_FLYER_OPTIONS)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
          </button>
          <p className="text-[11px] text-gray-500">
            Photos, price and details come from your saved listing. Edit the listing to change them.
          </p>
        </div>

        {/* Preview */}
        <div className="flex flex-1 justify-center print:block">
          {error ? (
            <div className="mt-16 h-fit rounded-lg bg-white px-4 py-3 text-sm print:hidden">
              <p className="text-red-600">{error}</p>
              <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-2 text-xs font-medium text-gray-700 underline">
                Try again
              </button>
            </div>
          ) : !data ? (
            <div className="mt-16 flex items-center gap-2 text-sm text-white print:hidden">
              <Loader2 className="h-4 w-4 animate-spin" />
              Building your flyer…
            </div>
          ) : (
            // On screen: a scaled-down preview sized for the viewport. In print: natural size.
            <div className="h-[calc(11in*0.4)] w-[calc(8.5in*0.4)] flex-none sm:h-[calc(11in*0.7)] sm:w-[calc(8.5in*0.7)] print:h-auto print:w-auto">
              <div className="origin-top-left scale-[0.4] shadow-2xl sm:scale-[0.7] print:scale-100 print:shadow-none">
                <OpenHouseFlyer data={data} options={options} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
