import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatPhone } from "@/lib/formatters";

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

// Parse "10:00 AM" + "2026-04-25" into a Date
function parseShowingDateTime(date: string, time: string): Date | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  const [yStr, mStr, dStr] = date.split("-");
  return new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr), hour, minute);
}

function formatReminderEmail(
  type: "24h" | "1h",
  name: string,
  listingAddress: string,
  formattedDate: string,
  showingTime: string,
  agent: { name: string; phone: string; email: string }
): string {
  const greeting = type === "24h" ? "Friendly reminder" : "Just a heads up";
  const detail = type === "24h" ? "tomorrow" : "in about an hour";

  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
        <h2 style="margin: 0 0 8px; color: #111827;">${greeting} — your showing is ${detail}</h2>
        <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
          Hi ${name.split(" ")[0]}, looking forward to seeing you at the showing.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">Property</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${listingAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${showingTime}</td>
            </tr>
          </table>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Need to reschedule or have questions? Reply to this email or call ${agent.phone ? formatPhone(agent.phone) : "your agent"}.
        </p>
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-weight: 600; color: #111827;">${agent.name}</p>
          ${agent.phone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${formatPhone(agent.phone)}</p>` : ""}
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agent.email}</p>
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

  // Pull all upcoming confirmed showings that still need reminders (window: next 26 hours)
  const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000);

  const { data: showings } = await db
    .from("showings")
    .select("*")
    .eq("status", "confirmed")
    .gte("showing_date", now.toISOString().split("T")[0])
    .lte("showing_date", windowEnd.toISOString().split("T")[0]);

  if (!showings || showings.length === 0) {
    return NextResponse.json({ ok: true, sent24h: 0, sent1h: 0 });
  }

  let sent24h = 0;
  let sent1h = 0;

  await Promise.allSettled(
    showings.map(async (showing) => {
      const showingAt = parseShowingDateTime(showing.showing_date, showing.showing_time);
      if (!showingAt) return;

      const msUntil = showingAt.getTime() - now.getTime();
      const hoursUntil = msUntil / (1000 * 60 * 60);

      // Determine which reminder (if any) to send right now.
      // 24h window: 20-28 hours before.   1h window: 30-90 min before.
      let reminderType: "24h" | "1h" | null = null;
      if (!showing.reminder_24h_sent && hoursUntil >= 20 && hoursUntil <= 28) {
        reminderType = "24h";
      } else if (!showing.reminder_1h_sent && hoursUntil >= 0.5 && hoursUntil <= 1.5) {
        reminderType = "1h";
      }

      if (!reminderType) return;

      // Fetch listing + agent
      const [{ data: listing }, { data: agent }] = await Promise.all([
        db.from("listings").select("street, city, state").eq("id", showing.listing_id).single(),
        db.from("agent_profiles").select("name, phone, email").eq("id", showing.agent_id).single(),
      ]);

      if (!agent) return;

      const listingAddress = listing
        ? `${listing.street}, ${listing.city}, ${listing.state}`
        : "your showing";

      const formattedDate = new Date(showing.showing_date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      const html = formatReminderEmail(
        reminderType,
        showing.name,
        listingAddress,
        formattedDate,
        showing.showing_time,
        agent
      );

      const subject =
        reminderType === "24h"
          ? `Reminder: Showing tomorrow at ${showing.showing_time} — ${listingAddress}`
          : `Your showing starts soon — ${listingAddress}`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `${agent.name} via ListingFlare <leads@listingflare.com>`,
          to: showing.email,
          replyTo: agent.email,
          subject,
          html,
        }),
      });

      if (res.ok) {
        const updateFields =
          reminderType === "24h"
            ? { reminder_24h_sent: true }
            : { reminder_1h_sent: true };
        await db.from("showings").update(updateFields).eq("id", showing.id);
        if (reminderType === "24h") sent24h++;
        else sent1h++;
      }
    })
  );

  return NextResponse.json({ ok: true, sent24h, sent1h });
}
