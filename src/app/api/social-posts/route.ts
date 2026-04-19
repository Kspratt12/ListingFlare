import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscriptionGate";
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

    // Paywall: Social Media Pack is a paid feature. The client-side UI
    // already gates it, but a trial user could POST directly from devtools
    // — enforce on the server too so the price isn't honor-system.
    if (!(await hasActiveSubscription(user.id))) {
      return NextResponse.json(
        { error: "Subscription required to generate Social Media Pack." },
        { status: 402 }
      );
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
      .select("name, phone, brokerage, brand_color, handle")
      .eq("id", user.id)
      .single();

    const photos = (listing.photos as { src: string; alt: string }[]) || [];
    const features = Array.isArray(listing.features) ? listing.features.slice(0, 4) : [];

    // Build the public listing URL so carousel CTA slides can show
    // where buyers should go. Handle-subdomain if set; fall back to
    // path URL on the main domain.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
    const listingPath = listing.slug ? `/listing/${listing.slug}` : `/listing/${listing.id}`;
    const publicUrl = agent?.handle
      ? `https://${agent.handle}.listingflare.com${listingPath}`
      : `${appUrl}${listingPath}`;

    return NextResponse.json({
      heroUrl: photos[0]?.src || "",
      photos: photos.slice(0, 4).map((p) => p.src),
      price: listing.price ? `$${Number(listing.price).toLocaleString("en-US")}` : "",
      priceRaw: Number(listing.price) || 0,
      street: listing.street,
      city: listing.city,
      state: listing.state,
      zip: listing.zip,
      cityState: `${listing.city}, ${listing.state} ${listing.zip}`,
      beds: Number(listing.beds) || 0,
      baths: Number(listing.baths) || 0,
      sqft: Number(listing.sqft) || 0,
      details: [
        Number(listing.beds) > 0 ? `${listing.beds} Bed` : null,
        Number(listing.baths) > 0 ? `${listing.baths} Bath` : null,
        Number(listing.sqft) > 0 ? `${Number(listing.sqft).toLocaleString()} Sq Ft` : null,
      ].filter(Boolean).join(" | "),
      features,
      agentName: agent?.name || "",
      agentPhone: agent?.phone ? formatPhone(agent.phone) : "",
      brokerage: agent?.brokerage || "",
      brandColor: listing.brand_color || agent?.brand_color || "#b8965a",
      publicUrl,
      description: listing.description || "",
    });
  } catch (err) {
    console.error("Social post data error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
