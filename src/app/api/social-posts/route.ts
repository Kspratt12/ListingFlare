import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/formatters";

export const dynamic = "force-dynamic";

// Returns listing + agent data for client-side image generation
export async function POST(req: NextRequest) {
  try {
    const { listingId } = await req.json();
    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("agent_id", user.id)
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: agent } = await supabase
      .from("agent_profiles")
      .select("name, phone, brokerage")
      .eq("id", user.id)
      .single();

    const photos = (listing.photos as { src: string; alt: string }[]) || [];

    return NextResponse.json({
      heroUrl: photos[0]?.src || "",
      price: listing.price ? `$${Number(listing.price).toLocaleString("en-US")}` : "",
      street: listing.street,
      cityState: `${listing.city}, ${listing.state} ${listing.zip}`,
      details: `${listing.beds} Bed | ${listing.baths} Bath | ${Number(listing.sqft).toLocaleString()} Sq Ft`,
      agentName: agent?.name || "",
      agentPhone: agent?.phone ? formatPhone(agent.phone) : "",
      brokerage: agent?.brokerage || "",
    });
  } catch (err) {
    console.error("Social post data error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
