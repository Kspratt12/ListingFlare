"use client";

import { useEffect, useState } from "react";
import { X, ImageOff } from "lucide-react";
import { resolveMarkerPhoto, sanitizeFloorPlan, type FloorPlan } from "@/lib/floorPlan";

interface Props {
  floorPlan: FloorPlan | null | undefined;
  photos: Array<{ src: string; alt?: string }>;
}

// Public interactive floor plan. Markers are real buttons (keyboard and screen-reader reachable);
// the room list underneath is the plain fallback that works without pointing at the image.
export default function FloorPlanViewer({ floorPlan, photos }: Props) {
  const plan = sanitizeFloorPlan(floorPlan);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  if (!plan) return null;
  const open = plan.markers.find((m) => m.id === openId) || null;
  const openPhoto = open ? resolveMarkerPhoto(open, photos) : null;

  return (
    <section className="bg-white py-14 md:py-20" aria-labelledby="floor-plan-heading">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 id="floor-plan-heading" className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">Floor plan</h2>
        {plan.markers.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">Tap a room marker to see a photo of that room.</p>
        )}
        <div className="relative mt-6 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50" style={{ aspectRatio: `${plan.image.width} / ${plan.image.height}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plan.image.src} alt={plan.image.alt} className="absolute inset-0 h-full w-full object-contain" loading="lazy" />
          {plan.markers.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpenId(m.id)}
              aria-label={`${m.label}: show photo`}
              aria-haspopup="dialog"
              className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gray-950 text-xs font-bold text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {plan.markers.length > 0 && (
          <ol className="mt-4 grid gap-x-6 gap-y-1 text-sm text-gray-700 sm:grid-cols-2 md:grid-cols-3">
            {plan.markers.map((m, i) => (
              <li key={m.id}>
                <button type="button" onClick={() => setOpenId(m.id)} className="text-left hover:underline">
                  <span className="mr-1 font-semibold">{i + 1}.</span>
                  {m.label}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={open.label} onClick={() => setOpenId(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="font-medium text-gray-900">{open.label}</p>
              <button type="button" onClick={() => setOpenId(null)} aria-label="Close" autoFocus className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {openPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={openPhoto.src} alt={openPhoto.alt || open.label} className="max-h-[70vh] w-full bg-gray-100 object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 bg-gray-50 px-6 py-16 text-sm text-gray-500">
                <ImageOff className="h-8 w-8" />
                {open.photoSrc ? "Photo no longer available." : "No photo for this room yet."}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
