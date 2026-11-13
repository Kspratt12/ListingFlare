import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatPhone } from "@/lib/formatters";
import { isCronAuthorized } from "@/lib/internalAuth";
import { decideShowingReminder } from "@/lib/showingReminders";
import { labelShowingTime } from "@/lib/timezone";
import { escapeHtml } from "@/lib/escapeHtml";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Fails closed: no CRON_SECRET, no access (and no development bypass).
function isAuthorized(req: NextRequest) {
  return isCronAuthorized(req);
}

function formatReminderEmail(
  name: string,
  listingAddress: string,
  formattedDate: string,
  showingTime: string,
  agent: { name: string; phone: string; email: string }
): string {
  const greeting = "Friendly reminder";

  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 8px; color: #111827;">${greeting} - you have a showing coming up</h2>
        <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
          Hi ${escapeHtml(name.split(" ")[0])}, looking forward to seeing you at the showing.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">Property</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${escapeHtml(listingAddress)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${escapeHtml(showingTime)}</td>
            </tr>
          </table>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Need to reschedule or have questions? Reply to this email or call ${agent.phone ? formatPhone(agent.phone) : "your agent"}.
        </p>
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-weight: 600; color: #111827;">${escapeHtml(agent.name)}</p>
          ${agent.phone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${formatPhone(agent.phone)}</p>` : ""}
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${escapeHtml(agent.email)}</p>
        </div>
      </div>
    </div>
  `;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ ok: true, sent24h: 0, sent1h: 0, note: "No Resend key" });
  }

  const db = getAdminClient();
  const now = new Date();

  // Candidates: confirmed showings whose property-local date could fall inside the reminder window.
  // The window is generous (UTC date +/- 2 days); the exact decision is made per showing in
  // decideShowingReminder using the property's time zone.
  const day = 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - day).toISOString().split("T")[0];
  const to = new Date(now.getTime() + 2 * day).toISOString().split("T")[0];

  const { data: showings, error: listError } = await db
    .from("showings")
    .select("*")
    .eq("status", "confirmed")
    .eq("reminder_24h_sent", false)
    .gte("showing_date", from)
    .lte("showing_date", to);

  if (listError) {
    console.error("Showing reminders: lookup failed:", listError.message);
    return NextResponse.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }
  if (!showings || showings.length === 0) {
    return NextResponse.json({ ok: true, sent24h: 0, sent1h: 0 });
  }

  let sent24h = 0;
  let failed = 0;
  const skipped: Record<string, number> = {};

  await Promise.allSettled(
    showings.map(async (showing) => {
      // Property time zone: the listing's, else the agent's (never the server's).
      const [{ data: listing }, { data: agent }] = await Promise.all([
        db.from("listings").select("street, city, state, timezone").eq("id", showing.listing_id).single(),
        db.from("agent_profiles").select("name, phone, email, timezone").eq("id", showing.agent_id).single(),
      ]);
      if (!agent) {
        skipped.no_agent = (skipped.no_agent || 0) + 1;
        return;
      }
      const timeZone = listing?.timezone || agent.timezone || null;

      const decision = decideShowingReminder({
        status: showing.status,
        showingDate: showing.showing_date,
        showingTime: showing.showing_time,
        timeZone,
        alreadySent: !!showing.reminder_24h_sent,
        now,
      });
      if (!decision.send) {
        skipped[decision.reason] = (skipped[decision.reason] || 0) + 1;
        return;
      }

      // Claim before sending so two overlapping runs cannot both send; release the claim if the send fails.
      const { data: claimed } = await db
        .from("showings")
        .update({ reminder_24h_sent: true })
        .eq("id", showing.id)
        .eq("reminder_24h_sent", false)
        .select("id");
      if (!claimed || claimed.length === 0) {
        skipped.already_sent = (skipped.already_sent || 0) + 1;
        return;
      }

      const listingAddress = listing
        ? `${listing.street}, ${listing.city}, ${listing.state}`
        : "your showing";

      const formattedDate = new Date(showing.showing_date + "T12:00:00Z").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
      const timeLabel = labelShowingTime(showing.showing_date, showing.showing_time, timeZone);

      const html = formatReminderEmail(showing.name, listingAddress, formattedDate, timeLabel, agent);
      const subject = `Reminder: Showing on ${formattedDate} at ${timeLabel} - ${listingAddress}`.replace(/[\r\n]+/g, " ");

      let ok = false;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: `${String(agent.name).replace(/[<>"\r\n]/g, "")} via ListingFlare <leads@listingflare.com>`,
            to: showing.email,
            replyTo: agent.email,
            subject,
            html,
          }),
        });
        ok = res.ok;
        if (!ok) console.error("Showing reminders: provider rejected a send, status", res.status);
      } catch (err) {
        console.error("Showing reminders: send error:", err instanceof Error ? err.message : "unknown");
      }

      if (ok) {
        sent24h++;
      } else {
        failed++;
        await db.from("showings").update({ reminder_24h_sent: false }).eq("id", showing.id);
      }
    })
  );

  console.log("Showing reminders: sent", sent24h, "failed", failed, "skipped", JSON.stringify(skipped));
  const sent1h = 0;
  return NextResponse.json({ ok: true, sent24h, sent1h, failed, skipped });
}
