import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { internalHeaders } from "@/lib/internalAuth";
import { processShowingResponse, type ResponseDeps, type ShowingRow } from "@/lib/showingResponse";
import { addGoogleEvent } from "@/lib/showingCalendar";

export const dynamic = "force-dynamic";

// POST { showingId, action: "confirm" | "decline" }. The agent is the signed-in
// user; the decisions live in src/lib/showingResponse.ts (tested with fakes).
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { showingId?: unknown; action?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
    const resendKey = process.env.RESEND_API_KEY;

    const deps: ResponseDeps = {
      now: () => new Date(),
      emailEnabled: Boolean(resendKey),
      store: {
        async getShowing(id) {
          const { data } = await db
            .from("showings")
            .select("id, agent_id, listing_id, lead_id, showing_date, showing_time, name, email, phone, message, status")
            .eq("id", id)
            .maybeSingle();
          return (data as ShowingRow | null) ?? null;
        },
        async hasConfirmedConflict(listingId, date, time, excludeId) {
          const { data } = await db
            .from("showings")
            .select("id")
            .eq("listing_id", listingId)
            .eq("showing_date", date)
            .eq("showing_time", time)
            .eq("status", "confirmed")
            .neq("id", excludeId)
            .limit(1);
          return (data ?? []).length > 0;
        },
        async transitionFromRequested(id, to, at) {
          const { data } = await db
            .from("showings")
            .update({ status: to, responded_at: at })
            .eq("id", id)
            .eq("status", "requested")
            .select("id");
          return (data ?? []).length === 1;
        },
        async updateLead(leadId, fields) {
          await db.from("leads").update(fields).eq("id", leadId);
        },
        async getListing(listingId) {
          const { data } = await db.from("listings").select("street, city, state").eq("id", listingId).maybeSingle();
          return data ?? null;
        },
        async getAgent(agentId) {
          const { data } = await db.from("agent_profiles").select("name, phone, email").eq("id", agentId).maybeSingle();
          return data ?? null;
        },
      },
      async sendEmail(msg) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify(msg),
        });
        if (!res.ok) throw new Error(`Resend responded ${res.status}`);
      },
      addGoogleEvent: (agentId, e) => addGoogleEvent(db, agentId, e),
      enrollShowingFollowUps(leadId, listingId, agentId) {
        fetch(`${appUrl}/api/follow-ups/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...internalHeaders() },
          body: JSON.stringify({ leadId, listingId, agentId, sequenceType: "showing" }),
        }).catch((err) => console.error("Follow-up schedule error:", err));
      },
    };

    const result = await processShowingResponse({ agentId: user.id, showingId: body.showingId, action: body.action }, deps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error("Showing response error:", err);
    return NextResponse.json({ error: "Failed to update showing" }, { status: 500 });
  }
}
