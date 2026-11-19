import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildSellerReport } from "@/lib/sellerReport";
import { FALLBACK_TIMEZONE, checkEligibility, renderReportEmail, reportPeriod, SKIP_REASON_LABELS, type Cadence } from "@/lib/sellerReportSchedule";
import { loadActivity, loadSendContext } from "@/lib/sellerReportStore";
import { nurtureSendsEnabled } from "@/lib/automationFlags";
import { isValidTimeZone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// The exact email a scheduled report would send right now, for the owner to review. Sends nothing.
export async function GET(req: NextRequest) {
  const { data: { user } } = await createServerSupabaseClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const listingId = req.nextUrl.searchParams.get("listingId");
  const cadenceParam = req.nextUrl.searchParams.get("cadence");
  const cadence: Cadence = cadenceParam === "biweekly" || cadenceParam === "monthly" ? cadenceParam : "weekly";
  const tzParam = req.nextUrl.searchParams.get("timezone");
  if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: listing } = await db.from("listings").select("id, agent_id").eq("id", listingId).maybeSingle();
  if (!listing || listing.agent_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: portal } = await db.from("seller_portals").select("id").eq("listing_id", listingId).eq("agent_id", user.id).eq("active", true).maybeSingle();

  const context = await loadSendContext(db, { listing_id: listingId, agent_id: user.id, seller_portal_id: (portal as { id: string } | null)?.id ?? null });
  const eligibility = checkEligibility({ enabled: true, seller_portal_id: (portal as { id: string } | null)?.id ?? null }, context);
  if (!eligibility.ok) return NextResponse.json({ error: SKIP_REASON_LABELS[eligibility.reason], reason: eligibility.reason }, { status: 409 });

  const agentTz = (context.agent as { timezone?: string | null } | null)?.timezone;
  const tz = isValidTimeZone(tzParam) ? tzParam : isValidTimeZone(agentTz) ? agentTz : FALLBACK_TIMEZONE;
  const now = new Date();
  const { start, days } = reportPeriod(now, cadence);
  const activity = await loadActivity(db, listingId);
  const l = context.listing!;
  const a = context.agent!;
  const report = buildSellerReport({
    now,
    periodDays: days,
    listing: { created_at: l.created_at, published_at: l.published_at, status: l.status, view_count: l.view_count },
    leadCreatedAt: activity.leadCreatedAt,
    showings: activity.showings,
    automation: { aiChatOn: l.ai_chat_enabled !== false, calendarConnected: !!a.google_refresh_token, followUpEmailsOn: nurtureSendsEnabled(), approvalMode: a.ai_approval_mode === true },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
  const includeLink = req.nextUrl.searchParams.get("portalLink") !== "0";
  const email = renderReportEmail({
    report, context, tz, periodStart: start, periodEnd: now,
    portalUrl: includeLink && context.portal?.access_token ? `${appUrl}/seller/${context.portal.access_token}` : null,
  });
  return NextResponse.json({ to: email.to, replyTo: email.replyTo, subject: email.subject, html: email.html, text: email.text, timezone: tz });
}
