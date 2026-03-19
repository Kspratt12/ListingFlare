import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

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

    const supabase = createServerSupabaseClient();

    // Fetch lead with listing details
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, email, message, listing_id, agent_id")
      .eq("id", leadId)
      .single();

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Fetch listing details
    const { data: listing } = await supabase
      .from("listings")
      .select("street, city, state, price, beds, baths, sqft, description, features")
      .eq("id", lead.listing_id)
      .single();

    // Fetch agent info
    const { data: agent } = await supabase
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
      await supabase
        .from("leads")
        .update({ auto_reply_draft: draft })
        .eq("id", leadId);
    }

    return NextResponse.json({ draft });
  } catch (err) {
    console.error("Auto-reply error:", err);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
