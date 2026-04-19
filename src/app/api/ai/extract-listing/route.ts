import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rateLimit";
import { hasActiveSubscription } from "@/lib/subscriptionGate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const auth = createServerSupabaseClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await hasActiveSubscription(user.id))) {
      return NextResponse.json(
        { error: "Subscription required. Upgrade to continue using AI features." },
        { status: 402 }
      );
    }

    const limited = rateLimit({ key: `ai-extract:${user.id}`, limit: 20, windowMs: 10 * 60_000 });
    if (!limited.ok) {
      return NextResponse.json({ error: "Slow down. Try again in a minute." }, { status: 429 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }
    if (text.length > 10_000) {
      return NextResponse.json({ error: "Description too long" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You extract real estate listing fields from MLS-style descriptions. Return ONLY a JSON object, no prose, no markdown fences. Use this exact shape:

{
  "street": string or null,
  "city": string or null,
  "state": 2-letter US state code or null,
  "zip": string or null,
  "price": number or null (dollars, no commas),
  "beds": number or null,
  "baths": number or null (allow decimals like 2.5),
  "sqft": number or null,
  "yearBuilt": number or null,
  "lotSize": string or null (keep format the agent typed, e.g. "0.25 acres" or "10,890 sqft"),
  "features": array of short strings (max 10, each under 80 chars),
  "description": string (a cleaned, readable version of the description, 2 to 4 paragraphs, no bullet lists, no em-dashes)
}

Rules:
- If a field isn't mentioned, use null (or [] for features).
- Never invent data. If the source doesn't say "4 bedrooms" don't guess.
- For description, rewrite for clarity and flow. Keep factual claims only.
- No em-dashes anywhere. Use periods or colons.
- Do not include any text outside the JSON.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Strip any accidental markdown fences, just in case
    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Could not parse extracted fields" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, fields: parsed });
  } catch (err) {
    console.error("Extract listing error:", err);
    return NextResponse.json({ error: "Failed to extract" }, { status: 500 });
  }
}
