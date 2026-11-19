// Listing status rules used by the editor.
//
// "Save Changes" must keep the listing's current status. (Before this, saving a Coming Soon,
// Pending or Closed listing silently turned it back into a draft, which took the public page down.)

export const LISTING_STATUSES = ["draft", "coming_soon", "published", "pending", "closed", "archived"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Draft",
  coming_soon: "Coming Soon",
  published: "Published",
  pending: "Pending",
  closed: "Closed / Sold",
  archived: "Archived",
};

export function isListingStatus(s: unknown): s is ListingStatus {
  return typeof s === "string" && (LISTING_STATUSES as readonly string[]).includes(s);
}

export function statusForSaveChanges(current: unknown): ListingStatus {
  return isListingStatus(current) ? current : "draft";
}

// Visitors can open the page for these statuses; draft and archived are owner-preview only.
export function isVisitorVisible(status: unknown): boolean {
  return isListingStatus(status) && status !== "draft" && status !== "archived";
}

// A Supabase update that matches no row (wrong id, or row-level security) returns no error.
// Treat "no row came back" as a failed save so the editor never claims a save that did not happen.
export function updateWasApplied(result: { error: unknown; data: unknown }): boolean {
  return !result.error && Array.isArray(result.data) && result.data.length > 0;
}
