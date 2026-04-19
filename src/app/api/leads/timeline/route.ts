import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authClient = createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = req.nextUrl.searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "Missing leadId" }, { status: 400 });

  // Verify agent owns this lead
  const { data: lead } = await authClient
    .from("leads")
    .select("id, agent_id, name, status, created_at, first_response_at, listing_id")
    .eq("id", leadId)
    .single();
  if (!lead || lead.agent_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: messages }, { data: followUps }, { data: showings }, { data: feedback }] = await Promise.all([
    authClient
      .from("messages")
      .select("id, direction, body, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true }),
    authClient
      .from("follow_ups")
      .select("id, day_number, status, scheduled_at, sent_at")
      .eq("lead_id", leadId)
      .order("scheduled_at", { ascending: true }),
    authClient
      .from("showings")
      .select("id, showing_date, showing_time, status, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true }),
    authClient
      .from("showing_feedback")
      .select("id, rating, interest_level, submitted_at")
      .eq("lead_id", leadId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: true }),
  ]);

  type Event = {
    id: string;
    type: "inquiry" | "ai_reply" | "agent_reply" | "inbound_reply" | "follow_up_sent" | "follow_up_scheduled" | "showing_booked" | "feedback";
    title: string;
    subtitle?: string;
    at: string;
  };

  const events: Event[] = [];

  // Initial inquiry
  events.push({
    id: `inquiry-${lead.id}`,
    type: "inquiry",
    title: `${lead.name} submitted an inquiry`,
    at: lead.created_at,
  });

  // Messages (first outbound = auto-reply)
  const outbounds = (messages || []).filter((m) => m.direction === "outbound");
  if (outbounds.length > 0) {
    const first = outbounds[0];
    const elapsed = Math.round(
      (new Date(first.created_at).getTime() - new Date(lead.created_at).getTime()) / 1000
    );
    events.push({
      id: `ai-${first.id}`,
      type: "ai_reply",
      title: `AI auto-replied in ${elapsed < 60 ? `${elapsed}s` : `${Math.round(elapsed / 60)}m`}`,
      subtitle: first.body.slice(0, 60),
      at: first.created_at,
    });
    for (const m of outbounds.slice(1)) {
      events.push({
        id: `out-${m.id}`,
        type: "agent_reply",
        title: `You replied`,
        subtitle: m.body.slice(0, 60),
        at: m.created_at,
      });
    }
  }

  // Inbound messages
  for (const m of (messages || []).filter((m) => m.direction === "inbound")) {
    events.push({
      id: `in-${m.id}`,
      type: "inbound_reply",
      title: `${lead.name} replied`,
      subtitle: m.body.slice(0, 60),
      at: m.created_at,
    });
  }

  // Follow-ups
  for (const f of followUps || []) {
    if (f.status === "sent" && f.sent_at) {
      events.push({
        id: `fu-${f.id}`,
        type: "follow_up_sent",
        title: `Day-${f.day_number} follow-up sent`,
        at: f.sent_at,
      });
    }
  }

  // Showings
  for (const s of showings || []) {
    events.push({
      id: `sh-${s.id}`,
      type: "showing_booked",
      title: `Showing booked for ${s.showing_date} at ${s.showing_time}`,
      subtitle: s.status !== "confirmed" ? `Status: ${s.status}` : undefined,
      at: s.created_at,
    });
  }

  // Feedback
  for (const f of feedback || []) {
    const parts: string[] = [];
    if (f.rating) parts.push(`${f.rating}/5 stars`);
    if (f.interest_level) parts.push(f.interest_level.replace(/_/g, " "));
    events.push({
      id: `fb-${f.id}`,
      type: "feedback",
      title: `Feedback received`,
      subtitle: parts.join(" - "),
      at: f.submitted_at as string,
    });
  }

  // Sort chronologically
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return NextResponse.json({ events });
}
