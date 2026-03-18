import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/formatters";

export const dynamic = "force-dynamic";

// This endpoint is called after a lead is submitted to send an email notification
// Uses a simple fetch to a free email API (Resend) if configured
// Falls back to just recording the lead if no email service is set up
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, listingId, agentId } = body;

    if (!leadId || !listingId || !agentId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch agent email
    const { data: agent } = await supabase
      .from("agent_profiles")
      .select("name, email")
      .eq("id", agentId)
      .single();

    if (!agent?.email) {
      return NextResponse.json({ ok: true, emailed: false });
    }

    // Fetch lead details
    const { data: lead } = await supabase
      .from("leads")
      .select("name, email, phone, message")
      .eq("id", leadId)
      .single();

    if (!lead) {
      return NextResponse.json({ ok: true, emailed: false });
    }

    // Fetch listing address
    const { data: listing } = await supabase
      .from("listings")
      .select("street, city, state")
      .eq("id", listingId)
      .single();

    // Send email via Resend if API key is configured
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const emailHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">New Lead Received!</h2>
            <p style="color: #6b7280; margin: 0 0 24px;">
              Someone is interested in <strong>${listing?.street || "your listing"}</strong>${listing ? `, ${listing.city}, ${listing.state}` : ""}.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">Name</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${lead.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
                <td style="padding: 8px 0;"><a href="mailto:${lead.email}" style="color: #b8965a;">${lead.email}</a></td>
              </tr>
              ${lead.phone ? `<tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone</td>
                <td style="padding: 8px 0;"><a href="tel:${lead.phone}" style="color: #b8965a;">${formatPhone(lead.phone)}</a></td>
              </tr>` : ""}
              ${lead.message ? `<tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Message</td>
                <td style="padding: 8px 0; color: #111827;">${lead.message}</td>
              </tr>` : ""}
            </table>
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com"}/dashboard/leads"
                style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                View in Dashboard
              </a>
            </div>
          </div>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "ListingFlare <leads@listingflare.com>",
          to: agent.email,
          subject: `New lead for ${listing?.street || "your listing"} — ${lead.name}`,
          html: emailHtml,
        }),
      });

      return NextResponse.json({ ok: true, emailed: true });
    }

    return NextResponse.json({ ok: true, emailed: false });
  } catch (err) {
    console.error("Lead notify error:", err);
    return NextResponse.json({ error: "Failed to notify" }, { status: 500 });
  }
}
