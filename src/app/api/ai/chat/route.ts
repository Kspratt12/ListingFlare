import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AI_MODEL, createAnthropic } from "@/lib/ai";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AI_LISTING_COLUMNS, AI_LISTING_COLUMNS_BASE, type AiListingRow } from "@/lib/listingAiContext";
import { runChat, type ChatBody } from "@/lib/chatRun";
import { demoListing } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Buyer chatbot. The assistant's knowledge comes from the SAVED listing row (loaded here with the
// service role), never from the browser. See lib/listingAiContext.ts for what is included.
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    // Public endpoint (buyer chatbot) - rate limit by IP to prevent cost-bomb abuse.
    const ip = getClientIp(req);
    const limited = rateLimit({ key: `ai-chat:${ip}`, limit: 20, windowMs: 5 * 60_000 });
    if (!limited.ok) {
      return NextResponse.json({ error: "Too many messages. Please wait a moment." }, { status: 429 });
    }

    const body = (await req.json().catch(() => ({}))) as ChatBody;
    const db = getAdminClient();
    const client = createAnthropic(apiKey);

    const result = await runChat(body, {
      loadListing: async (id) => {
        const first = await db.from("listings").select(AI_LISTING_COLUMNS).eq("id", id).maybeSingle();
        if (!first.error) return (first.data as unknown as (AiListingRow & { agent_id: string }) | null) ?? null;
        // Migration 045 (ai_knowledge) not applied yet: answer from the base facts.
        const retry = await db.from("listings").select(AI_LISTING_COLUMNS_BASE).eq("id", id).maybeSingle();
        return (retry.data as unknown as (AiListingRow & { agent_id: string }) | null) ?? null;
      },
      loadAgent: async (agentId) => {
        const { data } = await db
          .from("agent_profiles")
          .select("name, phone, calendly_url, subscription_status, trial_ends_at")
          .eq("id", agentId)
          .maybeSingle();
        return data ?? null;
      },
      getUserId: async () => {
        if (!req.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return null;
        try {
          const { data: { user } } = await createServerSupabaseClient().auth.getUser();
          return user?.id ?? null;
        } catch {
          return null;
        }
      },
      callModel: async (system, messages) => {
        const response = await client.messages.create({ model: AI_MODEL, max_tokens: 300, system, messages });
        const textBlock = response.content.find((block) => block.type === "text");
        return textBlock && textBlock.type === "text" ? textBlock.text : "";
      },
      demo: {
        row: {
          status: "published",
          street: demoListing.address.street,
          city: demoListing.address.city,
          state: demoListing.address.state,
          zip: demoListing.address.zip,
          price: demoListing.price,
          beds: demoListing.beds,
          baths: demoListing.baths,
          sqft: demoListing.sqft,
          year_built: demoListing.yearBuilt,
          lot_size: demoListing.lotSize,
          description: demoListing.description,
          features: demoListing.features,
        },
        agent: { name: demoListing.agent.name, phone: demoListing.agent.phone },
      },
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 });
  }
}
