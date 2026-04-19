import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { escapeHtml } from "@/lib/escapeHtml";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public endpoint: buyer subscribes their email to price/status alerts on a listing
export async function POST(req: NextRequest) {
  try {
    const { listingId, email, honeypot } = await req.json();

    if (honeypot && String(honeypot).trim().length > 0) {
      return NextResponse.json({ ok: true }); // silent success for bots
    }

    if (!listingId || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Basic email validation
    const emailStr = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const db = getAdminClient();

    // Get the listing to find the agent
    const { data: listing } = await db
      .from("listings")
      .select("id, agent_id, street, city, state")
      .eq("id", listingId)
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const token = crypto.randomBytes(20).toString("hex");

    // Upsert - if already subscribed, reactivate
    const { error } = await db
      .from("listing_email_alerts")
      .upsert(
        {
          listing_id: listingId,
          agent_id: listing.agent_id,
          email: emailStr,
          unsubscribe_token: token,
          active: true,
        },
        { onConflict: "listing_id,email" }
      );

    if (error) {
      console.error("Alert subscribe error:", error);
      return NextResponse.json({ error: "Couldn't subscribe" }, { status: 500 });
    }

    // Send confirmation email
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
      const listingAddress = `${listing.street}, ${listing.city}, ${listing.state}`;
      const safeAddress = escapeHtml(listingAddress);
      const unsubUrl = `${appUrl}/api/listings/alerts/unsubscribe?token=${token}`;

      const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">You're subscribed to updates</h2>
            <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
              We'll email you whenever the price changes or the status updates on <strong>${safeAddress}</strong>. No spam, no marketing. Just the updates you asked for.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0;">
              Not you? <a href="${unsubUrl}" style="color: #b8965a;">Unsubscribe</a>.
            </p>
          </div>
        </div>
      `;

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "ListingFlare <leads@listingflare.com>",
          to: emailStr,
          subject: `Subscribed to updates on ${listingAddress}`,
          html,
        }),
      }).catch((err) => console.error("Alert confirm email error:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
