import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { escapeHtml } from "@/lib/escapeHtml";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

interface AgentStats {
  agentId: string;
  agentName: string;
  agentEmail: string;
  leadsCount: number;
  chatLeadsCount: number;
  showingsCount: number;
  commissionTotal: number;
  commissionCount: number;
}

// GET /api/cron/monthly-roi - fires on 1st of each month (chained from
// the daily follow-ups cron). Sends every paying agent a summary email
// of the previous month's activity so they feel the ROI of their
// subscription and are less likely to cancel.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  }

  const db = getAdminClient();

  // Time range: previous calendar month
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startIso = firstOfLastMonth.toISOString();
  const endIso = firstOfThisMonth.toISOString();
  const monthName = firstOfLastMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Pull all active agents
  const { data: agents } = await db
    .from("agent_profiles")
    .select("id, name, email, subscription_status")
    .in("subscription_status", ["active", "trialing"]);

  if (!agents || agents.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, reason: "No active agents" });
  }

  // Gather stats per agent in parallel
  const statsPromises: Promise<AgentStats | null>[] = agents.map(async (agent) => {
    if (!agent.email) return null;

    const [leadsRes, showingsRes, chatsRes, commissionsRes] = await Promise.all([
      db.from("leads").select("id", { count: "exact", head: true })
        .eq("agent_id", agent.id).gte("created_at", startIso).lt("created_at", endIso),
      db.from("showings").select("id", { count: "exact", head: true })
        .eq("agent_id", agent.id).gte("created_at", startIso).lt("created_at", endIso),
      db.from("leads").select("id", { count: "exact", head: true })
        .eq("agent_id", agent.id).gte("created_at", startIso).lt("created_at", endIso)
        .like("message", "[Chat]%"),
      db.from("commissions").select("amount").eq("agent_id", agent.id)
        .gte("created_at", startIso).lt("created_at", endIso),
    ]);

    const commissionsTotal = (commissionsRes.data || [])
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    return {
      agentId: agent.id,
      agentName: agent.name || "there",
      agentEmail: agent.email,
      leadsCount: leadsRes.count || 0,
      chatLeadsCount: chatsRes.count || 0,
      showingsCount: showingsRes.count || 0,
      commissionTotal: commissionsTotal,
      commissionCount: (commissionsRes.data || []).length,
    };
  });

  const allStats = (await Promise.all(statsPromises)).filter((s): s is AgentStats => s != null);

  // Send an email to each agent (but skip if zero activity - feels bad)
  let sent = 0;
  await Promise.all(
    allStats.map(async (stats) => {
      if (stats.leadsCount === 0 && stats.showingsCount === 0) return;

      const hoursSaved = Math.max(1, Math.round(stats.chatLeadsCount * 0.4 + stats.leadsCount * 0.1));
      const safeName = escapeHtml(stats.agentName.split(" ")[0]);

      const html = `
        <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 28px 36px; border-radius: 14px 14px 0 0;">
            <h1 style="color: #b8965a; margin: 0; font-size: 22px;">ListingFlare</h1>
            <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Your ${escapeHtml(monthName)} summary</p>
          </div>
          <div style="background: #ffffff; padding: 32px 36px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 14px 14px;">
            <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px;">Hey ${safeName},</h2>
            <p style="color: #4b5563; margin: 0 0 24px; font-size: 15px; line-height: 1.7;">
              Here's what ListingFlare did for you in ${escapeHtml(monthName)}.
            </p>

            <table style="width: 100%; border-collapse: separate; border-spacing: 0 10px;">
              <tr>
                <td style="background: #f9fafb; padding: 18px 20px; border-radius: 10px;">
                  <p style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">${stats.leadsCount}</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Leads Captured</p>
                </td>
              </tr>
              <tr>
                <td style="background: #f9fafb; padding: 18px 20px; border-radius: 10px;">
                  <p style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">${stats.showingsCount}</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Showings Booked (auto-confirmed)</p>
                </td>
              </tr>
              <tr>
                <td style="background: #f9fafb; padding: 18px 20px; border-radius: 10px;">
                  <p style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">${stats.chatLeadsCount}</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Buyers Captured Through AI Chat</p>
                </td>
              </tr>
              ${stats.commissionCount > 0 ? `
              <tr>
                <td style="background: linear-gradient(to right, #fef3c7, #fde68a); padding: 18px 20px; border-radius: 10px;">
                  <p style="margin: 0; font-size: 28px; font-weight: 700; color: #78350f;">$${stats.commissionTotal.toLocaleString()}</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">In commissions logged this month (${stats.commissionCount} ${stats.commissionCount === 1 ? "deal" : "deals"})</p>
                </td>
              </tr>
              ` : ""}
              <tr>
                <td style="background: #f0fdf4; padding: 18px 20px; border-radius: 10px;">
                  <p style="margin: 0; font-size: 28px; font-weight: 700; color: #166534;">~${hoursSaved} hrs</p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #15803d; text-transform: uppercase; letter-spacing: 1px;">Saved By AI Answering Buyer Questions</p>
                </td>
              </tr>
            </table>

            <p style="color: #6b7280; margin: 28px 0 0; font-size: 14px; line-height: 1.6;">
              Every lead, showing, and conversation above was captured while you were doing something else. That's the job.
            </p>

            <div style="margin-top: 24px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com"}/dashboard" style="display: inline-block; background: #b8965a; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Open Dashboard
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 11px; margin: 32px 0 0; text-align: center;">
              You're receiving this because you're a ListingFlare subscriber. We send one summary per month.
            </p>
          </div>
        </div>
      `;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "ListingFlare <hello@listingflare.com>",
            to: stats.agentEmail,
            subject: `Your ${monthName} summary: ${stats.leadsCount} leads captured`,
            html,
          }),
        });
        if (res.ok) sent += 1;
      } catch (err) {
        console.error("Monthly ROI send error:", err);
      }
    })
  );

  return NextResponse.json({ ok: true, processed: allStats.length, sent });
}
