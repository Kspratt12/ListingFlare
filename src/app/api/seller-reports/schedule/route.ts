import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FALLBACK_TIMEZONE, isValidRecipient, nextRunAfter, sellerReportsEnabled, validateScheduleInput } from "@/lib/sellerReportSchedule";
import { SCHEDULE_COLUMNS } from "@/lib/sellerReportStore";
import { isValidTimeZone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Shared ownership check. Returns the signed-in agent's listing or an error response.
async function ownedListing(listingId: unknown) {
  const { data: { user } } = await createServerSupabaseClient().auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (typeof listingId !== "string" || !listingId) return { error: NextResponse.json({ error: "Missing listingId" }, { status: 400 }) };
  const db = admin();
  const { data: listing } = await db.from("listings").select("id, agent_id, status").eq("id", listingId).maybeSingle();
  if (!listing || listing.agent_id !== user.id) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { db, user, listing };
}

async function activePortal(db: ReturnType<typeof admin>, listingId: string, agentId: string) {
  const { data } = await db
    .from("seller_portals")
    .select("id, seller_name, seller_email, active")
    .eq("listing_id", listingId)
    .eq("agent_id", agentId)
    .eq("active", true)
    .maybeSingle();
  return data as { id: string; seller_name: string | null; seller_email: string | null; active: boolean } | null;
}

async function state(db: ReturnType<typeof admin>, listingId: string, agentId: string) {
  const [sched, portal, agent] = await Promise.all([
    db.from("seller_report_schedules").select(SCHEDULE_COLUMNS).eq("listing_id", listingId).maybeSingle(),
    activePortal(db, listingId, agentId),
    db.from("agent_profiles").select("timezone").eq("id", agentId).maybeSingle(),
  ]);
  if (sched.error) return { unavailable: true as const };
  const schedule = sched.data as { id: string } | null;
  const sends = schedule
    ? (await db.from("seller_report_sends").select("period_start, period_end, status, attempts, last_error, created_at").eq("schedule_id", schedule.id).order("created_at", { ascending: false }).limit(5)).data || []
    : [];
  const agentTz = (agent.data as { timezone?: string | null } | null)?.timezone;
  return {
    schedule,
    sends,
    seller: portal ? { name: portal.seller_name, email: portal.seller_email, emailValid: isValidRecipient(portal.seller_email) } : null,
    sendingEnabled: sellerReportsEnabled(),
    defaultTimezone: isValidTimeZone(agentTz) ? agentTz : FALLBACK_TIMEZONE,
    timezoneIsFallback: !isValidTimeZone(agentTz),
  };
}

export async function GET(req: NextRequest) {
  const o = await ownedListing(req.nextUrl.searchParams.get("listingId"));
  if ("error" in o) return o.error;
  const s = await state(o.db, o.listing.id, o.user.id);
  if ("unavailable" in s) return NextResponse.json({ error: "Scheduled reports need the latest database update (migration 047)." }, { status: 503 });
  return NextResponse.json(s);
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const o = await ownedListing(body.listingId);
  if ("error" in o) return o.error;
  const { data: agent } = await o.db.from("agent_profiles").select("timezone").eq("id", o.user.id).maybeSingle();
  const v = validateScheduleInput(body, (agent as { timezone?: string | null } | null)?.timezone);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const enabled = body.enabled === true;
  const portal = await activePortal(o.db, o.listing.id, o.user.id);
  if (enabled) {
    if (!portal) return NextResponse.json({ error: "Create a seller portal with the seller's email before turning on reports." }, { status: 400 });
    if (!isValidRecipient(portal.seller_email)) return NextResponse.json({ error: "Add a valid seller email to the seller portal first." }, { status: 400 });
    if (o.listing.status === "draft" || o.listing.status === "archived") {
      return NextResponse.json({ error: "Publish the listing before scheduling seller reports." }, { status: 400 });
    }
  }
  const now = new Date();
  const row = {
    listing_id: o.listing.id,
    agent_id: o.user.id,
    seller_portal_id: portal?.id ?? null,
    enabled,
    ...v.value,
    next_run_at: enabled ? nextRunAfter(now, v.value).toISOString() : null,
    paused_reason: enabled ? null : "disabled",
    updated_at: now.toISOString(),
  };
  const { error } = await o.db.from("seller_report_schedules").upsert(row, { onConflict: "listing_id" }).select("id");
  if (error) return NextResponse.json({ error: "Couldn't save the schedule." }, { status: 500 });
  const s = await state(o.db, o.listing.id, o.user.id);
  return NextResponse.json(s);
}

export async function DELETE(req: NextRequest) {
  const o = await ownedListing(req.nextUrl.searchParams.get("listingId"));
  if ("error" in o) return o.error;
  const { error } = await o.db.from("seller_report_schedules").delete().eq("listing_id", o.listing.id).eq("agent_id", o.user.id);
  if (error) return NextResponse.json({ error: "Couldn't remove the schedule." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
