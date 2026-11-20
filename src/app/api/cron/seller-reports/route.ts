import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isCronAuthorized } from "@/lib/internalAuth";
import { runScheduledReport, sellerReportsEnabled, type ScheduleRow } from "@/lib/sellerReportSchedule";
import { SCHEDULE_COLUMNS, createRunDeps } from "@/lib/sellerReportStore";

export const dynamic = "force-dynamic";

const BATCH = 50;

// Sends seller reports that are due. Called by a scheduler with "Authorization: Bearer <CRON_SECRET>".
// Scheduled hourly by Vercel Cron (vercel.json); Vercel sends CRON_SECRET as the bearer token.
// Fails closed: no CRON_SECRET -> 401; SELLER_REPORTS_ENABLED not "1" -> nothing is read or sent.
// Responses contain counts only, never addresses or report contents.
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sellerReportsEnabled()) {
    return NextResponse.json({ ok: true, paused: true, note: "Seller report sending is off (SELLER_REPORTS_ENABLED is not 1). Nothing was sent." });
  }
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Email is not configured" }, { status: 503 });

  const now = new Date();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await db
    .from("seller_report_schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("enabled", true)
    .lte("next_run_at", now.toISOString())
    .order("next_run_at", { ascending: true })
    .limit(BATCH);
  if (error) return NextResponse.json({ error: "Could not load schedules" }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
  const counts: Record<string, number> = {};
  for (const s of (data || []) as unknown as ScheduleRow[]) {
    let result: string;
    try {
      result = await runScheduledReport(s, createRunDeps(db, now, appUrl));
    } catch {
      result = "error";
    }
    const key = result.startsWith("skipped:") ? "skipped" : result;
    counts[key] = (counts[key] || 0) + 1;
  }
  return NextResponse.json({ ok: true, processed: (data || []).length, counts });
}
