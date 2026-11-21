// Colour presets and text helpers for the template customizer. No imports, so the customizer UI can use
// them without loading the PDF library.

// Colour presets offered in the customizer. "navy" is the published default.
export const BAND_COLORS = [
  { id: "navy", name: "Navy", rgb: [15, 23, 42] },
  { id: "charcoal", name: "Charcoal", rgb: [38, 38, 38] },
  { id: "forest", name: "Forest green", rgb: [20, 83, 45] },
  { id: "burgundy", name: "Burgundy", rgb: [127, 29, 29] },
  { id: "royal", name: "Royal blue", rgb: [30, 64, 175] },
  { id: "teal", name: "Teal", rgb: [17, 94, 89] },
  { id: "plum", name: "Plum", rgb: [88, 28, 135] },
]
export const ACCENT_COLORS = [
  { id: "gold", name: "Gold", rgb: [184, 150, 90] },
  { id: "silver", name: "Silver", rgb: [170, 176, 186] },
  { id: "sky", name: "Sky blue", rgb: [56, 189, 248] },
  { id: "coral", name: "Coral", rgb: [248, 113, 113] },
  { id: "none", name: "No stripe", rgb: null },
]

// Templates that are printed and filled in by hand have no fillable version.
export const PRINT_ONLY = new Set(["open-house-sign-in-sheet-template", "open-house-checklist-template", "pre-listing-checklist-template"])

const DEFAULT_THEME = { band: [15, 23, 42], accent: [184, 150, 90], label: [190, 175, 140], title: [255, 255, 255], subtitle: [200, 205, 215], heading: [30, 30, 40] }

const clamp = (n) => Math.max(0, Math.min(255, Math.round(Number(n) || 0)))
const isRgb = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(Number(n)))
const luminance = ([r, g, b]) => {
  const ch = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

/** Resolves a partial theme { band, accent } into every colour the PDF needs, keeping text readable on the band. */
export function resolveTheme(theme) {
  if (!theme) return DEFAULT_THEME
  const band = isRgb(theme.band) ? theme.band.map(clamp) : DEFAULT_THEME.band
  const accent = theme.accent === null ? null : isRgb(theme.accent) ? theme.accent.map(clamp) : DEFAULT_THEME.accent
  const light = luminance(band) > 0.45
  return {
    band,
    accent,
    label: light ? [80, 80, 90] : [205, 205, 215],
    title: light ? [17, 24, 39] : [255, 255, 255],
    subtitle: light ? [55, 60, 70] : [215, 220, 230],
    // Section headings take the band colour when it is dark enough to read on white.
    heading: luminance(band) < 0.25 ? band : [30, 30, 40],
  }
}

/** Plain text the built-in PDF font can draw (Latin-1), trimmed and capped. */
export function cleanText(v, max) {
  return String(v || "").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").replace(/\s+/g, " ").trim().slice(0, max)
}

/** "Prepared by Name · Brokerage · contact", or "" when nothing was entered. */
export function brandingLine(branding) {
  if (!branding) return ""
  const parts = [cleanText(branding.name, 60), cleanText(branding.brokerage, 60), cleanText(branding.contact, 60)].filter(Boolean)
  return parts.length ? "Prepared by " + parts.join("  ·  ") : ""
}



/**
 * Flyer colours. The flyer prints white text on the band, so a light band is darkened until white text stays
 * readable. The accent is darkened if needed so small labels on white stay legible, and it is always shown (labels and bullets use it); "soft" is the accent lightened for small text
 * on the band.
 */
export function flyerColors(theme) {
  if (!theme) return { band: [15, 23, 42], accent: [184, 150, 90], soft: [190, 175, 140] }
  let band = isRgb(theme.band) ? theme.band.map(clamp) : [15, 23, 42]
  for (let i = 0; i < 20 && luminance(band) > 0.12; i++) band = band.map((c) => Math.round(c * 0.85))
  let accent = isRgb(theme.accent) ? theme.accent.map(clamp) : [184, 150, 90]
  // The accent also colours small labels on white, so pale picks are darkened until they stay legible.
  for (let i = 0; i < 20 && luminance(accent) > 0.3; i++) accent = accent.map((c) => Math.round(c * 0.9))
  const soft = accent.map((c) => Math.round(c + (255 - c) * 0.3))
  return { band, accent, soft }
}
