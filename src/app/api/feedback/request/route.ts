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

function parseShowingDateTime(date: string, time: string): Date | null {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (m[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (m[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  const [y, mo, d] = date.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), hour, minute);
}

// Triggered daily (from follow-ups cron).
// Sends feedback request ~2-24hrs AFTER showing end time, once per showing.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ ok: true, sent: 0, note: "No Resend key" });
  }

  const db = getAdminClient();
  const now = new Date();

  // Find confirmed showings that ended in the last 2-24 hours without feedback yet
  const { data: recentShowings } = await db
    .from("showings")
    .select("*")
    .eq("status", "confirmed")
    .gte("showing_date", new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().split("T")[0])
    .lte("showing_date", now.toISOString().split("T")[0]);

  if (!recentShowings || recentShowings.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;

  await Promise.allSettled(
    recentShowings.map(async (showing) => {
      const showingAt = parseShowingDateTime(showing.showing_date, showing.showing_time);
      if (!showingAt) return;

      // Showing must have ended at least 2 hours ago (30-min showing + buffer)
      const minutesSinceShowing = (now.getTime() - showingAt.getTime()) / (1000 * 60);
      if (minutesSinceShowing < 150) return; // less than 2.5hrs since start
      if (minutesSinceShowing > 48 * 60) return; // older than 48hrs

      // Check if we already sent feedback request
      const { data: existing } = await db
        .from("showing_feedback")
        .select("id, request_sent_at")
        .eq("showing_id", showing.id)
        .limit(1);
      if (existing && existing.length > 0 && existing[0].request_sent_at) return;

      // Fetch agent + listing
      const [{ data: agent }, { data: listing }] = await Promise.all([
        db.from("agent_profiles").select("name, phone, email").eq("id", showing.agent_id).single(),
        db.from("listings").select("street, city, state").eq("id", showing.listing_id).single(),
      ]);
      if (!agent) return;

      // Create or get feedback row with a unique token
      let token: string;
      let feedbackId: string;
      if (existing && existing.length > 0) {
        const { data: updated } = await db
          .from("showing_feedback")
          .update({ request_sent_at: now.toISOString() })
          .eq("id", existing[0].id)
          .select("token, id")
          .single();
        if (!updated) return;
        token = updated.token;
        feedbackId = updated.id;
      } else {
        const { data: created } = await db
          .from("showing_feedback")
          .insert({
            showing_id: showing.id,
            agent_id: showing.agent_id,
            lead_id: showing.lead_id,
            request_sent_at: now.toISOString(),
          })
          .select("token, id")
          .single();
        if (!created) return;
        token = created.token;
        feedbackId = created.id;
      }

      const listingAddress = listing
        ? `${listing.street}, ${listing.city}, ${listing.state}`
        : "the property";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
      const feedbackUrl = `${appUrl}/feedback/${token}`;

      const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">How was the showing?</h2>
            <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
              Hi ${showing.name.split(" ")[0]}, thanks for stopping by <strong>${listingAddress}</strong> today. I'd love a quick note on what you thought — good, bad, or mixed. Takes 30 seconds.
            </p>
            <div style="text-align: center; margin: 0 0 24px;">
              <a href="${feedbackUrl}"
                style="display: inline-block; background: #b8965a; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
                Leave Quick Feedback
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Or just reply to this email with your thoughts.
            </p>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-weight: 600; color: #111827;">${agent.name}</p>
              ${agent.phone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${formatPhone(agent.phone)}</p>` : ""}
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agent.email}</p>
            </div>
          </div>
        </div>
      `;

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
          subject: `Quick question about today's showing — ${listingAddress}`,
          html,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        await db.from("showing_feedback").delete().eq("id", feedbackId);
      }
    })
  );

  return NextResponse.json({ ok: true, sent });
}
