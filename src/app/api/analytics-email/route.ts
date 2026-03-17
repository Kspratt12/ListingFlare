import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

// This endpoint is called by a cron job (Vercel Cron) every Monday at 8am EST
// It sends each agent a summary of their past 7 days
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const resend = new Resend(resendKey);

  // Get all agents who have weekly_emails enabled (default true)
  const { data: agents } = await supabase
    .from("agent_profiles")
    .select("id, name, email, weekly_emails")
    .neq("email", "");

  if (!agents || agents.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let sentCount = 0;

  for (const agent of agents) {
    // Skip if they opted out
    if (agent.weekly_emails === false) continue;

    // Get their listings with view counts
    const { data: listings } = await supabase
      .from("listings")
      .select("id, street, city, state, view_count, status")
      .eq("agent_id", agent.id)
      .eq("status", "published");

    if (!listings || listings.length === 0) continue;

    // Get new leads in the past 7 days
    const { data: newLeads } = await supabase
      .from("leads")
      .select("id, name, listing_id, created_at")
      .eq("agent_id", agent.id)
      .gte("created_at", sevenDaysAgo);

    const totalViews = listings.reduce((sum, l) => sum + (l.view_count || 0), 0);
    const topListing = listings.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0];
    const leadCount = newLeads?.length || 0;

    // Build email
    const listingRows = listings.map((l) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
          <strong style="color: #111827;">${l.street}</strong><br/>
          <span style="color: #6b7280; font-size: 13px;">${l.city}, ${l.state}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; color: #111827; font-weight: 600;">
          ${l.view_count || 0}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; color: #111827;">
          ${(newLeads || []).filter((lead) => lead.listing_id === l.id).length}
        </td>
      </tr>
    `).join("");

    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 14px;">Weekly Performance Report</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0;">
          <h2 style="margin: 0 0 4px; color: #111827; font-size: 22px;">Hi ${agent.name.split(" ")[0]},</h2>
          <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">Here's how your listings performed this week.</p>

          <!-- Stats -->
          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="flex: 1; background: #fef3c7; border-radius: 12px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #92400e;">${totalViews}</div>
              <div style="font-size: 13px; color: #92400e;">Total Views</div>
            </div>
            <div style="flex: 1; background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #166534;">${leadCount}</div>
              <div style="font-size: 13px; color: #166534;">New Leads</div>
            </div>
            <div style="flex: 1; background: #eff6ff; border-radius: 12px; padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #1e40af;">${listings.length}</div>
              <div style="font-size: 13px; color: #1e40af;">Active Listings</div>
            </div>
          </div>

          ${topListing ? `
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #6b7280;">Top Performing Listing</p>
            <p style="margin: 4px 0 0; font-weight: 600; color: #111827;">${topListing.street}, ${topListing.city} — ${topListing.view_count} views</p>
          </div>
          ` : ""}

          <!-- Listing breakdown -->
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Listing</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Views</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Leads</th>
              </tr>
            </thead>
            <tbody>
              ${listingRows}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://listing-flare.vercel.app"}/dashboard"
              style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
              View Dashboard
            </a>
          </div>
        </div>
        <div style="padding: 16px 32px; text-align: center; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px; background: #f9fafb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            You're receiving this because you have weekly emails enabled.
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://listing-flare.vercel.app"}/dashboard/settings" style="color: #b8965a;">Manage preferences</a>
          </p>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: "ListingFlare <reports@listingflare.com>",
        to: agent.email,
        subject: `Your Weekly Report — ${totalViews} views, ${leadCount} new leads`,
        html: emailHtml,
      });
      sentCount++;
    } catch (err) {
      console.error(`Failed to send analytics email to ${agent.email}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent: sentCount });
}
