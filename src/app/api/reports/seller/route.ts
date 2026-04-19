import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Returns aggregated stats for a seller report. Called from the /reports/[listingId] page.
// Auth'd - only the listing owner can see it.
export async function GET(req: NextRequest) {
  const authClient = createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

  const db = getAdminClient();

  // Verify ownership
  const { data: listing } = await db
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (!listing || listing.agent_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: agent } = await db
    .from("agent_profiles")
    .select("name, phone, email, brokerage, headshot_url")
    .eq("id", listing.agent_id)
    .single();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: leadsThisWeek }, { count: leadsTotal }, { count: showingsTotal }, { data: recentLeads }] = await Promise.all([
    db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .gte("created_at", sevenDaysAgo),
    db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId),
    db
      .from("showings")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId),
    db
      .from("leads")
      .select("id, name, created_at, status")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Views aren't per-week tracked, so we derive a weekly estimate from listing age
  const createdAt = new Date(listing.created_at);
  const weeksActive = Math.max(1, Math.ceil((Date.now() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  const avgViewsPerWeek = Math.round((listing.view_count || 0) / weeksActive);

  return NextResponse.json({
    listing: {
      id: listing.id,
      street: listing.street,
      city: listing.city,
      state: listing.state,
      zip: listing.zip,
      price: listing.price,
      beds: listing.beds,
      baths: listing.baths,
      sqft: listing.sqft,
      photos: listing.photos,
      status: listing.status,
      view_count: listing.view_count || 0,
      slug: listing.slug,
      created_at: listing.created_at,
    },
    agent: agent || null,
    stats: {
      totalViews: listing.view_count || 0,
      avgViewsPerWeek,
      leadsThisWeek: leadsThisWeek || 0,
      leadsTotal: leadsTotal || 0,
      showingsTotal: showingsTotal || 0,
      recentLeadCount: (recentLeads || []).length,
    },
  });
}
