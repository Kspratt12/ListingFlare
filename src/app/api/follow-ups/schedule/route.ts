import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Drip schedule: day offsets from lead creation
const INQUIRY_SEQUENCE = [
  { day: 1, subject: "Still interested?" },
  { day: 3, subject: "Similar homes you might like" },
  { day: 7, subject: "Quick check-in" },
];

const SHOWING_SEQUENCE = [
  { day: 1, subject: "How was the showing?" },
  { day: 3, subject: "Thinking about making an offer?" },
  { day: 7, subject: "Any questions about the property?" },
];

export async function POST(req: NextRequest) {
  try {
    const { leadId, listingId, agentId, sequenceType = "inquiry" } = await req.json();

    if (!leadId || !listingId || !agentId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = getAdminClient();

    // Check if follow-ups already exist for this lead
    const { data: existing } = await db
      .from("follow_ups")
      .select("id")
      .eq("lead_id", leadId)
      .eq("sequence_type", sequenceType)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, message: "Sequence already exists" });
    }

    const sequence = sequenceType === "showing" ? SHOWING_SEQUENCE : INQUIRY_SEQUENCE;
    const now = new Date();

    const followUps = sequence.map((step) => {
      const scheduledAt = new Date(now);
      scheduledAt.setDate(scheduledAt.getDate() + step.day);
      // Schedule for 10 AM local time
      scheduledAt.setHours(10, 0, 0, 0);

      return {
        lead_id: leadId,
        agent_id: agentId,
        listing_id: listingId,
        day_number: step.day,
        sequence_type: sequenceType,
        subject: step.subject,
        body: "", // Generated at send time by AI
        status: "pending",
        scheduled_at: scheduledAt.toISOString(),
      };
    });

    const { error: insertErr } = await db.from("follow_ups").insert(followUps);

    if (insertErr) {
      console.error("Follow-up schedule error:", insertErr);
      return NextResponse.json({ error: "Failed to schedule" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, scheduled: followUps.length });
  } catch (err) {
    console.error("Follow-up schedule error:", err);
    return NextResponse.json({ error: "Failed to schedule" }, { status: 500 });
  }
}
