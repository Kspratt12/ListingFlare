// Interactive floor plan: one uploaded floor-plan image with clickable room markers that open listing
// photos. Stored on the listing as `floor_plan` (migration 048). It is public listing content, like
// photos, so it is shown wherever the listing itself is visible.
//
// Coordinates are normalized (0..1 of the image's width and height), so markers stay on the same spot
// at any display size. Markers link to a photo by its src; if that photo is later removed from the
// listing the marker still shows its label, with "Photo no longer available" instead of a broken image.

export const FLOOR_PLAN_LIMITS = { markers: 40, label: 40, maxBytes: 10 * 1024 * 1024, minSide: 200, maxSide: 12000 } as const;
export const FLOOR_PLAN_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export interface FloorPlanMarker {
  id: string;
  label: string;
  x: number;
  y: number;
  photoSrc: string | null;
}

export interface FloorPlan {
  image: { src: string; width: number; height: number; alt: string };
  markers: FloorPlanMarker[];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function isSafeImageUrl(src: unknown): src is string {
  if (typeof src !== "string" || src.length > 2048) return false;
  // Same-site media route used by the unbranded page (lib/unbrandedMedia.ts).
  if (/^\/listing\/[^/?#]+\/unbranded\/media\/(photo|floorplan)\/\d{1,3}$/.test(src)) return true;
  try {
    const u = new URL(src);
    if (u.username || u.password) return false;
    // Plain http is accepted only for loopback (local development storage); everything real is https.
    return u.protocol === "https:" || (u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost"));
  } catch {
    return false;
  }
}

// Validates and normalises a floor plan before it is saved or rendered. Anything malformed is dropped;
// returns null when there is no usable image. photoSrcs (optional) limits links to the listing's photos.
export function sanitizeFloorPlan(input: unknown, photoSrcs?: string[]): FloorPlan | null {
  if (!input || typeof input !== "object") return null;
  const o = input as { image?: Record<string, unknown>; markers?: unknown };
  const img = o.image;
  if (!img || !isSafeImageUrl(img.src)) return null;
  const width = Number(img.width);
  const height = Number(img.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const allowed = photoSrcs ? new Set(photoSrcs) : null;
  const seen = new Set<string>();
  const markers: FloorPlanMarker[] = [];
  for (const m of Array.isArray(o.markers) ? o.markers : []) {
    if (!m || typeof m !== "object" || markers.length >= FLOOR_PLAN_LIMITS.markers) continue;
    const r = m as Record<string, unknown>;
    const id = typeof r.id === "string" && /^[a-z0-9-]{1,40}$/i.test(r.id) && !seen.has(r.id) ? r.id : null;
    const x = Number(r.x);
    const y = Number(r.y);
    if (!id || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    // A cleared name falls back to "Room" so the marker is never silently lost on save.
    const label = (typeof r.label === "string" ? r.label.replace(/\s+/g, " ").trim().slice(0, FLOOR_PLAN_LIMITS.label) : "") || "Room";
    let photoSrc = isSafeImageUrl(r.photoSrc) ? r.photoSrc : null;
    if (photoSrc && allowed && !allowed.has(photoSrc)) photoSrc = null;
    seen.add(id);
    markers.push({ id, label, x: round4(clamp01(x)), y: round4(clamp01(y)), photoSrc });
  }
  return {
    image: { src: img.src as string, width: Math.round(width), height: Math.round(height), alt: typeof img.alt === "string" && img.alt.trim() ? img.alt.trim().slice(0, 120) : "Floor plan" },
    markers,
  };
}

// The photo a marker points to, if it is still on the listing.
export function resolveMarkerPhoto<P extends { src: string }>(marker: FloorPlanMarker, photos: P[] | null | undefined): P | null {
  if (!marker.photoSrc) return null;
  return (photos || []).find((p) => p.src === marker.photoSrc) ?? null;
}

// Converts a pointer position inside the rendered image into normalized coordinates.
export function toNormalized(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0.5, y: 0.5 };
  return { x: round4(clamp01((clientX - rect.left) / rect.width)), y: round4(clamp01((clientY - rect.top) / rect.height)) };
}

// Keyboard nudging for a selected marker (arrow keys): 1% per press, 5% with Shift.
export function nudge(m: Pick<FloorPlanMarker, "x" | "y">, key: string, big: boolean) {
  const step = big ? 0.05 : 0.01;
  const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const v = d[key];
  if (!v) return null;
  return { x: round4(clamp01(m.x + v[0])), y: round4(clamp01(m.y + v[1])) };
}

// File checks done before uploading: declared type, size, then the real format from the first bytes
// (so a renamed file is caught). Image dimensions are checked after decoding (checkDimensions).
export function sniffImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  const ascii = (from: number, to: number) => Array.from(bytes.slice(from, to), (b) => String.fromCharCode(b)).join("");
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export function floorPlanFileProblem(file: { type: string; size: number; name: string }, head: Uint8Array): string | null {
  if (!(FLOOR_PLAN_MIME as readonly string[]).includes((file.type || "").toLowerCase())) return "Use a JPG, PNG or WebP image for the floor plan.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > FLOOR_PLAN_LIMITS.maxBytes) return "The floor plan image must be 10 MB or smaller.";
  const real = sniffImageType(head);
  if (!real) return "That file isn't a valid JPG, PNG or WebP image.";
  return null;
}

export function checkDimensions(width: number, height: number): string | null {
  if (!(width > 0 && height > 0)) return "The image couldn't be read.";
  if (Math.min(width, height) < FLOOR_PLAN_LIMITS.minSide) return "The image is too small to read. Use one at least 200 pixels on each side.";
  if (Math.max(width, height) > FLOOR_PLAN_LIMITS.maxSide) return "The image is too large. Use one under 12,000 pixels on its longest side.";
  return null;
}

export function newMarkerId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
