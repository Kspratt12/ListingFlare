import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // cache for 1 hour

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const db = getAdminClient();

    // Aggregate totals - safe, anonymous numbers only
    const [leadsResult, showingsResult, listingsResult] = await Promise.all([
      db.from("leads").select("id", { count: "exact", head: true }),
      db.from("showings").select("id", { count: "exact", head: true }),
      db
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
    ]);

    return NextResponse.json({
      leads: leadsResult.count || 0,
      showings: showingsResult.count || 0,
      listings: listingsResult.count || 0,
    });
  } catch (err) {
    console.error("Public stats error:", err);
    return NextResponse.json({ leads: 0, showings: 0, listings: 0 });
  }
}
