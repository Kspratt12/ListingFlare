import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing env vars", hasUrl: !!url, hasKey: !!key });
  }

  const db = createClient(url, key);

  // Try to read a listing
  const { data: listing, error: readError } = await db
    .from("listings")
    .select("id, view_count")
    .limit(1)
    .single();

  if (readError) {
    return NextResponse.json({ error: "Read failed", details: readError.message });
  }

  // Try to increment
  const { error: updateError } = await db
    .from("listings")
    .update({ view_count: (listing.view_count || 0) + 1 })
    .eq("id", listing.id);

  if (updateError) {
    return NextResponse.json({ error: "Update failed", details: updateError.message, listing });
  }

  // Read again
  const { data: after } = await db
    .from("listings")
    .select("view_count")
    .eq("id", listing.id)
    .single();

  return NextResponse.json({
    success: true,
    listingId: listing.id,
    before: listing.view_count,
    after: after?.view_count,
  });
}
