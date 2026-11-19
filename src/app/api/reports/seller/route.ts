import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildSellerReport } from "@/lib/sellerReport";
import { nurtureSendsEnabled } from "@/lib/automationFlags";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Seller report for one listing. Only the listing owner can load it. Returns counts with their
// period and definition (lib/sellerReport.ts); no buyer names, contacts or transcripts.
export async function GET(req: NextRequest) {
  const authClient = createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listingId = req.nextUrl.searchParams.get("listingId");
  if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
  const days = Number(req.nextUrl.searchParams.get("days"));
  const periodDays = [7, 14, 30].includes(days) ? days : 7;

  const db = getAdminClient();

  const { data: listing } = await db
    .from("listings")
    .select("id, agent_id, street, city, state, zip, price, beds, baths, sqft, photos, status, view_count, slug, created_at, published_at, ai_chat_enabled")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || listing.agent_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: agent }, { data: leads, error: leadsError }, { data: showings, error: showingsError }] = await Promise.all([
    db
      .from("agent_profiles")
      .select("name, phone, email, brokerage, headshot_url, google_refresh_token, ai_approval_mode")
      .eq("id", listing.agent_id)
      .maybeSingle(),
    // Timestamps only: the report never needs to know who the buyers are.
    db.from("leads").select("created_at").eq("listing_id", listingId),
    db.from("showings").select("status, created_at").eq("listing_id", listingId),
  ]);

  if (leadsError || showingsError) {
    return NextResponse.json({ error: "Couldn't load the activity for this report. Please try again." }, { status: 502 });
  }

  const report = buildSellerReport({
    now: new Date(),
    periodDays,
    listing: { created_at: listing.created_at, published_at: listing.published_at, status: listing.status, view_count: listing.view_count },
    leadCreatedAt: (leads || []).map((l) => l.created_at as string),
    showings: (showings || []) as Array<{ status: string; created_at: string }>,
    automation: {
      aiChatOn: listing.ai_chat_enabled !== false,
      calendarConnected: !!agent?.google_refresh_token,
      followUpEmailsOn: nurtureSendsEnabled(),
      approvalMode: agent?.ai_approval_mode === true,
    },
  });

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
      slug: listing.slug,
      created_at: listing.created_at,
    },
    // Public contact fields only; the calendar token is reduced to a yes/no above and never returned.
    agent: agent
      ? { name: agent.name, phone: agent.phone, email: agent.email, brokerage: agent.brokerage, headshot_url: agent.headshot_url }
      : null,
    report,
  });
}
