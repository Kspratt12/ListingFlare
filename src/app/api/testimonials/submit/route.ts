import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { token, authorName, rating, quote, consentToPublish } = await req.json();

    if (!token || !quote) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = getAdminClient();

    const { data: existing } = await db
      .from("testimonials")
      .select("id, submitted_at")
      .eq("token", token)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (existing.submitted_at) {
      return NextResponse.json({ ok: true, alreadySubmitted: true });
    }

    await db
      .from("testimonials")
      .update({
        author_name: authorName || "Anonymous",
        rating: rating || null,
        quote,
        approved: consentToPublish === true,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Testimonial submit error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
