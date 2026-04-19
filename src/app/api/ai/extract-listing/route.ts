import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rateLimit";
import { hasActiveSubscription } from "@/lib/subscriptionGate";

export const dynamic = "force-dynamic";

// Block URLs that would let an attacker use our server to probe internal hosts
function isSafeUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0") return false;
    // Block private IPv4 ranges and loopback
    if (/^127\./.test(host)) return false;
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    // Block raw IPv6 loopback and link-local
    if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc00:") || host.startsWith("fd00:")) return false;
    return true;
  } catch {
    return false;
  }
}

// Pull readable text out of HTML. Not perfect but good enough for Claude to parse.
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ListingFlareBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        return { ok: false, error: "This site blocks automated fetches (common on Zillow, Realtor.com). Paste the description instead." };
      }
      return { ok: false, error: `Site returned ${res.status}. Try pasting the description instead.` };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { ok: false, error: "URL must point to a webpage." };
    }

    const html = await res.text();
    const text = htmlToText(html);
    if (text.length < 100) {
      return { ok: false, error: "Couldn't find readable content at that URL. Paste the description instead." };
    }

    // Cap at 20k chars - listings rarely need more context than that
    return { ok: true, text: text.slice(0, 20000) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("aborted") || msg.includes("timeout")) {
      return { ok: false, error: "Site took too long to respond. Paste the description instead." };
    }
    return { ok: false, error: "Couldn't reach that URL. Paste the description instead." };
  }
}

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

    const { text: rawInput } = await req.json();
    if (!rawInput || typeof rawInput !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const trimmed = rawInput.trim();

    // Figure out if this is a URL or raw text
    let sourceText: string;
    const looksLikeUrl = /^https?:\/\//i.test(trimmed);

    if (looksLikeUrl) {
      if (!isSafeUrl(trimmed)) {
        return NextResponse.json({ error: "That URL isn't allowed. Paste the description instead." }, { status: 400 });
      }
      const fetched = await fetchPageText(trimmed);
      if (!fetched.ok) {
        return NextResponse.json({ error: fetched.error }, { status: 400 });
      }
      sourceText = fetched.text;
    } else {
      if (trimmed.length > 10_000) {
        return NextResponse.json({ error: "Description too long" }, { status: 400 });
      }
      sourceText = trimmed;
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You extract real estate listing fields from MLS-style descriptions or scraped webpage text. Return ONLY a JSON object, no prose, no markdown fences. Use this exact shape:

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
  "lotSize": string or null (keep format like "0.25 acres" or "10,890 sqft"),
  "features": array of short strings (max 10, each under 80 chars),
  "description": string (a cleaned, readable version, 2 to 4 paragraphs, no bullet lists, no em-dashes),

  "mlsId": string or null (MLS listing number if mentioned),
  "county": string or null,
  "subdivision": string or null (neighborhood name),
  "architecturalStyle": string or null (e.g. "Colonial", "Ranch", "Craftsman", "Contemporary"),
  "propertySubtype": string or null (e.g. "Single Family Residence", "Condo", "Townhouse"),
  "stories": number or null,
  "parkingSpaces": number or null (garage spaces),
  "propertyTaxAnnual": number or null (dollars/year, no commas),
  "hoaRequired": boolean or null,
  "hoaFeeMonthly": number or null (monthly dollars, no commas),
  "heatingType": string or null,
  "coolingType": string or null,
  "waterSource": string or null (e.g. "Public", "Well"),
  "sewerType": string or null (e.g. "Public Sewer", "Septic Tank"),
  "roofType": string or null,
  "constructionMaterial": string or null,
  "foundationType": string or null,
  "appliances": array of short strings or empty (e.g. ["Refrigerator", "Dishwasher", "Washer", "Dryer"]),
  "schoolElementary": string or null,
  "schoolMiddle": string or null,
  "schoolHigh": string or null
}

Rules:
- If a field isn't mentioned, use null (or [] for arrays).
- Never invent data. If the source doesn't say "4 bedrooms" don't guess.
- The input may be raw webpage text with navigation and junk mixed in. Ignore non-listing content.
- For description, rewrite for clarity and flow. Keep factual claims only.
- Convert HOA / taxes to numbers without dollar signs or commas.
- If HOA is explicitly "no HOA" or "0", set hoaRequired to false. If a monthly fee is mentioned, set hoaRequired to true.
- No em-dashes anywhere. Use periods or colons.
- Do not include any text outside the JSON.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: sourceText }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

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
