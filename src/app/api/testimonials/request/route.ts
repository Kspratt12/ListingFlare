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

// Sends testimonial request emails for recently closed leads.
// Triggered daily from the follow-ups cron.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const db = getAdminClient();

  // Find leads that closed in the last 14 days (gives agent time to ask first if they want)
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: closedLeads } = await db
    .from("leads")
    .select("id, name, email, agent_id, created_at")
    .eq("status", "closed")
    .gte("created_at", cutoff);

  if (!closedLeads || closedLeads.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;

  await Promise.allSettled(
    closedLeads.map(async (lead) => {
      // Skip if testimonial already requested
      const { data: existing } = await db
        .from("testimonials")
        .select("id, request_sent_at")
        .eq("lead_id", lead.id)
        .limit(1);
      if (existing && existing.length > 0 && existing[0].request_sent_at) return;

      const { data: agent } = await db
        .from("agent_profiles")
        .select("name, phone, email")
        .eq("id", lead.agent_id)
        .single();
      if (!agent) return;

      // Create testimonial row with unique token
      let token: string;
      let testimonialId: string;
      if (existing && existing.length > 0) {
        const { data: updated } = await db
          .from("testimonials")
          .update({ request_sent_at: new Date().toISOString() })
          .eq("id", existing[0].id)
          .select("id, token")
          .single();
        if (!updated) return;
        token = updated.token;
        testimonialId = updated.id;
      } else {
        const { data: created } = await db
          .from("testimonials")
          .insert({
            agent_id: lead.agent_id,
            lead_id: lead.id,
            author_name: lead.name,
            request_sent_at: new Date().toISOString(),
          })
          .select("id, token")
          .single();
        if (!created) return;
        token = created.token;
        testimonialId = created.id;
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
      const submitUrl = `${appUrl}/testimonial/${token}`;

      const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">Would you mind sharing a quick review?</h2>
            <p style="color: #6b7280; margin: 0 0 20px; font-size: 15px;">
              Hi ${lead.name.split(" ")[0]}, congrats again! It was a pleasure working with you. Would you be willing to share a quick testimonial? Takes under a minute and helps future buyers find me.
            </p>
            <div style="text-align: center; margin: 0 0 24px;">
              <a href="${submitUrl}"
                style="display: inline-block; background: #b8965a; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
                Leave a Quick Review
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Thanks so much for considering it.
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
          to: lead.email,
          replyTo: agent.email,
          subject: `One small favor from ${agent.name}`,
          html,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        await db.from("testimonials").delete().eq("id", testimonialId);
      }
    })
  );

  return NextResponse.json({ ok: true, sent });
}
