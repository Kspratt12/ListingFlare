import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";
import { hasActiveSubscription } from "@/lib/subscriptionGate";

export const dynamic = "force-dynamic";

// Generates the caption + hashtags block that goes with the Social Media
// Pack download. Returns plain text the agent can copy-paste into IG,
// FB, or the caption.txt in the downloaded zip.
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasActiveSubscription(user.id))) {
      return NextResponse.json(
        { error: "Subscription required. Upgrade to continue using AI features." },
        { status: 402 }
      );
    }

    const limited = rateLimit({
      key: `ai-social-caption:${user.id}`,
      limit: 15,
      windowMs: 10 * 60_000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Slow down - too many requests. Try again in a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      street,
      city,
      state,
      price,
      beds,
      baths,
      sqft,
      features,
      description,
      publicUrl,
      agentName,
    } = body as {
      street?: string;
      city?: string;
      state?: string;
      price?: string;
      beds?: number;
      baths?: number;
      sqft?: number;
      features?: string[];
      description?: string;
      publicUrl?: string;
      agentName?: string;
    };

    if (!street || !city) {
      return NextResponse.json({ error: "Missing listing details" }, { status: 400 });
    }

    const featureLine = features && features.length > 0
      ? `Top features: ${features.slice(0, 4).join(", ")}.`
      : "";
    const descSnippet = description ? `\n\nListing description (for tone and key selling points): ${description.slice(0, 600)}` : "";

    const prompt = `You write Instagram and Facebook captions for a real estate agent. Write ONE caption for this listing, then a block of 12-18 hashtags.

Listing:
- ${beds} bed / ${baths} bath / ${sqft?.toLocaleString?.()} sqft
- ${street}, ${city}, ${state}
- Asking ${price}
${featureLine}${descSnippet}

Tone: warm, confident, luxurious but not cheesy. Written in the agent's voice ("${agentName || "the listing agent"}"). Address buyers directly ("imagine hosting..."). Use 1-3 emojis total, not more. No hashtags in the caption body. End with a call to action that points buyers to the listing page.

Format the output EXACTLY like this, nothing else:

[caption text, 3-5 short lines, blank line between paragraphs]

Link: ${publicUrl || ""}

#hashtag1 #hashtag2 #hashtag3 ...

Hashtag rules:
- Mix national real estate tags (#justlisted #dreamhome #realestate) with city-specific tags (#${city.replace(/\s+/g, "")}realestate, #${city.replace(/\s+/g, "")}homes)
- ${state ? `Include one state tag like #${state}realestate.` : ""}
- 12-18 total, space-separated, on one line.

Return just the caption + Link + hashtag line. No preamble, no explanation.`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    return NextResponse.json({ caption: text });
  } catch (err) {
    console.error("AI social caption error:", err);
    return NextResponse.json({ error: "Failed to generate caption" }, { status: 500 });
  }
}
