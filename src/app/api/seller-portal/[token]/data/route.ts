import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const db = getAdminClient();

    // Look up the portal and verify it's active
    const { data: portal } = await db
      .from("seller_portals")
      .select("id, listing_id, agent_id, seller_name, active")
      .eq("access_token", token)
      .eq("active", true)
      .maybeSingle();

    if (!portal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Bump visit counter async (don't block response)
    db.from("seller_portals")
      .update({
        last_visited_at: new Date().toISOString(),
        visit_count: 0,
      })
      .eq("id", portal.id)
      .then(() => {
        // Use RPC for atomic increment instead - but simpler approach:
        // just increment with a select-then-update-style pattern via SQL
      });

    // Atomic-ish increment: fetch current count, add 1
    const { data: currentPortal } = await db
      .from("seller_portals")
      .select("visit_count")
      .eq("id", portal.id)
      .single();
    await db
      .from("seller_portals")
      .update({
        visit_count: (currentPortal?.visit_count || 0) + 1,
        last_visited_at: new Date().toISOString(),
      })
      .eq("id", portal.id);

    // Fetch listing + agent + stats in parallel
    const [listingRes, agentRes, leadsRes, showingsRes, chatLeadsRes] = await Promise.all([
      db
        .from("listings")
        .select("id, street, city, state, zip, price, beds, baths, sqft, photos, status, view_count, slug, created_at, published_at")
        .eq("id", portal.listing_id)
        .single(),
      db
        .from("agent_profiles")
        .select("name, email, phone, brokerage, headshot_url")
        .eq("id", portal.agent_id)
        .single(),
      db
        .from("leads")
        .select("id, created_at, status", { count: "exact" })
        .eq("listing_id", portal.listing_id)
        .order("created_at", { ascending: false }),
      db
        .from("showings")
        .select("id, showing_date, showing_time, status, created_at", { count: "exact" })
        .eq("listing_id", portal.listing_id)
        .order("showing_date", { ascending: false }),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", portal.listing_id)
        .like("message", "[Chat]%"),
    ]);

    const listing = listingRes.data;
    const agent = agentRes.data;

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const leads = leadsRes.data || [];
    const showings = showingsRes.data || [];
    const chatCount = chatLeadsRes.count || 0;

    // Activity timeline: anonymized, last 10 events
    const now = Date.now();
    const activity: Array<{ type: string; when: string; label: string }> = [];

    for (const lead of leads.slice(0, 10)) {
      activity.push({
        type: "lead",
        when: lead.created_at,
        label: "New buyer inquiry",
      });
    }
    for (const showing of showings.slice(0, 10)) {
      activity.push({
        type: "showing",
        when: showing.created_at,
        label: `Showing scheduled for ${new Date(showing.showing_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${showing.showing_time}`,
      });
    }
    activity.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

    // Days on market
    const startDate = listing.published_at || listing.created_at;
    const daysOnMarket = startDate
      ? Math.max(0, Math.floor((now - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Upcoming showings (future only)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = showings
      .filter((s) => new Date(s.showing_date + "T12:00:00") >= today)
      .slice(0, 5);

    return NextResponse.json({
      ok: true,
      sellerName: portal.seller_name,
      listing: {
        id: listing.id,
        slug: listing.slug,
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
      },
      agent: agent
        ? {
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            brokerage: agent.brokerage,
            headshotUrl: agent.headshot_url,
          }
        : null,
      stats: {
        views: listing.view_count || 0,
        leads: leadsRes.count || 0,
        showings: showingsRes.count || 0,
        chats: chatCount,
        daysOnMarket,
      },
      activity: activity.slice(0, 10),
      upcomingShowings: upcoming.map((s) => ({
        date: s.showing_date,
        time: s.showing_time,
      })),
    });
  } catch (err) {
    console.error("Seller portal data error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
