import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

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

    // Dashboard-only feature - require auth
    const authClient = createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 30 caption requests per 10 min per user - covers any realistic editing session
    const limited = rateLimit({
      key: `ai-caption:${user.id}`,
      limit: 30,
      windowMs: 10 * 60_000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Slow down - too many requests. Try again in a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { photoUrls, property } = body;

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json(
        { error: "Missing photoUrls array" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    const propertyContext = property
      ? [
          property.street && `Address: ${property.street}`,
          property.city && `City: ${property.city}`,
          property.beds && `Bedrooms: ${property.beds}`,
          property.baths && `Bathrooms: ${property.baths}`,
          property.sqft && `Sqft: ${property.sqft}`,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

    // Build content blocks: one image block per photo + the text prompt
    const imageBlocks: Anthropic.Messages.ContentBlockParam[] = photoUrls.map(
      (url: string) => ({
        type: "image" as const,
        source: {
          type: "url" as const,
          url,
        },
      })
    );

    const prompt = `You are a luxury real estate photo captioner. For each of the ${photoUrls.length} property photos above, write a short, elegant caption (5-10 words) that describes what is shown in the image.

${propertyContext ? `Property context: ${propertyContext}` : ""}

Guidelines:
- Be specific about what you see (e.g. "Sun-drenched open concept living area" not "Living room")
- Use sophisticated, luxury real estate language
- Keep each caption concise - 5 to 10 words max
- Do NOT use quotes, numbering, or bullet points
- Do NOT mention "photo" or "image"
- Each caption should feel like it belongs in a high-end listing magazine

Return EXACTLY ${photoUrls.length} captions, one per line, in the same order as the photos. Nothing else.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    const captions = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, photoUrls.length);

    // Pad with empty strings if we got fewer captions than photos
    while (captions.length < photoUrls.length) {
      captions.push("");
    }

    return NextResponse.json({ captions });
  } catch (err) {
    console.error("AI caption error:", err);
    return NextResponse.json(
      { error: "Failed to generate captions" },
      { status: 500 }
    );
  }
}
