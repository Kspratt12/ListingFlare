// Server-only data loading shared by the public listing page (page.tsx) and the unbranded
// property page (unbranded/page.tsx). Not a route: Next.js only treats page/route/layout files as routes.
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { PUBLIC_AGENT_COLUMNS, type PublicAgentProfile } from "@/lib/types";
import { sanitizeFloorPlan, type FloorPlan } from "@/lib/floorPlan";
import { ACTIVE_LISTING_STATUSES, SITE_LISTING_COLUMNS, OTHER_LISTINGS_LIMIT, selectOtherListings, type SiteListing } from "@/lib/agentSite";

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (url: string | URL | Request, init?: RequestInit) =>
          fetch(url, { ...init, cache: "no-store" }),
      },
    }
  );
}

// Everything the public listing page renders. Deliberately excludes
// updated_at and anything not shown to visitors.
export const LISTING_PAGE_COLUMNS =
  "id, agent_id, status, launch_date, video_intro_url, brand_color, slug, street, city, state, zip, price, beds, baths, sqft, year_built, lot_size, description, features, photos, videos, virtual_tour_url, view_count, created_at, price_history, mls_id, county, subdivision, architectural_style, property_subtype, stories, parking_spaces, property_tax_annual, hoa_required, hoa_fee_monthly, heating_type, cooling_type, water_source, sewer_type, roof_type, construction_material, foundation_type, appliances_included, school_elementary, school_middle, school_high, parcel_number, fireplace_count, laundry_location, basement_type, published_at, ai_chat_enabled, comparable_sales, co_agent_name, co_agent_title, co_agent_brokerage, co_agent_license, co_agent_phone, co_agent_email, co_agent_headshot_url";

export const isUUIDFormat = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// One lookup per request, shared by generateMetadata and the page itself
// (React cache() dedupes it), instead of each running its own queries.
// UUID links try the id first and fall back to the slug.
export const getListingRow = cache(async (idOrSlug: string) => {
  const db = getAdminClient();
  if (isUUIDFormat(idOrSlug)) {
    const { data } = await db.from("listings").select(LISTING_PAGE_COLUMNS).eq("id", idOrSlug).single();
    if (data) return data;
  }
  const { data } = await db.from("listings").select(LISTING_PAGE_COLUMNS).eq("slug", idOrSlug).single();
  return data;
});

export async function getPublicAgent(agentId: string): Promise<PublicAgentProfile | null> {
  const { data } = await getAdminClient().from("agent_profiles").select(PUBLIC_AGENT_COLUMNS).eq("id", agentId).single();
  return (data as unknown as PublicAgentProfile) ?? null;
}

// The agent's "More listings" opt-in. Read on its own so a database without migration 045
// simply behaves as "off" instead of breaking the page.
export async function agentShowsOtherListings(agentId: string): Promise<boolean> {
  try {
    const { data, error } = await getAdminClient()
      .from("agent_profiles")
      .select("show_other_listings")
      .eq("id", agentId)
      .maybeSingle();
    if (error || !data) return false;
    return (data as { show_other_listings?: boolean | null }).show_other_listings === true;
  } catch {
    return false;
  }
}

// The listing's interactive floor plan (migration 048). Read on its own so a database without the
// column just shows no floor plan instead of breaking the page.
export async function loadFloorPlan(listingId: string, photoSrcs: string[]): Promise<FloorPlan | null> {
  try {
    const { data, error } = await getAdminClient().from("listings").select("floor_plan").eq("id", listingId).maybeSingle();
    if (error || !data) return null;
    // Links to photos that are no longer on the listing are cleared here, before reaching the page.
    return sanitizeFloorPlan((data as { floor_plan?: unknown }).floor_plan, photoSrcs);
  } catch {
    return null;
  }
}

export async function loadOtherListings(agentId: string, currentListingId: string): Promise<SiteListing[]> {
  try {
    const { data } = await getAdminClient()
      .from("listings")
      .select(SITE_LISTING_COLUMNS)
      .eq("agent_id", agentId)
      .in("status", [...ACTIVE_LISTING_STATUSES])
      .neq("id", currentListingId)
      .order("created_at", { ascending: false })
      .limit(OTHER_LISTINGS_LIMIT + 1);
    return selectOtherListings((data as unknown as Array<SiteListing & { agent_id: string }>) || [], {
      currentListingId,
      agentId,
    });
  } catch {
    return [];
  }
}
