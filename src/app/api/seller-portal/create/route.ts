import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

export async function POST(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { listingId, sellerName, sellerEmail, sendInvite = true } = body;

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    const db = getAdminClient();

    // Verify the agent owns this listing before creating a portal for it
    const { data: listing } = await db
      .from("listings")
      .select("id, agent_id, street, city, state")
      .eq("id", listingId)
      .single();

    if (!listing || listing.agent_id !== user.id) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // If a portal already exists for this listing, reuse it (don't duplicate)
    const { data: existing } = await db
      .from("seller_portals")
      .select("id, access_token, seller_email, seller_name")
      .eq("listing_id", listingId)
      .eq("active", true)
      .maybeSingle();

    let portalId: string;
    let token: string;

    if (existing) {
      portalId = existing.id;
      token = existing.access_token;
      // Update seller info if provided and different
      if (sellerEmail || sellerName) {
        await db
          .from("seller_portals")
          .update({
            seller_email: sellerEmail || existing.seller_email,
            seller_name: sellerName || existing.seller_name,
          })
          .eq("id", portalId);
      }
    } else {
      token = crypto.randomBytes(24).toString("hex");
      const { data: newPortal, error } = await db
        .from("seller_portals")
        .insert({
          listing_id: listingId,
          agent_id: user.id,
          seller_name: sellerName || null,
          seller_email: sellerEmail || null,
          access_token: token,
          active: true,
        })
        .select("id")
        .single();
      if (error || !newPortal) {
        console.error("Create seller portal error:", error);
        return NextResponse.json({ error: "Failed to create portal" }, { status: 500 });
      }
      portalId = newPortal.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
    const portalUrl = `${appUrl}/seller/${token}`;

    // Optionally send invite email
    if (sendInvite && sellerEmail) {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        // Fetch agent for branding
        const { data: agent } = await db
          .from("agent_profiles")
          .select("name, email")
          .eq("id", user.id)
          .single();

        const agentName = agent?.name || "Your Agent";
        const listingAddress = `${listing.street}, ${listing.city}, ${listing.state}`;

        const safeAgent = escapeHtml(agentName);
        const safeAddress = escapeHtml(listingAddress);
        const safeSeller = escapeHtml(sellerName || "there");
        const safeUrl = escapeHtml(portalUrl);

        const html = `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
            </div>
            <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
              <h2 style="margin: 0 0 8px; color: #111827;">Your listing dashboard is ready</h2>
              <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
                Hi ${safeSeller}, ${safeAgent} set up a private dashboard where you can watch your listing at ${safeAddress} perform in real time. See views, leads, and scheduled showings whenever you want. No login needed.
              </p>
              <div style="text-align: center; margin: 0 0 24px;">
                <a href="${safeUrl}" style="display: inline-block; background: #b8965a; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
                  View Your Dashboard
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                Save this email. You can come back to your dashboard anytime with the link above.
              </p>
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
            from: `${agentName} via ListingFlare <leads@listingflare.com>`,
            to: sellerEmail,
            subject: `Your listing dashboard for ${listing.street}`,
            html,
          }),
        }).catch((err) => console.error("Invite email error:", err));
      }
    }

    return NextResponse.json({ ok: true, portalId, token, url: portalUrl });
  } catch (err) {
    console.error("Seller portal create error:", err);
    return NextResponse.json({ error: "Failed to create portal" }, { status: 500 });
  }
}
