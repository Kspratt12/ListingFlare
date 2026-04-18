import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Industry average response time (published research): ~47 minutes for first response
const INDUSTRY_AVG_SECONDS = 47 * 60;

export async function GET() {
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch leads with their first response time (if tracked)
  const { data: leads } = await authClient
    .from("leads")
    .select("id, created_at, first_response_at")
    .eq("agent_id", user.id)
    .not("first_response_at", "is", null);

  // Fallback: compute from earliest outbound message per lead
  const { data: messages } = await authClient
    .from("messages")
    .select("lead_id, created_at, lead:leads(created_at, agent_id)")
    .eq("agent_id", user.id)
    .eq("direction", "outbound")
    .order("created_at", { ascending: true });

  // Map lead_id -> earliest outbound timestamp
  const firstByLead = new Map<string, string>();
  for (const m of messages || []) {
    if (!firstByLead.has(m.lead_id)) firstByLead.set(m.lead_id, m.created_at);
  }

  // Build response times array
  const responseTimes: number[] = [];
  for (const l of leads || []) {
    if (l.first_response_at) {
      const diff = (new Date(l.first_response_at).getTime() - new Date(l.created_at).getTime()) / 1000;
      if (diff >= 0 && diff < 60 * 60 * 24 * 30) responseTimes.push(diff);
    }
  }
  for (const m of messages || []) {
    const lead = Array.isArray(m.lead) ? m.lead[0] : m.lead;
    if (!lead) continue;
    const diff = (new Date(m.created_at).getTime() - new Date(lead.created_at).getTime()) / 1000;
    if (diff >= 0 && diff < 60 * 60 * 24 * 30 && !leads?.some((l) => l.id === m.lead_id)) {
      responseTimes.push(diff);
    }
  }

  if (responseTimes.length === 0) {
    return NextResponse.json({
      avgSeconds: null,
      industryAvgSeconds: INDUSTRY_AVG_SECONDS,
      count: 0,
    });
  }

  const avgSeconds = Math.round(
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
  );

  return NextResponse.json({
    avgSeconds,
    industryAvgSeconds: INDUSTRY_AVG_SECONDS,
    count: responseTimes.length,
    fastestSeconds: Math.round(Math.min(...responseTimes)),
  });
}
