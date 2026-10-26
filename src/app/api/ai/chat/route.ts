import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, createAnthropic } from "@/lib/ai";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    // Public endpoint (buyer chatbot) - rate limit by IP to prevent cost-bomb abuse.
    // 20 messages per 5 min is plenty for a real conversation.
    const ip = getClientIp(req);
    const limited = rateLimit({ key: `ai-chat:${ip}`, limit: 20, windowMs: 5 * 60_000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a moment." },
        { status: 429 }
      );
    }

    const { message, listing, history, calendlyUrl } = await req.json();

    if (!message || !listing) {
      return NextResponse.json({ error: "Missing message or listing" }, { status: 400 });
    }

    // Cap inputs so a single abusive call can't burn through tokens
    if (typeof message !== "string" || message.length > 2000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    // The listing object comes from the visitor's browser, so cap every field.
    // Otherwise one request could carry an enormous "description" and burn tokens.
    if (typeof listing !== "object" || listing === null || Array.isArray(listing)) {
      return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
    }
    const clip = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : v == null ? "" : String(v).slice(0, max));
    const features: string[] = Array.isArray(listing.features)
      ? listing.features.slice(0, 40).map((x: unknown) => clip(x, 80)).filter(Boolean)
      : [];
    const safeCalendly =
      typeof calendlyUrl === "string" && calendlyUrl.startsWith("https://") ? calendlyUrl.slice(0, 300) : "";
    const safe = {
      street: clip(listing.street, 120),
      city: clip(listing.city, 80),
      state: clip(listing.state, 40),
      zip: clip(listing.zip, 20),
      price: listing.price,
      beds: listing.beds,
      baths: listing.baths,
      sqft: listing.sqft,
      yearBuilt: clip(listing.yearBuilt, 10),
      lotSize: clip(listing.lotSize, 60),
      description: clip(listing.description, 4000),
      agentName: clip(listing.agentName, 100),
      agentPhone: clip(listing.agentPhone, 40),
    };

    const listingContext = [
      `Property: ${safe.street}, ${safe.city}, ${safe.state} ${safe.zip}`,
      safe.price && `Price: ${Number(safe.price).toLocaleString()}`,
      safe.beds && `Bedrooms: ${safe.beds}`,
      safe.baths && `Bathrooms: ${safe.baths}`,
      safe.sqft && `Square Feet: ${Number(safe.sqft).toLocaleString()}`,
      safe.yearBuilt && `Year Built: ${safe.yearBuilt}`,
      safe.lotSize && `Lot Size: ${safe.lotSize}`,
      safe.description && `Description: ${safe.description}`,
      features.length > 0 && `Key Features: ${features.join(", ")}`,
      safe.agentName && `Listing Agent: ${safe.agentName}`,
      safe.agentPhone && `Agent Phone: ${safe.agentPhone}`,
      safeCalendly && `Scheduling Link: ${safeCalendly}`,
    ].filter(Boolean).join("\n");

    const systemPrompt = `You work for ${safe.agentName || "the listing agent"}. You know this property inside and out from the listing details below. Talk in a natural, friendly way - not like a robot, not like a salesperson. You're texting with someone who's curious about the home.

THIS IS THE PROPERTY YOU KNOW:
${listingContext}

HOW TO TALK:
- Sound like a real human texting. Short, natural sentences. No corporate speak.
- Use the SPECIFIC details above. Don't say "this beautiful home" - say "the chef's kitchen" or "the 5 bedrooms" or whatever is actually relevant to their question.
- If they ask about bedrooms, don't just say "5 bedrooms" - add something useful like "5 beds with the primary on the upper level" or reference a feature that relates.
- Pull from the description and features to give rich, specific answers. You KNOW this house.
- 1-3 sentences max. Don't ramble.
- If they ask something you genuinely don't have info on (like HOA fees, school districts, exact utility costs), be honest: "I'd need to check on that - want me to have ${safe.agentName || "the agent"} get you that info?"
- If they're interested or want to see it:${safeCalendly ? ` Share the scheduling link: "${safeCalendly}" and say something like "You can book a showing right here:" followed by the link.` : ` Make it easy: "I can have ${safe.agentName || "the agent"} reach out - just drop your name and number and they'll text you."`}
- If someone sincerely asks whether you're a person, a bot or an AI, tell them plainly that you're ${safe.agentName || "the agent"}'s AI assistant for this listing, then keep helping. Never claim to be human or to have physically walked the property.
- NEVER make up details that aren't in the property info above.
- Don't use emojis. Don't use exclamation marks excessively. Sound like a calm, knowledgeable person.
- Match their energy - if they're casual, be casual. If they're formal, be professional.`;

    // Build conversation history for context
    const messages: Anthropic.Messages.MessageParam[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-8)) {
        if (!msg || typeof msg.text !== "string" || !msg.text.trim()) continue;
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text.slice(0, 1500),
        });
      }
    }

    messages.push({ role: "user", content: message });

    const client = createAnthropic(apiKey);

    const response = await client.messages.create({
      model: AI_MODEL,
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
