// The agent's own "site": their profile page (/agent/[handle-or-id]) and the optional
// "More listings from this agent" section on each of their property pages.
//
// Only ONE agent's listings are ever shown (always filtered by agent_id on the server). This is
// not a marketplace and never mixes in other ListingFlare users' homes.
//
// Visibility rules:
//  - draft and archived listings are never shown to visitors
//  - "More listings" shows the agent's active homes: published, coming soon, pending
//  - the profile page also shows sold (closed) homes in a separate "Recently sold" group
//  - nothing is shown for an agent whose trial ended without a subscription (same rule as the
//    listing page, lib/listingVisibility.ts)
//  - "More listings" is opt-in per agent (agent_profiles.show_other_listings, migration 045,
//    default off) because some agents want a property page to tell one home's story

export const ACTIVE_LISTING_STATUSES = ["published", "coming_soon", "pending"] as const;
export const PROFILE_LISTING_STATUSES = [...ACTIVE_LISTING_STATUSES, "closed"] as const;
export const OTHER_LISTINGS_LIMIT = 6;

export interface SiteListing {
  id: string;
  slug?: string | null;
  status: string;
  street: string;
  city: string;
  state: string;
  zip?: string | null;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  photos: Array<{ src: string; alt?: string }> | null;
}

export const SITE_LISTING_COLUMNS = "id, slug, status, street, city, state, zip, price, beds, baths, sqft, photos, agent_id, created_at";

const ACTIVE = new Set<string>(ACTIVE_LISTING_STATUSES);

export function listingPath(l: { slug?: string | null; id: string }): string {
  return `/listing/${l.slug || l.id}`;
}

export function agentProfilePath(a: { handle?: string | null; id: string }): string {
  return `/agent/${a.handle || a.id}`;
}

export function statusBadge(status: string): string | null {
  if (status === "coming_soon") return "Coming soon";
  if (status === "pending") return "Pending";
  if (status === "closed") return "Sold";
  return null;
}

// Defensive second filter on top of the query: active statuses only, never the current listing,
// never the same id twice, at most `limit` items, in the order given (newest first from the query).
export function selectOtherListings<T extends SiteListing & { agent_id?: string }>(
  rows: T[] | null | undefined,
  opts: { currentListingId: string; agentId: string; limit?: number }
): T[] {
  const seen = new Set<string>([opts.currentListingId]);
  const out: T[] = [];
  for (const r of rows || []) {
    if (!r || seen.has(r.id)) continue;
    if (r.agent_id !== undefined && r.agent_id !== opts.agentId) continue;
    if (!ACTIVE.has(r.status)) continue;
    seen.add(r.id);
    out.push(r);
    if (out.length >= (opts.limit ?? OTHER_LISTINGS_LIMIT)) break;
  }
  return out;
}

// Splits the profile page's rows into active and recently sold groups, dropping anything else.
export function groupProfileListings<T extends SiteListing>(rows: T[] | null | undefined): { active: T[]; sold: T[] } {
  const active: T[] = [];
  const sold: T[] = [];
  for (const r of rows || []) {
    if (ACTIVE.has(r.status)) active.push(r);
    else if (r.status === "closed" && sold.length < 6) sold.push(r);
  }
  return { active, sold };
}
