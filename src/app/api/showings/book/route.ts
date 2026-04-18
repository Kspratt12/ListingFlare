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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      listingId,
      agentId,
      showingDate,
      showingTime,
      name,
      email,
      phone,
      message,
    } = body;

    if (!listingId || !agentId || !showingDate || !showingTime || !name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getAdminClient();

    // If no leadId was provided, find or create the lead
    let finalLeadId = leadId;
    if (!finalLeadId) {
      const { data: existingLead } = await db
        .from("leads")
        .select("id")
        .eq("listing_id", listingId)
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingLead) {
        finalLeadId = existingLead.id;
      } else {
        const { data: newLead } = await db
          .from("leads")
          .insert({
            listing_id: listingId,
            agent_id: agentId,
            name,
            email,
            phone: phone || "",
            message: message || `Showing requested for ${showingDate} at ${showingTime}`,
            status: "showing_scheduled",
          })
          .select("id")
          .single();
        finalLeadId = newLead?.id;
      }
    }

    if (!finalLeadId) {
      return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }

    // Update lead status to showing_scheduled
    await db
      .from("leads")
      .update({ status: "showing_scheduled", is_read: true })
      .eq("id", finalLeadId);

    // Insert the showing
    const { data: showing, error: showingErr } = await db
      .from("showings")
      .insert({
        lead_id: finalLeadId,
        listing_id: listingId,
        agent_id: agentId,
        showing_date: showingDate,
        showing_time: showingTime,
        name,
        email,
        phone: phone || "",
        message: message || "",
      })
      .select("id")
      .single();

    if (showingErr) {
      console.error("Showing insert error:", showingErr);
      return NextResponse.json({ error: "Failed to book showing" }, { status: 500 });
    }

    // Fetch listing and agent details for emails
    const [{ data: listing }, { data: agent }] = await Promise.all([
      db.from("listings").select("street, city, state, price").eq("id", listingId).single(),
      db.from("agent_profiles").select("name, phone, email, brokerage").eq("id", agentId).single(),
    ]);

    const listingAddress = listing
      ? `${listing.street}, ${listing.city}, ${listing.state}`
      : "the property";

    const formattedDate = new Date(showingDate + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && agent) {
      // 1. Send confirmation to buyer
      const buyerHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">Your Showing is Confirmed!</h2>
            <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
              Hi ${name.split(" ")[0]}, your showing has been scheduled. Here are the details:
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
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Agent</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${agent.name}</td>
                </tr>
              </table>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Need to reschedule? Reply to this email or call ${agent.phone ? formatPhone(agent.phone) : "your agent"}.
            </p>
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-weight: 600; color: #111827;">${agent.name}</p>
              ${agent.phone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${formatPhone(agent.phone)}</p>` : ""}
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agent.email}</p>
            </div>
          </div>
        </div>
      `;

      // 2. Send notification to agent
      const agentHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">New Showing Booked!</h2>
            <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
              A buyer has scheduled a showing for <strong>${listingAddress}</strong>.
            </p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">Buyer</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
                  <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #b8965a;">${email}</a></td>
                </tr>
                ${phone ? `<tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone</td>
                  <td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #b8965a;">${formatPhone(phone)}</a></td>
                </tr>` : ""}
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${showingTime}</td>
                </tr>
                ${message ? `<tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Notes</td>
                  <td style="padding: 8px 0; color: #111827;">${message}</td>
                </tr>` : ""}
              </table>
            </div>
            <div style="margin-top: 16px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com"}/dashboard/leads"
                style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                View in Dashboard
              </a>
            </div>
          </div>
        </div>
      `;

      // Send both emails in parallel
      await Promise.all([
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: `${agent.name} via ListingFlare <leads@listingflare.com>`,
            to: email,
            replyTo: agent.email,
            subject: `Showing Confirmed — ${listingAddress} on ${formattedDate}`,
            html: buyerHtml,
          }),
        }),
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "ListingFlare <leads@listingflare.com>",
            to: agent.email,
            subject: `Showing booked — ${name} for ${listingAddress}`,
            html: agentHtml,
          }),
        }),
      ]);
    }

    // Schedule follow-up drip sequence
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
    fetch(`${appUrl}/api/follow-ups/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: finalLeadId,
        listingId,
        agentId,
        sequenceType: "showing",
      }),
    }).catch((err) => console.error("Follow-up schedule error:", err));

    return NextResponse.json({ ok: true, showingId: showing?.id });
  } catch (err) {
    console.error("Showing booking error:", err);
    return NextResponse.json({ error: "Failed to book showing" }, { status: 500 });
  }
}
