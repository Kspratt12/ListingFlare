import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { welcomeEmail, day3StuckEmail, day12TrialEndingEmail } from "@/lib/trialEmails";

export const dynamic = "force-dynamic";

// Daily trial lifecycle emails, run by the Vercel cron in vercel.json.
//
//   welcome  : signed up in the last 3 days and has not been welcomed yet
//   day 3    : signed up 3 to 7 days ago, still trialing, no listing yet
//   day 12   : still trialing and the trial ends within the next 3 days
//
// Each email records a *_sent_at timestamp, so running this twice never double-sends,
// and the date windows keep old accounts from getting a "welcome" months late.
//
//   ?dryRun=1   list who would be emailed, send nothing
//   ?limit=20   cap sends per type (default 50)

const DAY = 86_400_000;
const FROM = process.env.RESEND_FROM_EMAIL || "Kelvin from ListingFlare <kelvin@listingflare.com>";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

interface Agent {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  trial_welcome_sent_at: string | null;
  trial_day3_sent_at: string | null;
  trial_day12_sent_at: string | null;
}

type Kind = "welcome" | "day3" | "day12";
const SENT_COLUMN: Record<Kind, string> = {
  welcome: "trial_welcome_sent_at",
  day3: "trial_day3_sent_at",
  day12: "trial_day12_sent_at",
};

async function sendEmail(resendKey: string, to: string, mail: { subject: string; html: string; text: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject: mail.subject, html: mail.html, text: mail.text, reply_to: "kelvin@listingflare.com" }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "Resend not configured" }, { status: 500 });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);

  const db = getAdminClient();
  const now = Date.now();
  const cols =
    "id, email, name, created_at, subscription_status, trial_ends_at, trial_welcome_sent_at, trial_day3_sent_at, trial_day12_sent_at";

  const { data, error } = await db
    .from("agent_profiles")
    .select(cols)
    .gte("created_at", new Date(now - 21 * DAY).toISOString())
    .not("email", "is", null)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) {
    console.error("Trial lifecycle query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
  const agents = (data || []) as Agent[];

  // Who gets what.
  const welcome = agents.filter((a) => !a.trial_welcome_sent_at && now - new Date(a.created_at).getTime() < 3 * DAY);
  const dayThreeCandidates = agents.filter((a) => {
    const age = now - new Date(a.created_at).getTime();
    return !a.trial_day3_sent_at && a.subscription_status === "trialing" && age >= 3 * DAY && age < 7 * DAY;
  });
  const dayTwelve = agents.filter((a) => {
    if (a.trial_day12_sent_at || a.subscription_status !== "trialing" || !a.trial_ends_at) return false;
    const left = new Date(a.trial_ends_at).getTime() - now;
    return left > 0 && left <= 3 * DAY;
  });

  // Listing counts: day 3 only goes to people with no listing; day 12 shows the real numbers.
  const needCounts = Array.from(new Set([...dayThreeCandidates, ...dayTwelve].map((a) => a.id)));
  const listingsByAgent = new Map<string, { count: number; views: number; ids: string[] }>();
  if (needCounts.length) {
    const { data: listings } = await db.from("listings").select("id, agent_id, view_count").in("agent_id", needCounts);
    for (const l of listings || []) {
      const row = listingsByAgent.get(l.agent_id) || { count: 0, views: 0, ids: [] };
      row.count += 1;
      row.views += l.view_count || 0;
      row.ids.push(l.id);
      listingsByAgent.set(l.agent_id, row);
    }
  }
  const leadsByAgent = new Map<string, number>();
  if (dayTwelve.length) {
    const { data: leads } = await db.from("leads").select("agent_id").in("agent_id", dayTwelve.map((a) => a.id));
    for (const l of leads || []) leadsByAgent.set(l.agent_id, (leadsByAgent.get(l.agent_id) || 0) + 1);
  }
  const dayThree = dayThreeCandidates.filter((a) => (listingsByAgent.get(a.id)?.count || 0) === 0);

  const plan: Array<{ kind: Kind; agent: Agent }> = [
    ...welcome.slice(0, limit).map((agent) => ({ kind: "welcome" as Kind, agent })),
    ...dayThree.slice(0, limit).map((agent) => ({ kind: "day3" as Kind, agent })),
    ...dayTwelve.slice(0, limit).map((agent) => ({ kind: "day12" as Kind, agent })),
  ];

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      counts: { welcome: welcome.length, day3: dayThree.length, day12: dayTwelve.length },
      list: plan.map((p) => ({ kind: p.kind, id: p.agent.id, email: p.agent.email })),
    });
  }

  let sent = 0;
  const errors: Array<{ id: string; kind: Kind; reason: string }> = [];
  for (const { kind, agent } of plan) {
    try {
      const firstName = (agent.name || "").split(" ")[0] || "";
      const stats = listingsByAgent.get(agent.id);
      const mail =
        kind === "welcome"
          ? welcomeEmail({ firstName })
          : kind === "day3"
            ? day3StuckEmail({ firstName })
            : day12TrialEndingEmail({
                firstName,
                listingCount: stats?.count || 0,
                viewCount: stats?.views || 0,
                leadCount: leadsByAgent.get(agent.id) || 0,
              });
      await sendEmail(resendKey, agent.email as string, mail);
      await db.from("agent_profiles").update({ [SENT_COLUMN[kind]]: new Date().toISOString() }).eq("id", agent.id);
      sent += 1;
      await new Promise((r) => setTimeout(r, 120)); // stay well under Resend's rate limit
    } catch (err) {
      errors.push({ id: agent.id, kind, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return NextResponse.json({ sent, failed: errors.length, errors });
}
