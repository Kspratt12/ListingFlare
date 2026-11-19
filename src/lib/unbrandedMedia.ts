// Media addresses for the unbranded property page.
//
// Uploaded files live at <supabase>/storage/v1/object/public/listing-photos/<account id>/..., and the
// account id leads to the agent's public page (/agent/<id>). So the unbranded page never shows those
// addresses: photos and the floor-plan image are served through
// /listing/<id>/unbranded/media/<kind>/<n>, which only ever fetches this project's own storage.
// Uploaded videos are not shown on the unbranded page (streaming them through the server is not
// supported); third-party virtual tour embeds still are.

export type UnbrandedMediaKind = "photo" | "floorplan";

export function unbrandedMediaPath(listingId: string, kind: UnbrandedMediaKind, index = 0): string {
  return `/listing/${encodeURIComponent(listingId)}/unbranded/media/${kind}/${index}`;
}

// True only for public files in this project's Supabase storage (prevents the media route from being
// used to fetch arbitrary URLs).
export function isOwnStorageUrl(src: unknown, supabaseUrl: string | undefined): src is string {
  if (typeof src !== "string" || !supabaseUrl) return false;
  try {
    const base = new URL(supabaseUrl);
    const u = new URL(src);
    return u.origin === base.origin && u.pathname.startsWith("/storage/v1/object/public/") && !u.pathname.includes("..");
  } catch {
    return false;
  }
}
