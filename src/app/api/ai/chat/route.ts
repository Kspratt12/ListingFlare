import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const { message, listing, history } = await req.json();

    if (!message || !listing) {
      return NextResponse.json({ error: "Missing message or listing" }, { status: 400 });
    }

    const listingContext = [
      `Property: ${listing.street}, ${listing.city}, ${listing.state} ${listing.zip}`,
      listing.price && `Price: $${Number(listing.price).toLocaleString()}`,
      listing.beds && `Bedrooms: ${listing.beds}`,
      listing.baths && `Bathrooms: ${listing.baths}`,
      listing.sqft && `Square Feet: ${Number(listing.sqft).toLocaleString()}`,
      listing.yearBuilt && `Year Built: ${listing.yearBuilt}`,
      listing.lotSize && `Lot Size: ${listing.lotSize}`,
      listing.description && `Description: ${listing.description}`,
      listing.features?.length && `Key Features: ${listing.features.join(", ")}`,
      listing.agentName && `Listing Agent: ${listing.agentName}`,
      listing.agentPhone && `Agent Phone: ${listing.agentPhone}`,
    ].filter(Boolean).join("\n");

    const systemPrompt = `You are a friendly, knowledgeable real estate assistant on a property listing website. You represent the listing agent and help potential buyers learn about this property.

PROPERTY DETAILS:
${listingContext}

GUIDELINES:
- Answer questions about this property using ONLY the details provided above
- Be warm, helpful, and conversational — like a great real estate agent
- Keep responses concise (2-3 sentences max)
- If asked about something not in the property details, say you'd be happy to connect them with the agent for more info
- If the buyer seems interested or asks about scheduling a showing, encourage them to share their name and contact info so the agent can reach out
- Never make up details about the property that aren't in the information above
- Never discuss other properties or competitors
- Do NOT mention you are an AI or chatbot — just be helpful
- Use a professional but approachable tone`;

    // Build conversation history for context
    const messages: Anthropic.Messages.MessageParam[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-8)) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text,
        });
      }
    }

    messages.push({ role: "user", content: message });

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const reply = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "I'd be happy to help! Could you tell me what you'd like to know about this property?";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
