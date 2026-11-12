// Ambiguous zero values and the review-before-publish check.
//
// The database stores beds, baths and sqft as NOT NULL DEFAULT 0, so a blank form field and a real zero are
// stored the same way. Stored data is never rewritten here; only what is DISPLAYED changes.
//
// Display rules (public page, directory, seller pages, page metadata):
//   - baths and sqft: shown only when greater than 0 (a property cannot have 0 square feet).
//   - beds: shown when greater than 0. A stored 0 is shown ("0 bed") only when the agent also entered a bath
//     count or square footage, because then a stated zero is plausibly real (for example a studio). When
//     all three are blank, nothing about beds, baths or size is shown: that is how land, commercial and
//     other non-residential listings look.
//   - We do not label anything "Studio": zero does not always mean studio, and it does not always mean unknown.
//   - year built and lot size: shown only when provided.

export interface RawFacts {
  beds?: number | null;
  baths?: number | null;
  sqft?: number | null;
  yearBuilt?: number | null;
  lotSize?: string | null;
}

export interface Facts {
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  lotSize: string | null;
}

const pos = (n: number | null | undefined): number | null => (typeof n === "number" && n > 0 ? n : null);

export function visibleFacts(l: RawFacts): Facts {
  const baths = pos(l.baths);
  const sqft = pos(l.sqft);
  const beds = pos(l.beds) ?? (l.beds === 0 && (baths !== null || sqft !== null) ? 0 : null);
  const lot = typeof l.lotSize === "string" ? l.lotSize.trim() : "";
  return { beds, baths, sqft, yearBuilt: pos(l.yearBuilt), lotSize: lot || null };
}

// "3 bed · 2 bath · 1,800 sqft", leaving out anything not provided. Empty string when nothing is shown.
export function factsLine(
  l: RawFacts,
  sep = " · ",
  labels: { beds: string; baths: string; sqft: string } = { beds: "bed", baths: "bath", sqft: "sqft" }
): string {
  const f = visibleFacts(l);
  const parts: string[] = [];
  if (f.beds !== null) parts.push(`${f.beds} ${labels.beds}`);
  if (f.baths !== null) parts.push(`${f.baths} ${labels.baths}`);
  if (f.sqft !== null) parts.push(`${f.sqft.toLocaleString("en-US")} ${labels.sqft}`);
  return parts.join(sep);
}

// Non-blocking "review before you publish" notes. Nothing here is ever a requirement.
export interface PublishGapInput {
  photoCount: number;
  beds: string;
  baths: string;
  sqft: string;
}
export function publishGaps(i: PublishGapInput): string[] {
  const gaps: string[] = [];
  if (i.photoCount === 0) gaps.push("No photos yet. Visitors will see a plain dark header instead of a photo.");
  const blank = (s: string) => !s || !s.trim() || Number(s.replace(/,/g, "")) === 0;
  if (blank(i.beds) && blank(i.baths) && blank(i.sqft)) {
    gaps.push("Bedrooms, bathrooms and square feet are blank, so none of them will be shown. That is fine for land, commercial or other properties where they do not apply.");
  }
  return gaps;
}
