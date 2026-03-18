import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { type, property, existing } = body;

    if (!type || !property) {
      return NextResponse.json(
        { error: "Missing type or property data" },
        { status: 400 }
      );
    }

    const { street, city, state, zip, price, beds, baths, sqft, yearBuilt, lotSize } = property;

    const propertyContext = [
      street && `Address: ${street}`,
      city && `City: ${city}`,
      state && `State: ${state}`,
      zip && `ZIP: ${zip}`,
      price && `Price: $${Number(price).toLocaleString()}`,
      beds && `Bedrooms: ${beds}`,
      baths && `Bathrooms: ${baths}`,
      sqft && `Square Feet: ${Number(sqft).toLocaleString()}`,
      yearBuilt && `Year Built: ${yearBuilt}`,
      lotSize && `Lot Size: ${lotSize}`,
    ]
      .filter(Boolean)
      .join("\n");

    let prompt: string;

    if (type === "description") {
      prompt = `You are a luxury real estate copywriter. Write a compelling, professional property listing description for this home.

Property Details:
${propertyContext || "No specific details provided — write a general luxury property description."}
${existing ? `\nThe agent has started writing this:\n"${existing}"\n\nBuild on their text and expand it into a full description.` : ""}

Write 2-3 paragraphs that:
- Paint a vivid picture of the home and lifestyle it offers
- Highlight the key features based on the specs provided
- Use elegant, sophisticated language appropriate for luxury real estate
- Mention the location/neighborhood if address details are provided
- Do NOT use cheesy phrases like "dream home" or excessive exclamation marks
- Do NOT include the price or exact specs (those are shown separately on the page)
- Write in a warm, inviting tone that makes buyers want to schedule a showing

Return ONLY the description text, no headers or labels.`;
    } else if (type === "features") {
      prompt = `You are a luxury real estate copywriter. Generate 6-8 property highlight bullet points for this home.

Property Details:
${propertyContext || "No specific details provided — write general luxury home features."}
${existing ? `\nThe agent has started writing these features:\n"${existing}"\n\nBuild on their text and add more relevant features.` : ""}

Generate features that:
- Are specific and relevant to a home with these specs
- Mix architectural features, lifestyle benefits, and practical highlights
- Use concise, punchy phrases (not full sentences)
- Sound premium and sophisticated
- Include things like kitchen features, outdoor spaces, smart home tech, views, finishes, etc.
- Are realistic for a home at this price point and size

Return ONLY the bullet points, one per line, no numbering or dashes.`;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const text = textBlock ? textBlock.text : "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("AI generate error:", err);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
