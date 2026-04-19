import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { sendListingAlert } from "@/lib/sendListingAlert";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_EVENTS = ["reduced", "increased", "pending", "sold", "relisted"] as const;
type AlertEvent = typeof VALID_EVENTS[number];

export async function POST(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { listingId, event, oldPrice, newPrice } = await req.json();

    if (!listingId || !event || !VALID_EVENTS.includes(event)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getAdminClient();
    const { data: listing } = await db
      .from("listings")
      .select("id, agent_id, street, city, state, slug")
      .eq("id", listingId)
      .single();

    if (!listing || listing.agent_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: agent } = await db
      .from("agent_profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
    const listingUrl = `${appUrl}/listing/${listing.slug || listing.id}`;
    const listingAddress = `${listing.street}, ${listing.city}, ${listing.state}`;

    // Fire in the background - don't block the response
    sendListingAlert({
      listingId: listing.id,
      event: event as AlertEvent,
      oldPrice: typeof oldPrice === "number" ? oldPrice : null,
      newPrice: typeof newPrice === "number" ? newPrice : 0,
      listingAddress,
      listingUrl,
      agentName: agent?.name || null,
    }).catch((err) => console.error("Alert fire error:", err));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Fire alerts error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
