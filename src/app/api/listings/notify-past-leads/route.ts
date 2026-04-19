import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/formatters";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Triggered when an agent publishes a listing.
// Emails past leads in the same city who haven't converted yet.
export async function POST(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = await req.json();
    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    const db = getAdminClient();

    const { data: listing } = await db
      .from("listings")
      .select("id, agent_id, street, city, state, price, beds, baths, sqft, slug, photos, status")
      .eq("id", listingId)
      .single();

    if (!listing || listing.agent_id !== user.id) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.status !== "published") {
      return NextResponse.json({ ok: true, notified: 0, note: "Listing not published" });
    }

    const { data: agent } = await db
      .from("agent_profiles")
      .select("name, phone, email, subscription_status, trial_ends_at")
      .eq("id", listing.agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Find past leads in the same city, from a different listing, not already converted,
    // and not already notified about this listing.
    const { data: pastLeads } = await db
      .from("leads")
      .select("id, name, email, listing_id, listing:listings!inner(city, state)")
      .eq("agent_id", listing.agent_id)
      .neq("listing_id", listing.id)
      .not("status", "in", "(closed,lost,under_contract)")
      .eq("listing.city", listing.city)
      .eq("listing.state", listing.state);

    if (!pastLeads || pastLeads.length === 0) {
      return NextResponse.json({ ok: true, notified: 0 });
    }

    // Filter out leads that already got notified about this listing
    const { data: alreadyNotified } = await db
      .from("listing_notifications")
      .select("lead_id")
      .eq("listing_id", listing.id);

    const notifiedSet = new Set((alreadyNotified || []).map((n) => n.lead_id));
    const toNotify = pastLeads.filter((l) => !notifiedSet.has(l.id));

    if (toNotify.length === 0) {
      return NextResponse.json({ ok: true, notified: 0 });
    }

    // Dedupe by email (multiple inquiries from same buyer across listings)
    const seenEmails = new Set<string>();
    const uniqueLeads = toNotify.filter((l) => {
      if (!l.email || seenEmails.has(l.email)) return false;
      seenEmails.add(l.email);
      return true;
    });

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ ok: true, notified: 0, note: "No Resend key" });
    }

    const listingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com"}/listing/${listing.slug || listing.id}`;
    const heroImage = (listing.photos as Array<{ src: string }>)?.[0]?.src;
    const price = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(listing.price);

    let notified = 0;
    await Promise.allSettled(
      uniqueLeads.map(async (lead) => {
        const html = `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
            </div>
            <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
              <h2 style="margin: 0 0 8px; color: #111827;">A new listing you might love</h2>
              <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
                Hi ${lead.name.split(" ")[0]}, I just listed a new home in ${listing.city} that reminded me of what you were looking for.
              </p>
              ${heroImage ? `<img src="${heroImage}" alt="${listing.street}" style="width: 100%; max-height: 320px; object-fit: cover; border-radius: 12px; margin: 0 0 16px;" />` : ""}
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 0 0 20px;">
                <p style="margin: 0 0 4px; color: #111827; font-weight: 600; font-size: 16px;">${listing.street}</p>
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">${listing.city}, ${listing.state}</p>
                <p style="margin: 0 0 8px; color: #b8965a; font-weight: 600; font-size: 18px;">${price}</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  ${listing.beds} bed · ${listing.baths} bath${listing.sqft ? ` · ${listing.sqft.toLocaleString()} sqft` : ""}
                </p>
              </div>
              <div style="margin: 0 0 16px;">
                <a href="${listingUrl}"
                  style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                  View Listing
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Want to see it in person? Just reply and I'll set up a showing.
              </p>
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
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
            subject: `New in ${listing.city}: ${listing.street} - ${price}`,
            html,
          }),
        });

        if (res.ok) {
          await db.from("listing_notifications").insert({
            listing_id: listing.id,
            lead_id: lead.id,
            agent_id: listing.agent_id,
            notification_type: "new_listing",
          });
          notified++;
        }
      })
    );

    return NextResponse.json({ ok: true, notified });
  } catch (err) {
    console.error("Notify past leads error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
