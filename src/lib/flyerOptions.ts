// Customization for the printable listing flyer (components/OpenHouseFlyer.tsx).
//
// A controlled set of choices: three layouts, a short color palette (or the listing's own brand
// color), an editable headline / date / time / short message, and what the QR code opens.
// Not a free-form design tool.
//
// QR codes: a scan opens a page. It does NOT identify anyone and is never counted as a lead. The
// listing link carries ?src=flyer so that IF a visitor later submits an inquiry, that lead's source
// shows "flyer" (lib/detectSource.ts).

export type FlyerLayout = "classic" | "modern" | "minimal";
export type QrTarget = "listing" | "signin";

export const FLYER_LAYOUTS: Array<{ id: FlyerLayout; label: string; description: string }> = [
  { id: "classic", label: "Classic", description: "Full-width photo, photo strip, agent bar" },
  { id: "modern", label: "Modern", description: "Color header band, two-column details" },
  { id: "minimal", label: "Minimal", description: "White space, one photo, large type" },
];

export const FLYER_COLORS = ["#b8965a", "#0f172a", "#1e3a8a", "#065f46", "#9f1239", "#6d28d9"] as const;

export const HEADLINE_PRESETS = ["Open House", "Just Listed", "Price Improved", "Coming Soon", "Under Contract"] as const;

export const FLYER_LIMITS = { headline: 40, customText: 220 } as const;

export interface FlyerOptions {
  layout: FlyerLayout;
  // null = use the listing's (or agent's) brand color
  accent: string | null;
  headline: string;
  // YYYY-MM-DD, "" when not set
  eventDate: string;
  // HH:MM 24h, "" when not set
  startTime: string;
  endTime: string;
  // Short optional message, e.g. "Refreshments served"
  customText: string;
  showDescription: boolean;
  showFeatures: boolean;
  showAgentPhoto: boolean;
  qrTarget: QrTarget;
}

export const DEFAULT_FLYER_OPTIONS: FlyerOptions = {
  layout: "classic",
  accent: null,
  headline: "Open House",
  eventDate: "",
  startTime: "",
  endTime: "",
  customText: "",
  showDescription: true,
  showFeatures: true,
  showAgentPhoto: true,
  qrTarget: "listing",
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export function sanitizeFlyerOptions(input: unknown): FlyerOptions {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_FLYER_OPTIONS;
  const validDate = (v: unknown) => {
    if (typeof v !== "string" || !DATE.test(v)) return "";
    const [y, m, day] = v.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, day));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === day ? v : "";
  };
  return {
    layout: FLYER_LAYOUTS.some((l) => l.id === o.layout) ? (o.layout as FlyerLayout) : d.layout,
    accent: typeof o.accent === "string" && HEX.test(o.accent) ? o.accent : null,
    headline: typeof o.headline === "string" ? text(o.headline, FLYER_LIMITS.headline) : d.headline,
    eventDate: validDate(o.eventDate),
    startTime: typeof o.startTime === "string" && TIME.test(o.startTime) ? o.startTime : "",
    endTime: typeof o.endTime === "string" && TIME.test(o.endTime) ? o.endTime : "",
    customText: text(o.customText, FLYER_LIMITS.customText),
    showDescription: typeof o.showDescription === "boolean" ? o.showDescription : d.showDescription,
    showFeatures: typeof o.showFeatures === "boolean" ? o.showFeatures : d.showFeatures,
    showAgentPhoto: typeof o.showAgentPhoto === "boolean" ? o.showAgentPhoto : d.showAgentPhoto,
    qrTarget: o.qrTarget === "signin" ? "signin" : "listing",
  };
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// "Saturday, October 25 · 1 – 4 PM". Built from the typed date and times as written: no time-zone
// conversion, because the agent means the property's local time.
export function formatEventLabel(o: Pick<FlyerOptions, "eventDate" | "startTime" | "endTime">): string | null {
  const parts: string[] = [];
  if (o.eventDate) {
    const [y, m, d] = o.eventDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    parts.push(dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }));
  }
  if (o.startTime && o.endTime) {
    const s = formatTime(o.startTime);
    const e = formatTime(o.endTime);
    const sameHalf = s.slice(-2) === e.slice(-2);
    parts.push(`${sameHalf ? s.slice(0, -3) : s} – ${e}`);
  } else if (o.startTime) {
    parts.push(`from ${formatTime(o.startTime)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function timeRangeProblem(o: Pick<FlyerOptions, "startTime" | "endTime">): string | null {
  if (o.startTime && o.endTime && o.endTime <= o.startTime) return "End time should be after the start time.";
  return null;
}

export function qrDestination(appUrl: string, listing: { id: string; slug?: string | null }, target: QrTarget): string {
  const base = appUrl.replace(/\/+$/, "");
  if (target === "signin") return `${base}/open-house/${listing.id}`;
  return `${base}/listing/${listing.slug || listing.id}?src=flyer`;
}

export const QR_CAPTIONS: Record<QrTarget, string> = {
  listing: "Scan for photos & details",
  signin: "Scan to sign in",
};

export function flyerStorageKey(listingId: string): string {
  return `lf_flyer_options_${listingId}`;
}
