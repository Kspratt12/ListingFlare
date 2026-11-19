// Scheduled seller reports: when a report is due, whether it may be sent, and one send attempt.
// Metrics come from buildSellerReport (lib/sellerReport.ts), the same code as the on-screen report.
//
// Safety model
//  - Sending is OFF unless SELLER_REPORTS_ENABLED is exactly "1" (sellerReportsEnabled()).
//  - A send is keyed by (schedule, period_end). period_end is the schedule's planned run time, not
//    "now", so a repeated or overlapping scheduler call maps to the same key and the database unique
//    constraint lets only one caller claim it.
//  - "accepted" means the email provider accepted the message. It never means "delivered".
//  - Recipient is the listing's active seller portal email. A revoked portal, a draft/archived listing
//    or an inactive agent account stops sending (recorded as a skip), it never falls back elsewhere.
import { isValidTimeZone, zonedTimeToUtc } from "./timezone";
import { isAgentInactive } from "./listingVisibility";
import { buildSellerReport, type SellerReport, type SellerReportInput } from "./sellerReport";
import { escapeHtml } from "./escapeHtml";

export type Cadence = "weekly" | "biweekly" | "monthly";
export const CADENCE_DAYS: Record<Cadence, 7 | 14 | 30> = { weekly: 7, biweekly: 14, monthly: 30 };
export const CADENCE_LABELS: Record<Cadence, string> = {
  weekly: "Every week",
  biweekly: "Every two weeks",
  monthly: "Monthly (first of the month)",
};
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const FALLBACK_TIMEZONE = "America/New_York";
export const MAX_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 60 * 60 * 1000;
// A claim older than this with status "sending" is treated as a crashed run and may be retried.
export const STALE_CLAIM_MS = 15 * 60 * 1000;

export function sellerReportsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.SELLER_REPORTS_ENABLED === "1";
}

export interface ScheduleSettings {
  cadence: Cadence;
  send_weekday: number;
  send_hour: number;
  timezone: string;
}

export interface ScheduleRow extends ScheduleSettings {
  id: string;
  listing_id: string;
  agent_id: string;
  seller_portal_id: string | null;
  enabled: boolean;
  include_portal_link: boolean;
  next_run_at: string | null;
  last_period_end: string | null;
}

const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[A-Za-z]{2,24}$/;
export function isValidRecipient(email: unknown): email is string {
  return typeof email === "string" && email.length <= 254 && EMAIL.test(email.trim());
}

export type SettingsCheck = { ok: true; value: ScheduleSettings & { include_portal_link: boolean } } | { ok: false; error: string };

export function validateScheduleInput(input: unknown, fallbackTz: string | null | undefined): SettingsCheck {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const cadence = o.cadence;
  if (cadence !== "weekly" && cadence !== "biweekly" && cadence !== "monthly") return { ok: false, error: "Choose how often to send the report." };
  const weekday = Number(o.send_weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { ok: false, error: "Choose a day of the week." };
  const hour = Number(o.send_hour);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return { ok: false, error: "Choose a send time." };
  const tz = typeof o.timezone === "string" && o.timezone ? o.timezone : fallbackTz || FALLBACK_TIMEZONE;
  if (!isValidTimeZone(tz)) return { ok: false, error: "That time zone isn't recognized." };
  return { ok: true, value: { cadence, send_weekday: weekday, send_hour: hour, timezone: tz, include_portal_link: o.include_portal_link !== false } };
}

const clock = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? "AM" : "PM"}`;
const pad = (n: number) => String(n).padStart(2, "0");

function localParts(at: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(at);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), wd };
}

// Calendar arithmetic on a local date (UTC math on the Y/M/D only).
function addDays(y: number, m: number, d: number, days: number) {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function at(y: number, m: number, d: number, hour: number, tz: string): Date {
  return zonedTimeToUtc(`${y}-${pad(m)}-${pad(d)}`, clock(hour), tz)!.utc;
}

// First planned run strictly after `after`. Weekly/biweekly: the chosen weekday at the chosen local
// hour. Monthly: the 1st of the month at the chosen local hour. Biweekly adds a week after a send
// (see advanceSchedule), so this gives the first occurrence.
export function nextRunAfter(after: Date, s: ScheduleSettings): Date {
  const tz = isValidTimeZone(s.timezone) ? s.timezone : FALLBACK_TIMEZONE;
  const today = localParts(after, tz);
  if (s.cadence === "monthly") {
    for (let i = 0; i < 3; i++) {
      const t = new Date(Date.UTC(today.y, today.m - 1 + i, 1));
      const c = at(t.getUTCFullYear(), t.getUTCMonth() + 1, 1, s.send_hour, tz);
      if (c.getTime() > after.getTime()) return c;
    }
  }
  for (let i = 0; i <= 7; i++) {
    const day = addDays(today.y, today.m, today.d, i);
    const wd = (today.wd + i) % 7;
    if (wd !== s.send_weekday) continue;
    const c = at(day.y, day.m, day.d, s.send_hour, tz);
    if (c.getTime() > after.getTime()) return c;
  }
  const day = addDays(today.y, today.m, today.d, 14);
  return at(day.y, day.m, day.d, s.send_hour, tz);
}

// After a period has been handled (sent or skipped), the next planned run.
export function advanceSchedule(periodEnd: Date, s: ScheduleSettings): Date {
  const next = nextRunAfter(periodEnd, s);
  if (s.cadence !== "biweekly") return next;
  return nextRunAfter(new Date(next.getTime() + 60_000), s);
}

export function reportPeriod(periodEnd: Date, cadence: Cadence): { start: Date; end: Date; days: 7 | 14 | 30 } {
  const days = CADENCE_DAYS[cadence];
  return { start: new Date(periodEnd.getTime() - days * 86400000), end: periodEnd, days };
}

export interface SendContext {
  listing: { id: string; status: string; street: string; city: string; state: string; zip?: string | null; price?: number | null; beds?: number | null; baths?: number | null; sqft?: number | null; view_count?: number | null; created_at: string; published_at?: string | null; ai_chat_enabled?: boolean | null } | null;
  agent: { id: string; name?: string | null; email?: string | null; phone?: string | null; brokerage?: string | null; headshot_url?: string | null; brand_color?: string | null; subscription_status?: string | null; trial_ends_at?: string | null; google_refresh_token?: string | null; ai_approval_mode?: boolean | null } | null;
  portal: { id: string; active: boolean; seller_name?: string | null; seller_email?: string | null; access_token?: string | null } | null;
}

export type Eligibility = { ok: true } | { ok: false; reason: "disabled" | "listing_missing" | "listing_not_public" | "agent_inactive" | "no_seller" | "seller_removed" | "invalid_recipient" };

export function checkEligibility(s: Pick<ScheduleRow, "enabled" | "seller_portal_id">, c: SendContext): Eligibility {
  if (!s.enabled) return { ok: false, reason: "disabled" };
  if (!c.listing) return { ok: false, reason: "listing_missing" };
  if (c.listing.status === "draft" || c.listing.status === "archived") return { ok: false, reason: "listing_not_public" };
  if (!c.agent || isAgentInactive(c.agent)) return { ok: false, reason: "agent_inactive" };
  if (!s.seller_portal_id || !c.portal) return { ok: false, reason: "no_seller" };
  if (!c.portal.active) return { ok: false, reason: "seller_removed" };
  if (!isValidRecipient(c.portal.seller_email)) return { ok: false, reason: "invalid_recipient" };
  return { ok: true };
}

export const SKIP_REASON_LABELS: Record<Exclude<Eligibility, { ok: true }>["reason"], string> = {
  disabled: "Scheduled reports are turned off.",
  listing_missing: "The listing no longer exists.",
  listing_not_public: "The listing is a draft or archived, so no report was sent.",
  agent_inactive: "Your account is not active, so reports are paused.",
  no_seller: "No seller is connected. Create a seller portal with the seller's email first.",
  seller_removed: "The seller portal was revoked, so reports stopped.",
  invalid_recipient: "The seller's email address isn't valid.",
};

export interface ReportEmail {
  to: string;
  replyTo: string | null;
  fromName: string;
  subject: string;
  html: string;
  text: string;
}

function safeColor(c: string | null | undefined): string {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#b8965a";
}

const fmtDay = (d: Date, tz: string) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });

export function renderReportEmail(opts: {
  report: SellerReport;
  context: SendContext;
  tz: string;
  periodStart: Date;
  periodEnd: Date;
  portalUrl: string | null;
}): ReportEmail {
  const { report, context, tz } = opts;
  const l = context.listing!;
  const a = context.agent!;
  const p = context.portal!;
  const color = safeColor(a.brand_color);
  const agentName = (a.name || "Your agent").slice(0, 100);
  const address = [l.street, l.city, l.state].filter(Boolean).join(", ");
  const period = `${fmtDay(opts.periodStart, tz)} – ${fmtDay(opts.periodEnd, tz)}`;
  const greeting = p.seller_name ? `Hi ${p.seller_name.slice(0, 80)},` : "Hi,";
  const rows = report.metrics
    .map((m) => `<tr><td style="padding:10px 12px;border-top:1px solid #e5e7eb;"><div style="font-size:14px;color:#111827;font-weight:600;">${escapeHtml(m.label)}: ${m.value.toLocaleString("en-US")}</div><div style="font-size:12px;color:#6b7280;margin-top:2px;">${escapeHtml(m.definition)}</div></td></tr>`)
    .join("");
  const running = report.running.map((r) => `<li style="margin:4px 0;">${escapeHtml(r)}</li>`).join("");
  const portal = opts.portalUrl
    ? `<p style="margin:20px 0;text-align:center;"><a href="${escapeHtml(opts.portalUrl)}" style="display:inline-block;background:${color};color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open your listing dashboard</a></p><p style="font-size:12px;color:#6b7280;text-align:center;margin:0;">This private link is for you; please don't forward it.</p>`
    : "";
  const notes = report.notes.map((n) => `<p style="font-size:11px;color:#9ca3af;margin:4px 0;">${escapeHtml(n)}</p>`).join("");
  const contact = [a.phone, a.email].filter(Boolean).map((x) => escapeHtml(x)).join(" · ");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#111827;">
<div style="background:#0f172a;padding:20px 28px;border-radius:12px 12px 0 0;"><div style="color:${color};font-size:18px;font-weight:700;">${escapeHtml(agentName)}</div>${a.brokerage ? `<div style="color:#cbd5e1;font-size:12px;margin-top:2px;">${escapeHtml(a.brokerage)}</div>` : ""}</div>
<div style="background:#ffffff;padding:24px 28px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
<p style="margin:0 0 6px;font-size:14px;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px;font-size:14px;color:#374151;">Here is the activity report for <strong>${escapeHtml(address)}</strong> for ${escapeHtml(period)}.</p>
<p style="margin:0 0 16px;font-size:14px;color:#111827;">${escapeHtml(report.summary)}</p>
<table style="width:100%;border-collapse:collapse;">${rows}</table>
${running ? `<p style="margin:20px 0 4px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">On the listing page</p><ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;">${running}</ul>` : ""}
${portal}
<div style="margin-top:20px;">${notes}</div>
<p style="margin:20px 0 0;font-size:13px;color:#374151;">${escapeHtml(agentName)}${contact ? `<br>${contact}` : ""}</p>
</div></div>`;
  const text = [
    greeting,
    "",
    `Activity report for ${address}, ${period}.`,
    report.summary,
    "",
    ...report.metrics.map((m) => `${m.label}: ${m.value}\n  ${m.definition}`),
    "",
    ...(report.running.length ? ["On the listing page:", ...report.running.map((r) => `- ${r}`), ""] : []),
    ...(opts.portalUrl ? [`Your listing dashboard (private link): ${opts.portalUrl}`, ""] : []),
    ...report.notes,
    "",
    agentName,
    [a.phone, a.email].filter(Boolean).join(" · "),
  ].join("\n");
  return {
    to: p.seller_email!.trim(),
    replyTo: isValidRecipient(a.email) ? a.email!.trim() : null,
    fromName: agentName.replace(/[<>"\r\n]/g, ""),
    subject: `Listing activity report: ${l.street}`.slice(0, 150),
    html,
    text,
  };
}

export interface RunDeps {
  now: Date;
  appUrl: string;
  nurtureOn: boolean;
  loadContext(s: ScheduleRow): Promise<SendContext>;
  // activity in [start, end]: lead timestamps and showing rows (status + created_at only)
  loadActivity(listingId: string): Promise<{ leadCreatedAt: string[]; showings: Array<{ status: string; created_at: string }> }>;
  // Atomic: insert a 'sending' row for (schedule, period_end), or re-claim a failed/stale row that is
  // still under MAX_ATTEMPTS. Returns the attempt number if this caller won, null otherwise.
  claim(s: ScheduleRow, periodStart: Date, periodEnd: Date, now: Date): Promise<number | null>;
  markSend(scheduleId: string, periodEnd: Date, patch: { status: "accepted" | "failed" | "skipped"; provider_message_id?: string | null; last_error?: string | null }): Promise<void>;
  updateSchedule(scheduleId: string, patch: { next_run_at: string; last_period_end?: string; paused_reason?: string | null }): Promise<void>;
  // Provider call. Resolves with the provider's message id when the provider ACCEPTED the message.
  send(email: ReportEmail): Promise<{ id: string | null }>;
}

export type RunResult = "accepted" | "failed" | "retry_scheduled" | "not_due" | `skipped:${string}` | "already_claimed";

export async function runScheduledReport(s: ScheduleRow, deps: RunDeps): Promise<RunResult> {
  if (!s.enabled || !s.next_run_at) return "skipped:disabled";
  const periodEnd = new Date(s.next_run_at);
  if (periodEnd.getTime() > deps.now.getTime()) return "not_due";
  const settings: ScheduleSettings = s;
  const tz = isValidTimeZone(s.timezone) ? s.timezone : FALLBACK_TIMEZONE;
  const { start: periodStart, days } = reportPeriod(periodEnd, s.cadence);

  const context = await deps.loadContext(s);
  const eligibility = checkEligibility(s, context);
  if (!eligibility.ok) {
    // Record the skip once per period and move on, so an ineligible schedule never loops.
    const attempt = await deps.claim(s, periodStart, periodEnd, deps.now);
    if (attempt !== null) await deps.markSend(s.id, periodEnd, { status: "skipped", last_error: eligibility.reason });
    await deps.updateSchedule(s.id, { next_run_at: advanceSchedule(periodEnd, settings).toISOString(), last_period_end: periodEnd.toISOString(), paused_reason: eligibility.reason });
    return `skipped:${eligibility.reason}`;
  }

  const attempt = await deps.claim(s, periodStart, periodEnd, deps.now);
  if (attempt === null) return "already_claimed";

  const activity = await deps.loadActivity(s.listing_id);
  const l = context.listing!;
  const a = context.agent!;
  const input: SellerReportInput = {
    now: periodEnd,
    periodDays: days,
    listing: { created_at: l.created_at, published_at: l.published_at, status: l.status, view_count: l.view_count },
    // Activity after the period end is excluded so a late or retried send reports the same numbers.
    leadCreatedAt: activity.leadCreatedAt.filter((t) => new Date(t).getTime() <= periodEnd.getTime()),
    showings: activity.showings.filter((x) => new Date(x.created_at).getTime() <= periodEnd.getTime()),
    automation: { aiChatOn: l.ai_chat_enabled !== false, calendarConnected: !!a.google_refresh_token, followUpEmailsOn: deps.nurtureOn, approvalMode: a.ai_approval_mode === true },
  };
  const report = buildSellerReport(input);
  const portalUrl = s.include_portal_link && context.portal?.access_token ? `${deps.appUrl.replace(/\/+$/, "")}/seller/${context.portal.access_token}` : null;
  const email = renderReportEmail({ report, context, tz, periodStart, periodEnd, portalUrl });

  let id: string | null = null;
  let ok = false;
  try {
    id = (await deps.send(email)).id;
    ok = true;
  } catch {
    ok = false;
  }
  if (ok) {
    await deps.markSend(s.id, periodEnd, { status: "accepted", provider_message_id: id, last_error: null });
    await deps.updateSchedule(s.id, { next_run_at: advanceSchedule(periodEnd, settings).toISOString(), last_period_end: periodEnd.toISOString(), paused_reason: null });
    return "accepted";
  }
  await deps.markSend(s.id, periodEnd, { status: "failed", last_error: "provider_error" });
  if (attempt < MAX_ATTEMPTS) {
    // Keep the same period (same key, so the retry reports the same numbers). The schedule stays due;
    // claim() only re-claims a failed row once RETRY_DELAY_MS has passed since the last attempt.
    await deps.updateSchedule(s.id, { next_run_at: periodEnd.toISOString(), paused_reason: "retrying" });
    return "retry_scheduled";
  }
  await deps.updateSchedule(s.id, { next_run_at: advanceSchedule(periodEnd, settings).toISOString(), last_period_end: periodEnd.toISOString(), paused_reason: "send_failed" });
  return "failed";
}
