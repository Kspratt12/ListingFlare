// Supabase + Resend implementations of the scheduled-seller-report dependencies (server only).
// The decision logic lives in lib/sellerReportSchedule.ts and is tested with fakes.
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_ATTEMPTS, RETRY_DELAY_MS, STALE_CLAIM_MS, type ReportEmail, type RunDeps, type ScheduleRow, type SendContext } from "./sellerReportSchedule";
import { nurtureSendsEnabled } from "./automationFlags";

export const SCHEDULE_COLUMNS =
  "id, listing_id, agent_id, seller_portal_id, enabled, cadence, send_weekday, send_hour, timezone, include_portal_link, next_run_at, last_period_end, paused_reason, updated_at";

const LISTING_COLUMNS = "id, agent_id, status, street, city, state, zip, price, beds, baths, sqft, view_count, created_at, published_at, ai_chat_enabled";
const AGENT_COLUMNS = "id, name, email, phone, brokerage, headshot_url, brand_color, subscription_status, trial_ends_at, google_refresh_token, ai_approval_mode, timezone";

export async function loadSendContext(db: SupabaseClient, s: Pick<ScheduleRow, "listing_id" | "agent_id" | "seller_portal_id">): Promise<SendContext> {
  const [l, a, p] = await Promise.all([
    db.from("listings").select(LISTING_COLUMNS).eq("id", s.listing_id).maybeSingle(),
    db.from("agent_profiles").select(AGENT_COLUMNS).eq("id", s.agent_id).maybeSingle(),
    s.seller_portal_id
      ? db.from("seller_portals").select("id, active, seller_name, seller_email, access_token, listing_id, agent_id").eq("id", s.seller_portal_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const listing = l.data && (l.data as { agent_id: string }).agent_id === s.agent_id ? (l.data as SendContext["listing"]) : null;
  const portalRow = p.data as (SendContext["portal"] & { listing_id: string; agent_id: string }) | null;
  // A portal only counts when it belongs to this listing and agent.
  const portal = portalRow && portalRow.listing_id === s.listing_id && portalRow.agent_id === s.agent_id ? portalRow : null;
  return { listing, agent: (a.data as SendContext["agent"]) ?? null, portal };
}

export async function loadActivity(db: SupabaseClient, listingId: string) {
  const [leads, showings] = await Promise.all([
    db.from("leads").select("created_at").eq("listing_id", listingId),
    db.from("showings").select("status, created_at").eq("listing_id", listingId),
  ]);
  if (leads.error || showings.error) throw new Error("activity_unavailable");
  return {
    leadCreatedAt: (leads.data || []).map((x) => (x as { created_at: string }).created_at),
    showings: (showings.data || []) as Array<{ status: string; created_at: string }>,
  };
}

async function resendSend(email: ReportEmail, idempotencyKey: string): Promise<{ id: string | null }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("email_not_configured");
  // RESEND_API_BASE_URL exists only so local verification can point at a mock; unset means Resend.
  const base = (process.env.RESEND_API_BASE_URL || "https://api.resend.com").replace(/\/+$/, "");
  const res = await fetch(`${base}/emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      from: `${email.fromName} via ListingFlare <leads@listingflare.com>`,
      to: email.to,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!res.ok) throw new Error(`provider_${res.status}`);
  const body = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: typeof body.id === "string" ? body.id : null };
}

export function createRunDeps(db: SupabaseClient, now: Date, appUrl: string, sendOverride?: RunDeps["send"]): RunDeps {
  let currentKey = "";
  return {
    now,
    appUrl,
    nurtureOn: nurtureSendsEnabled(),
    loadContext: (s) => loadSendContext(db, s),
    loadActivity: (id) => loadActivity(db, id),
    async claim(s, periodStart, periodEnd, at) {
      currentKey = `seller-report/${s.id}/${periodEnd.toISOString()}`;
      const ins = await db
        .from("seller_report_sends")
        .insert({ schedule_id: s.id, agent_id: s.agent_id, listing_id: s.listing_id, period_start: periodStart.toISOString(), period_end: periodEnd.toISOString(), status: "sending", attempts: 1, claimed_at: at.toISOString() })
        .select("id")
        .maybeSingle();
      if (!ins.error && ins.data) return 1;
      if (ins.error && ins.error.code !== "23505") throw new Error("claim_failed");
      const { data: row } = await db
        .from("seller_report_sends")
        .select("id, status, attempts, claimed_at")
        .eq("schedule_id", s.id)
        .eq("period_end", periodEnd.toISOString())
        .maybeSingle();
      if (!row) return null;
      const r = row as { id: string; status: string; attempts: number; claimed_at: string };
      const age = at.getTime() - new Date(r.claimed_at).getTime();
      const retryable = (r.status === "failed" && age >= RETRY_DELAY_MS) || (r.status === "sending" && age >= STALE_CLAIM_MS);
      if (!retryable || r.attempts >= MAX_ATTEMPTS) return null;
      // Conditional update: only one concurrent caller can move attempts from N to N+1.
      const upd = await db
        .from("seller_report_sends")
        .update({ status: "sending", attempts: r.attempts + 1, claimed_at: at.toISOString() })
        .eq("id", r.id)
        .eq("attempts", r.attempts)
        .eq("status", r.status)
        .select("id");
      return !upd.error && Array.isArray(upd.data) && upd.data.length === 1 ? r.attempts + 1 : null;
    },
    async markSend(scheduleId, periodEnd, patch) {
      await db.from("seller_report_sends").update(patch).eq("schedule_id", scheduleId).eq("period_end", periodEnd.toISOString());
    },
    async updateSchedule(scheduleId, patch) {
      await db.from("seller_report_schedules").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", scheduleId);
    },
    send: sendOverride ?? ((email) => resendSend(email, currentKey)),
  };
}
