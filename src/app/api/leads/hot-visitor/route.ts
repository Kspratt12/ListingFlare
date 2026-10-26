import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { escapeHtml } from "@/lib/escapeHtml";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
export const dynamic = "force-dynamic";

// Called when a visitor views the same listing 3+ times - alert the agent
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listingId, agentId } = body;
    const viewCount = Math.floor(Number(body.viewCount));

    if (!listingId || !agentId || typeof listingId !== "string" || typeof agentId !== "string") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    // This is public, so never trust the count: it goes into an email to the agent.
    if (!Number.isFinite(viewCount) || viewCount < 3 || viewCount > 50) {
      return NextResponse.json({ error: "Invalid view count" }, { status: 400 });
    }

    // Anyone can call this, so cap it: per visitor, and one alert per listing per 6 hours.
    const ipLimit = rateLimit({ key: `hot-ip:${getClientIp(req)}`, limit: 10, windowMs: 60 * 60_000 });
    if (!ipLimit.ok) return NextResponse.json({ ok: true, emailed: false });
    const listingLimit = rateLimit({ key: `hot-listing:${listingId}`, limit: 1, windowMs: 6 * 60 * 60_000 });
    if (!listingLimit.ok) return NextResponse.json({ ok: true, emailed: false });

    const supabase = createServerSupabaseClient();

    // Fetch the listing first and trust ITS agent, not the one the browser claimed
    const { data: listing } = await supabase
      .from("listings")
      .select("street, city, state, price, agent_id")
      .eq("id", listingId)
      .single();

    if (!listing || listing.agent_id !== agentId) {
      return NextResponse.json({ ok: true, emailed: false });
    }

    const { data: agent } = await supabase
      .from("agent_profiles")
      .select("name, email")
      .eq("id", listing.agent_id)
      .single();

    if (!agent?.email) {
      return NextResponse.json({ ok: true, emailed: false });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ ok: true, emailed: false });
    }

    const price = listing?.price
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(listing.price)
      : "";

    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #92400e;">Hot Visitor Alert</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #a16207;">Someone has viewed your listing <strong>${viewCount} times</strong>. They might be seriously interested.</p>
          </div>
          <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px;">${escapeHtml(listing?.street || "Your listing")}</h2>
          <p style="color: #6b7280; margin: 0 0 4px; font-size: 14px;">
            ${listing ? `${escapeHtml(listing.city)}, ${escapeHtml(listing.state)}` : ""}${price ? ` - ${price}` : ""}
          </p>
          <p style="color: #6b7280; margin: 16px 0 0; font-size: 14px;">
            A potential buyer keeps coming back to this property page. This is a strong signal of interest - consider reaching out to recent leads for this listing.
          </p>
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com"}/dashboard/leads"
              style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              View Your Leads
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
        subject: `🔥 Hot visitor - someone viewed ${listing?.street || "your listing"} ${viewCount} times`,
        html: emailHtml,
      }),
    });

    return NextResponse.json({ ok: true, emailed: true });
  } catch (err) {
    console.error("Hot visitor alert error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
