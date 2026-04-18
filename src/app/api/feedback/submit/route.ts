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
    const { token, rating, notes, interestLevel } = await req.json();

    if (!token || !rating) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = getAdminClient();

    const { data: feedback } = await db
      .from("showing_feedback")
      .select("id, agent_id, lead_id, submitted_at")
      .eq("token", token)
      .single();

    if (!feedback) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (feedback.submitted_at) {
      return NextResponse.json({ ok: true, alreadySubmitted: true });
    }

    await db
      .from("showing_feedback")
      .update({
        rating,
        notes: notes || "",
        interest_level: interestLevel || null,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", feedback.id);

    // Add the feedback as an inbound message on the lead thread, so agent sees it
    if (feedback.lead_id) {
      const body = `⭐ Showing feedback: ${rating}/5${interestLevel ? ` · ${interestLevel.replace(/_/g, " ")}` : ""}${notes ? `\n\n"${notes}"` : ""}`;
      await db.from("messages").insert({
        lead_id: feedback.lead_id,
        agent_id: feedback.agent_id,
        direction: "inbound",
        subject: "Showing feedback",
        body,
      });
      // Mark lead unread so agent notices
      await db.from("leads").update({ is_read: false }).eq("id", feedback.lead_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback submit error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
