import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { reEngageEmail } from "@/lib/trialEmails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-shot re-engagement blast to existing trial signups. Sends the
// "here's everything we shipped since you joined" email to every agent
// who hasn't been re-engaged yet. Tracks the send timestamp so running
// this twice doesn't double-send.
//
// Usage: POST with Authorization: Bearer $CRON_SECRET. Example:
//   curl -X POST https://listingflare.com/api/trial/re-engage \
//     -H "Authorization: Bearer $CRON_SECRET"
//
// Query params:
//   ?dryRun=1   return the agent list without sending
//   ?limit=20   throttle to N sends (Resend default limit is 10/sec)

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 200);

  const db = getAdminClient();

  // Trial users who haven't already been re-engaged. Safe to run any
  // number of times — rows with trial_reengage_sent_at set are skipped.
  const { data: agents, error } = await db
    .from("agent_profiles")
    .select("id, email, name, trial_reengage_sent_at")
    .is("trial_reengage_sent_at", null)
    .in("subscription_status", ["trialing", "canceled", "unpaid", "past_due"])
    .not("email", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Re-engage query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!agents || agents.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, message: "Nobody to re-engage" });
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      candidates: agents.length,
      list: agents.map((a) => ({ id: a.id, email: a.email, name: a.name })),
    });
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "Kelvin from ListingFlare <kelvin@listingflare.com>";

  let sent = 0;
  let failed = 0;
  const errors: Array<{ id: string; reason: string }> = [];

  for (const agent of agents) {
    try {
      if (!agent.email) continue;
      const firstName = (agent.name || "").split(" ")[0] || "";
      const email = reEngageEmail({ firstName });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: agent.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          reply_to: "kelvin@listingflare.com",
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        failed += 1;
        errors.push({ id: agent.id, reason: `${res.status} ${body.slice(0, 120)}` });
        continue;
      }

      await db
        .from("agent_profiles")
        .update({ trial_reengage_sent_at: new Date().toISOString() })
        .eq("id", agent.id);
      sent += 1;

      // Light throttle so we stay well under Resend's 10/sec cap.
      await new Promise((r) => setTimeout(r, 120));
    } catch (err) {
      failed += 1;
      errors.push({ id: agent.id, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ sent, failed, errors: errors.slice(0, 20) });
}
