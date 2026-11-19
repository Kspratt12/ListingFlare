"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Mail } from "lucide-react";
import { CADENCE_LABELS, WEEKDAYS, type Cadence } from "@/lib/sellerReportSchedule";
import { US_TIME_ZONES } from "@/lib/timezone";

interface Props {
  listingId: string;
}

interface ScheduleState {
  schedule: null | {
    enabled: boolean;
    cadence: Cadence;
    send_weekday: number;
    send_hour: number;
    timezone: string;
    include_portal_link: boolean;
    next_run_at: string | null;
    paused_reason: string | null;
  };
  sends: Array<{ period_start: string; period_end: string; status: string; attempts: number; last_error: string | null; created_at: string }>;
  seller: null | { name: string | null; email: string | null; emailValid: boolean };
  sendingEnabled: boolean;
  defaultTimezone: string;
  timezoneIsFallback: boolean;
}

const STATUS_TEXT: Record<string, string> = {
  accepted: "Accepted by the email provider (delivery to the inbox is not confirmed)",
  failed: "Failed",
  sending: "Sending",
  skipped: "Skipped",
};

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`;

// Scheduled seller reports for one listing: who gets it, how often, when, a preview of the exact email,
// and an on/off switch. The recipient is the listing's seller portal email.
export default function SellerReportScheduleCard({ listingId }: Props) {
  const [data, setData] = useState<ScheduleState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ cadence: "weekly" as Cadence, send_weekday: 1, send_hour: 9, timezone: "", include_portal_link: true });
  const [preview, setPreview] = useState<{ subject: string; html: string; to: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch(`/api/seller-reports/schedule?listingId=${encodeURIComponent(listingId)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't load scheduled reports.");
      setData(json);
      const s = (json as ScheduleState).schedule;
      setForm({
        cadence: s?.cadence || "weekly",
        send_weekday: s?.send_weekday ?? 1,
        send_hour: s?.send_hour ?? 9,
        timezone: s?.timezone || (json as ScheduleState).defaultTimezone,
        include_portal_link: s?.include_portal_link !== false,
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load scheduled reports.");
    }
  }, [listingId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (enabled: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/seller-reports/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, enabled, ...form }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't save.");
      setData(json);
      setMessage({ kind: "ok", text: enabled ? "Scheduled reports are on." : "Scheduled reports are paused." });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async () => {
    setPreviewLoading(true);
    setMessage(null);
    try {
      const q = new URLSearchParams({ listingId, cadence: form.cadence, timezone: form.timezone, portalLink: form.include_portal_link ? "1" : "0" });
      const res = await fetch(`/api/seller-reports/preview?${q}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't build the preview.");
      setPreview(json);
    } catch (e) {
      setPreview(null);
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Couldn't build the preview." });
    } finally {
      setPreviewLoading(false);
    }
  };

  const schedule = data?.schedule;
  const enabled = !!schedule?.enabled;
  const tzOptions = US_TIME_ZONES.some((z) => z.value === form.timezone) || !form.timezone ? US_TIME_ZONES : [{ value: form.timezone, label: form.timezone }, ...US_TIME_ZONES];
  const sel = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400";

  return (
    // stopPropagation: these controls save on their own, so they must not mark the listing form as unsaved.
    <section className="rounded-xl border border-gray-200 bg-white p-6" aria-labelledby="report-schedule-heading" onChange={(e) => e.stopPropagation()}>
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-1 h-5 w-5 flex-none text-gray-400" />
        <div className="min-w-0 flex-1">
          <h2 id="report-schedule-heading" className="font-serif text-lg font-semibold text-gray-900">Scheduled seller reports</h2>
          <p className="mt-1 text-sm text-gray-500">
            Email your seller the same activity report you can print, on a schedule. It includes views, inquiries and
            showing requests with their definitions, never buyer names or conversations.
          </p>

          {loadError ? (
            <div className="mt-4 text-sm">
              <p className="text-red-600">{loadError}</p>
              <button type="button" onClick={load} className="mt-1 text-xs font-medium text-gray-700 underline">Try again</button>
            </div>
          ) : !data ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : (
            <div className="mt-4 space-y-4">
              {!data.sendingEnabled && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Automatic sending is not switched on for ListingFlare yet. You can set up and preview a schedule, but
                  no email will be sent until it is.
                </p>
              )}

              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="font-medium text-gray-700">Sends to: </span>
                {data.seller?.email ? (
                  <span className="text-gray-900">{data.seller.name ? `${data.seller.name} <${data.seller.email}>` : data.seller.email}</span>
                ) : (
                  <span className="text-gray-500">No seller email yet. Add one in the Seller portal above.</span>
                )}
                {data.seller?.email && !data.seller.emailValid && <span className="ml-2 text-red-600">This email address isn&apos;t valid.</span>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="report-cadence" className="mb-1 block text-xs font-medium text-gray-600">How often</label>
                  <select id="report-cadence" value={form.cadence} onChange={(e) => setForm((f) => ({ ...f, cadence: e.target.value as Cadence }))} className={sel}>
                    {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => <option key={c} value={c}>{CADENCE_LABELS[c]}</option>)}
                  </select>
                </div>
                {form.cadence !== "monthly" && (
                  <div>
                    <label htmlFor="report-weekday" className="mb-1 block text-xs font-medium text-gray-600">Day</label>
                    <select id="report-weekday" value={form.send_weekday} onChange={(e) => setForm((f) => ({ ...f, send_weekday: Number(e.target.value) }))} className={sel}>
                      {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="report-hour" className="mb-1 block text-xs font-medium text-gray-600">Earliest send time</label>
                  <select id="report-hour" value={form.send_hour} onChange={(e) => setForm((f) => ({ ...f, send_hour: Number(e.target.value) }))} className={sel}>
                    {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="report-timezone" className="mb-1 block text-xs font-medium text-gray-600">Time zone</label>
                  <select id="report-timezone" value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} className={sel}>
                    {tzOptions.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                  </select>
                  {data.timezoneIsFallback && !schedule && (
                    <p className="mt-1 text-[11px] text-gray-500">Your account has no time zone set, so Eastern time is used. Set yours in Settings.</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Each report covers the {form.cadence === "weekly" ? "7" : form.cadence === "biweekly" ? "14" : "30"} days before it is
                sent. It goes out on the first scheduler run after the time you pick, so it may arrive later than that time.
              </p>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.include_portal_link} onChange={(e) => setForm((f) => ({ ...f, include_portal_link: e.target.checked }))} className="mt-1" />
                <span>Include the seller&apos;s private dashboard link <span className="block text-xs text-gray-500">Anyone with this link can see the dashboard, so only send it to the seller.</span></span>
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={loadPreview} disabled={previewLoading} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Preview email
                </button>
                <button type="button" onClick={() => save(true)} disabled={saving} className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                  {saving ? "Saving…" : enabled ? "Save schedule" : "Turn on reports"}
                </button>
                {enabled && (
                  <button type="button" onClick={() => save(false)} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    Pause
                  </button>
                )}
              </div>

              <div aria-live="polite" className="text-sm">
                {message && <p className={message.kind === "ok" ? "text-emerald-700" : "text-red-600"}>{message.text}</p>}
                {schedule && (
                  <p className="mt-1 text-xs text-gray-600">
                    {enabled && schedule.next_run_at
                      ? `Next report: on or after ${new Date(schedule.next_run_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: schedule.timezone, timeZoneName: "short" })}.`
                      : "Reports are paused."}
                  </p>
                )}
              </div>

              {preview && (
                <div className="rounded-lg border border-gray-200">
                  <div className="border-b border-gray-100 px-3 py-2 text-xs text-gray-600">
                    <div><strong>To:</strong> {preview.to}</div>
                    <div><strong>Subject:</strong> {preview.subject}</div>
                  </div>
                  {/* sandbox with no permissions: the preview cannot run scripts or navigate this page */}
                  <iframe title="Seller report email preview" sandbox="" srcDoc={preview.html} className="h-[28rem] w-full rounded-b-lg" />
                </div>
              )}

              {data.sends.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Recent reports</h3>
                  <ul className="space-y-1 text-xs text-gray-700">
                    {data.sends.map((s) => (
                      <li key={s.period_end}>
                        {new Date(s.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: {STATUS_TEXT[s.status] || s.status}
                        {s.last_error && s.status !== "accepted" ? ` (${s.last_error.replace(/_/g, " ")})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
