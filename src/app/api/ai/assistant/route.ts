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

    const { message, history } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch agent's data for context
    const [profileRes, listingsRes, leadsRes] = await Promise.all([
      supabase.from("agent_profiles").select("name, brokerage, phone, email").eq("id", user.id).single(),
      supabase.from("listings").select("id, street, city, state, price, status, view_count, beds, baths, sqft").eq("agent_id", user.id).order("view_count", { ascending: false }),
      supabase.from("leads").select("id, name, email, phone, message, status, created_at, listing_id").eq("agent_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const agent = profileRes.data;
    const listings = listingsRes.data || [];
    const leads = leadsRes.data || [];

    const totalViews = listings.reduce((sum, l) => sum + (l.view_count || 0), 0);
    const publishedCount = listings.filter((l) => l.status === "published").length;
    const newLeads = leads.filter((l) => l.status === "new").length;

    const listingSummary = listings.slice(0, 10).map((l) =>
      `- ${l.street}, ${l.city}, ${l.state} | $${l.price?.toLocaleString()} | ${l.beds}bd/${l.baths}ba | ${l.view_count} views | ${l.status}`
    ).join("\n");

    const leadSummary = leads.slice(0, 10).map((l) => {
      const listing = listings.find((li) => li.id === l.listing_id);
      return `- ${l.name} (${l.email}) | ${l.status} | ${listing?.street || "Unknown listing"} | "${l.message || "No message"}" | ${new Date(l.created_at).toLocaleDateString()}`;
    }).join("\n");

    const systemPrompt = `You are a smart, no-BS real estate business assistant for ${agent?.name || "an agent"}${agent?.brokerage ? ` at ${agent.brokerage}` : ""}. You help them manage their listings, leads, and marketing strategy.

THEIR DATA RIGHT NOW:
- ${publishedCount} active listings, ${totalViews} total views, ${leads.length} total leads (${newLeads} new)
- Agent: ${agent?.name || "Unknown"}, ${agent?.email || ""}, ${agent?.phone || ""}

TOP LISTINGS:
${listingSummary || "No listings yet"}

RECENT LEADS:
${leadSummary || "No leads yet"}

HOW TO HELP:
- Answer questions about their business data with specific numbers
- Write follow-up messages, listing descriptions, social media copy — whatever they ask
- Give actionable advice — not generic tips. Use THEIR data.
- If they ask "how am I doing" — tell them the truth based on their numbers
- If they ask to write something, write it ready to copy-paste. No preamble.
- Keep responses concise. Agents are busy.
- Sound like a sharp business partner, not a customer service bot.`;

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
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const reply = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "Something went wrong. Try again?";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Assistant error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
