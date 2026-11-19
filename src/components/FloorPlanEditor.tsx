"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  FLOOR_PLAN_LIMITS,
  checkDimensions,
  floorPlanFileProblem,
  newMarkerId,
  nudge,
  resolveMarkerPhoto,
  toNormalized,
  type FloorPlan,
} from "@/lib/floorPlan";

interface Props {
  value: FloorPlan | null;
  onChange: (next: FloorPlan | null) => void;
  photos: Array<{ src: string; alt?: string }>;
}

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// Floor plan editor for the listing form. Upload one image, click it to add a room marker, drag or use
// the arrow keys to move the selected marker, name it, and link it to one of the listing's photos.
// Changes are saved with the rest of the listing ("Save Changes").
export default function FloorPlanEditor({ value, onChange, photos }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  const markers = value?.markers || [];
  const selected = markers.find((m) => m.id === selectedId) || null;
  const update = (id: string, patch: Partial<FloorPlan["markers"][number]>) =>
    value && onChange({ ...value, markers: value.markers.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  const handleFile = async (file: File | undefined) => {
    setError("");
    if (!file) return;
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const problem = floorPlanFileProblem(file, head);
    if (problem) return setError(problem);
    const dims = await readDimensions(file);
    const dimProblem = checkDimensions(dims.width, dims.height);
    if (dimProblem) return setError(dimProblem);
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again to upload.");
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/floor-plan-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type });
      if (upErr) throw new Error("The upload failed. Please try again.");
      const { data: { publicUrl } } = supabase.storage.from("listing-photos").getPublicUrl(path);
      // Keep existing markers when replacing the image; they use normalized positions.
      onChange({ image: { src: publicUrl, width: dims.width, height: dims.height, alt: "Floor plan" }, markers: value?.markers || [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addAt = (clientX: number, clientY: number) => {
    if (!value || !areaRef.current) return;
    if (markers.length >= FLOOR_PLAN_LIMITS.markers) return setError(`A floor plan can have up to ${FLOOR_PLAN_LIMITS.markers} markers.`);
    const { x, y } = toNormalized(clientX, clientY, areaRef.current.getBoundingClientRect());
    const id = newMarkerId();
    onChange({ ...value, markers: [...markers, { id, label: `Room ${markers.length + 1}`, x, y, photoSrc: null }] });
    setSelectedId(id);
  };

  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6" aria-labelledby="floor-plan-editor-heading">
      <h2 id="floor-plan-editor-heading" className="font-serif text-lg font-semibold text-gray-900">Interactive floor plan (optional)</h2>
      <p className="mt-1 text-sm text-gray-500">
        Upload a floor plan image, then click on it to drop a marker for each room and link the room to one of your photos.
        Buyers tap a marker to see the photo. This uses your own image; it doesn&apos;t measure or draw plans.
      </p>

      <input
        ref={fileRef}
        id="floor-plan-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="floor-plan-file" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-brand-400">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {value ? "Replace floor plan image" : "Upload floor plan image"}
        </label>
        {value && (
          <button type="button" onClick={() => { onChange(null); setSelectedId(null); }} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Remove floor plan
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">JPG, PNG or WebP, up to 10 MB.</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      {value && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div>
            <div
              ref={areaRef}
              className="relative w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
              style={{ aspectRatio: `${value.image.width} / ${value.image.height}` }}
              onClick={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "IMG") addAt(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!dragId.current || !areaRef.current) return;
                update(dragId.current, toNormalized(e.clientX, e.clientY, areaRef.current.getBoundingClientRect()));
              }}
              onPointerUp={() => { dragId.current = null; }}
              onPointerLeave={() => { dragId.current = null; }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value.image.src} alt="Floor plan being edited" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
              {markers.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  aria-label={`Marker ${i + 1}: ${m.label}. Arrow keys move it.`}
                  aria-pressed={m.id === selectedId}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(m.id); }}
                  onPointerDown={(e) => { e.stopPropagation(); dragId.current = m.id; setSelectedId(m.id); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
                  onKeyDown={(e) => {
                    const n = nudge(m, e.key, e.shiftKey);
                    if (n) { e.preventDefault(); update(m.id, n); }
                    if (e.key === "Delete" || e.key === "Backspace") {
                      e.preventDefault();
                      onChange({ ...value, markers: markers.filter((x) => x.id !== m.id) });
                      setSelectedId(null);
                    }
                  }}
                  className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400 ${m.id === selectedId ? "border-brand-400 bg-brand-500 text-white" : "border-white bg-gray-950 text-white"}`}
                  style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {markers.length === 0 ? "Click on the plan to add your first room marker." : "Click to add a marker. Drag a marker, or select it and use the arrow keys (Shift for bigger steps), to move it."}
            </p>
          </div>

          <div>
            {selected ? (
              <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                <div>
                  <label htmlFor="floor-plan-marker-label" className="mb-1 block text-xs font-medium text-gray-600">Room name</label>
                  <input id="floor-plan-marker-label" type="text" value={selected.label} maxLength={FLOOR_PLAN_LIMITS.label} onChange={(e) => update(selected.id, { label: e.target.value })} className={input} />
                </div>
                <div>
                  <label htmlFor="floor-plan-marker-photo" className="mb-1 block text-xs font-medium text-gray-600">Photo</label>
                  <select id="floor-plan-marker-photo" value={selected.photoSrc || ""} onChange={(e) => update(selected.id, { photoSrc: e.target.value || null })} className={input}>
                    <option value="">No photo</option>
                    {photos.map((p, i) => <option key={p.src} value={p.src}>{`Photo ${i + 1}${p.alt && !/^Generating/.test(p.alt) ? `: ${p.alt.slice(0, 40)}` : ""}`}</option>)}
                    {selected.photoSrc && !resolveMarkerPhoto(selected, photos) && <option value={selected.photoSrc}>Removed photo (no longer on this listing)</option>}
                  </select>
                  {selected.photoSrc && resolveMarkerPhoto(selected, photos) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.photoSrc} alt="" className="mt-2 h-24 w-full rounded object-cover" />
                  )}
                </div>
                <button type="button" onClick={() => { onChange({ ...value, markers: markers.filter((x) => x.id !== selected.id) }); setSelectedId(null); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline">
                  <Trash2 className="h-3.5 w-3.5" /> Delete marker
                </button>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">Select a marker to name it and choose its photo.</p>
            )}
            {markers.length > 0 && (
              <ol className="mt-3 space-y-1 text-xs text-gray-700">
                {markers.map((m, i) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setSelectedId(m.id)} className={`text-left hover:underline ${m.id === selectedId ? "font-semibold" : ""}`}>
                      {i + 1}. {m.label}{m.photoSrc && !resolveMarkerPhoto(m, photos) ? " (photo removed)" : ""}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
