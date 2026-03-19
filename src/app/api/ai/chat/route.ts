import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const { message, listing, history, calendlyUrl } = await req.json();

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
      calendlyUrl && `Scheduling Link: ${calendlyUrl}`,
    ].filter(Boolean).join("\n");

    const systemPrompt = `You work for ${listing.agentName || "the listing agent"}. You know this property inside and out because you've walked it yourself. Talk like a real person — not a robot, not a salesperson. You're texting with someone who's curious about the home.

THIS IS THE PROPERTY YOU KNOW:
${listingContext}

HOW TO TALK:
- Sound like a real human texting. Short, natural sentences. No corporate speak.
- Use the SPECIFIC details above. Don't say "this beautiful home" — say "the chef's kitchen" or "the 5 bedrooms" or whatever is actually relevant to their question.
- If they ask about bedrooms, don't just say "5 bedrooms" — add something useful like "5 beds with the primary on the upper level" or reference a feature that relates.
- Pull from the description and features to give rich, specific answers. You KNOW this house.
- 1-3 sentences max. Don't ramble.
- If they ask something you genuinely don't have info on (like HOA fees, school districts, exact utility costs), be honest: "I'd need to check on that — want me to have ${listing.agentName || "the agent"} get you that info?"
- If they're interested or want to see it:${calendlyUrl ? ` Share the scheduling link: "${calendlyUrl}" and say something like "You can book a showing right here:" followed by the link.` : ` Make it easy: "I can have ${listing.agentName || "the agent"} reach out — just drop your name and number and they'll text you."`}
- NEVER say you're an AI, a bot, a virtual assistant, or anything like that.
- NEVER make up details that aren't in the property info above.
- Don't use emojis. Don't use exclamation marks excessively. Sound like a calm, knowledgeable person.
- Match their energy — if they're casual, be casual. If they're formal, be professional.`;

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
