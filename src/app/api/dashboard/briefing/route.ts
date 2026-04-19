import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateHotScore } from "@/lib/hotScore";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Parallel fetches
  const [
    { data: agent },
    { data: overnightLeads },
    { data: todayShowings },
    { data: allLeads },
    { data: unreadCount },
  ] = await Promise.all([
    authClient.from("agent_profiles").select("name, ai_approval_mode").eq("id", user.id).single(),
    authClient
      .from("leads")
      .select("id")
      .eq("agent_id", user.id)
      .gte("created_at", yesterday),
    authClient
      .from("showings")
      .select("id, showing_date, showing_time, name, listing:listings(street)")
      .eq("agent_id", user.id)
      .eq("status", "confirmed")
      .eq("showing_date", today)
      .order("showing_time", { ascending: true }),
    authClient
      .from("leads")
      .select("id, name, status, phone, message, created_at, auto_reply_draft, first_response_at, is_read, listing:listings(street)")
      .eq("agent_id", user.id)
      .not("status", "in", "(closed,lost,under_contract)")
      .order("created_at", { ascending: false })
      .limit(50),
    authClient
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", user.id)
      .eq("is_read", false),
  ]);

  // Find hottest lead
  let hottestLead: {
    id: string;
    name: string;
    score: number;
    tier: string;
    reasons: string[];
    listing: string | null;
  } | null = null;
  let hottestScore = -1;

  for (const lead of allLeads || []) {
    const listingData = Array.isArray(lead.listing) ? lead.listing[0] : lead.listing;
    const score = calculateHotScore({
      lead: {
        status: lead.status,
        phone: lead.phone || "",
        message: lead.message || "",
        created_at: lead.created_at,
        auto_reply_draft: lead.auto_reply_draft,
        first_response_at: lead.first_response_at,
        is_read: lead.is_read,
      },
    });
    if (score.score > hottestScore) {
      hottestScore = score.score;
      hottestLead = {
        id: lead.id,
        name: lead.name,
        score: score.score,
        tier: score.tier,
        reasons: score.reasons,
        listing: listingData?.street || null,
      };
    }
  }

  // Return agent's first name. Greeting text is computed client-side using browser time zone.
  const firstName = agent?.name?.split(" ")[0] || "there";
  const aiApprovalMode = agent?.ai_approval_mode === true;

  return NextResponse.json({
    firstName,
    aiApprovalMode,
    overnightLeads: (overnightLeads || []).length,
    todayShowings: (todayShowings || []).map((s) => {
      const listing = Array.isArray(s.listing) ? s.listing[0] : s.listing;
      return {
        id: s.id,
        time: s.showing_time,
        name: s.name,
        address: listing?.street || "Property",
      };
    }),
    unreadLeads: unreadCount?.length || 0,
    hottestLead,
  });
}
