import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { formatPhone } from "@/lib/formatters";

export const dynamic = "force-dynamic";

// Admin client — this endpoint is called server-to-server (no cookies)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    const db = getAdminClient();

    // Fetch lead with listing details
    const { data: lead } = await db
      .from("leads")
      .select("id, name, email, message, listing_id, agent_id")
      .eq("id", leadId)
      .single();

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Fetch listing details
    const { data: listing } = await db
      .from("listings")
      .select("street, city, state, price, beds, baths, sqft, description, features")
      .eq("id", lead.listing_id)
      .single();

    // Fetch agent info
    const { data: agent } = await db
      .from("agent_profiles")
      .select("name, phone, email, brokerage")
      .eq("id", lead.agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const listingContext = listing
      ? [
          `Property: ${listing.street}, ${listing.city}, ${listing.state}`,
          listing.price && `Price: $${listing.price.toLocaleString()}`,
          listing.beds && `${listing.beds} bed`,
          listing.baths && `${listing.baths} bath`,
          listing.sqft && `${listing.sqft.toLocaleString()} sqft`,
          listing.features?.length && `Key features: ${listing.features.slice(0, 3).join(", ")}`,
        ]
          .filter(Boolean)
          .join(" | ")
      : "a property listing";

    const prompt = `You are a warm, professional real estate agent named ${agent.name} from ${agent.brokerage || "a top local brokerage"}. A potential buyer just submitted an inquiry about a property.

Lead name: ${lead.name}
Their message: "${lead.message || "They expressed interest in the property."}"
Property: ${listingContext}

Write a brief, personalized follow-up email (3-4 sentences max). Guidelines:
- Address them by first name
- Acknowledge their specific interest or message
- Mention one appealing detail about the property
- Offer to schedule a showing or answer questions
- Be warm and genuine, not salesy or pushy
- Do NOT include a subject line, greeting like "Dear", or sign-off — just the body text
- Do NOT mention the price (it feels pushy in a first response)
- Keep it conversational and under 60 words`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const draft = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (draft) {
      await db
        .from("leads")
        .update({ auto_reply_draft: draft })
        .eq("id", leadId);

      // Auto-send the reply to the buyer via Resend
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey && lead.email) {
        const listingAddress = listing
          ? `${listing.street}, ${listing.city}, ${listing.state}`
          : "your inquiry";

        const emailHtml = `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
            </div>
            <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
              <p style="color: #6b7280; margin: 0 0 8px; font-size: 14px;">
                Re: ${listingAddress}
              </p>
              <p style="color: #111827; margin: 0 0 24px; font-size: 14px;">
                Hi ${lead.name.split(" ")[0]},
              </p>
              <div style="color: #111827; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${draft}</div>
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-weight: 600; color: #111827;">${agent.name}</p>
                ${agent.phone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${formatPhone(agent.phone)}</p>` : ""}
                <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agent.email}</p>
              </div>
            </div>
          </div>
        `;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: `${agent.name} via ListingFlare <leads@listingflare.com>`,
            to: lead.email,
            replyTo: agent.email,
            subject: `Re: ${listingAddress} — ${agent.name}`,
            html: emailHtml,
          }),
        });

        // Only mark as contacted if email actually sent
        if (emailRes.ok) {
          await db
            .from("leads")
            .update({ status: "contacted" })
            .eq("id", leadId);
        } else {
          console.error("Auto-reply email failed:", await emailRes.text().catch(() => "unknown"));
        }
      }
    }

    return NextResponse.json({ draft });
  } catch (err) {
    console.error("Auto-reply error:", err);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
