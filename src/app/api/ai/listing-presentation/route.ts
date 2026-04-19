import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { listingId } = await req.json();
    if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 });

    // Fetch listing + agent
    const [{ data: listing }, { data: agent }, { count: totalListings }, { count: totalLeads }, { count: totalShowings }] =
      await Promise.all([
        authClient.from("listings").select("*").eq("id", listingId).eq("agent_id", user.id).single(),
        authClient.from("agent_profiles").select("*").eq("id", user.id).single(),
        authClient.from("listings").select("id", { count: "exact", head: true }).eq("agent_id", user.id),
        authClient.from("leads").select("id", { count: "exact", head: true }).eq("agent_id", user.id),
        authClient.from("showings").select("id", { count: "exact", head: true }).eq("agent_id", user.id),
      ]);

    if (!listing || !agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are helping a real estate listing agent create a brief marketing pitch for a potential seller.

Agent:
- Name: ${agent.name}
- Brokerage: ${agent.brokerage || "Independent"}
- Active listings: ${totalListings || 0}
- Buyer inquiries captured: ${totalLeads || 0}
- Showings booked: ${totalShowings || 0}

Property being pitched:
- ${listing.street}, ${listing.city}, ${listing.state}
- ${listing.beds}bd / ${listing.baths}ba
- ${listing.sqft?.toLocaleString()} sqft
- Listed at ${listing.price ? "$" + listing.price.toLocaleString() : "market"}

Generate 3 short paragraphs for a listing presentation. Each paragraph is 2-3 sentences max:

1. **Why this home stands out** — what makes this specific property compelling to buyers (based on the address/type/size)
2. **My marketing plan** — a confident summary of how ${agent.name} will market this home (mention: dedicated branded listing website, 24/7 AI chat answering buyer questions, instant lead follow-up, automated showing scheduling)
3. **Why choose me** — a confident, warm close from the agent's perspective (${agent.name}) to the seller

Rules:
- No em-dashes
- No hype words like "amazing" or "stunning"
- Confident, professional, warm
- Written as if the agent is speaking directly to the seller
- Do NOT include headings, just the 3 paragraphs separated by a blank line

Return ONLY the 3 paragraphs.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const content = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);

    return NextResponse.json({
      paragraphs,
      agent: {
        name: agent.name,
        title: agent.title,
        brokerage: agent.brokerage,
        phone: agent.phone,
        email: agent.email,
        headshot_url: agent.headshot_url,
      },
      listing: {
        street: listing.street,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        price: listing.price,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        photos: listing.photos,
      },
      stats: {
        totalListings: totalListings || 0,
        totalLeads: totalLeads || 0,
        totalShowings: totalShowings || 0,
      },
    });
  } catch (err) {
    console.error("Presentation gen error:", err);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
