import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  PUBLIC_AGENT_COLUMNS,
  type FlyerData,
  type FlyerListing,
  type PublicAgentProfile,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const FLYER_LISTING_COLUMNS =
  "id, slug, street, city, state, zip, price, beds, baths, sqft, year_built, lot_size, description, features, photos, brand_color";

// Returns everything the flyer layout needs for one of the signed-in agent's
// own listings. Uses the cookie-bound client so RLS applies, and the agent
// half is restricted to PUBLIC_AGENT_COLUMNS (never tokens or Stripe IDs).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [listingRes, agentRes] = await Promise.all([
    supabase
      .from("listings")
      .select(FLYER_LISTING_COLUMNS)
      .eq("id", params.id)
      .eq("agent_id", user.id)
      .single(),
    supabase
      .from("agent_profiles")
      .select(PUBLIC_AGENT_COLUMNS)
      .eq("id", user.id)
      .single(),
  ]);

  if (!listingRes.data) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (!agentRes.data) {
    return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
  }

  const listing = listingRes.data as unknown as FlyerListing;
  const agent = agentRes.data as unknown as PublicAgentProfile;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
  const listingUrl = `${appUrl}/listing/${listing.slug || listing.id}`;
  const qrDataUrl = await QRCode.toDataURL(listingUrl, {
    width: 240,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const body: FlyerData = { listing, agent, listingUrl, qrDataUrl };
  return NextResponse.json(body);
}
