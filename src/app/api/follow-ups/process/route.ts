import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { formatPhone } from "@/lib/formatters";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Vercel cron auth check
function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Allow in development
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!apiKey || !resendKey) {
    return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
  }

  const db = getAdminClient();
  const now = new Date().toISOString();

  // Fetch pending follow-ups that are due
  const { data: followUps, error: fetchErr } = await db
    .from("follow_ups")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  if (fetchErr || !followUps || followUps.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const anthropic = new Anthropic({ apiKey });

  const results = await Promise.allSettled(followUps.map(async (followUp) => {
    try {
      // Check if lead has been marked as closed/lost — skip if so
      const { data: lead } = await db
        .from("leads")
        .select("id, name, email, phone, message, status")
        .eq("id", followUp.lead_id)
        .single();

      if (!lead || lead.status === "closed" || lead.status === "lost" || lead.status === "under_contract") {
        await db
          .from("follow_ups")
          .update({ status: "skipped" })
          .eq("id", followUp.id);
        return false;
      }

      // Fetch agent
      const { data: agent } = await db
        .from("agent_profiles")
        .select("name, phone, email, brokerage, subscription_status, trial_ends_at")
        .eq("id", followUp.agent_id)
        .single();

      if (!agent) {
        await db.from("follow_ups").update({ status: "skipped" }).eq("id", followUp.id);
        return false;
      }

      // Skip if agent's subscription is expired
      const isPaid = agent.subscription_status === "active";
      const isTrialing = agent.subscription_status === "trialing";
      const trialEnd = agent.trial_ends_at ? new Date(agent.trial_ends_at) : null;
      const isExpired = isTrialing && trialEnd !== null && trialEnd < new Date();
      if (isExpired && !isPaid) {
        await db.from("follow_ups").update({ status: "skipped" }).eq("id", followUp.id);
        return false;
      }

      // Fetch listing
      const { data: listing } = await db
        .from("listings")
        .select("street, city, state, price, beds, baths, sqft, features")
        .eq("id", followUp.listing_id)
        .single();

      const listingAddress = listing
        ? `${listing.street}, ${listing.city}, ${listing.state}`
        : "the property";

      // Generate follow-up email content with AI
      const dayContextMap: Record<number, string> = {
        1: followUp.sequence_type === "showing"
          ? "They had a showing yesterday. Check in on how it went and if they have questions."
          : "They inquired yesterday. Follow up warmly to keep the conversation going.",
        3: followUp.sequence_type === "showing"
          ? "It's been 3 days since their showing. Gently ask if they're considering an offer or want to see similar homes."
          : "It's been 3 days since they inquired. Share a compelling detail about the property or suggest similar listings.",
        7: followUp.sequence_type === "showing"
          ? "One week since their showing. Soft check-in, no pressure. Ask if they have any lingering questions."
          : "One week since they inquired. Gentle check-in. Ask if they'd like to schedule a showing.",
      };
      const dayContext = dayContextMap[followUp.day_number] || "General follow-up";

      const prompt = `You are ${agent.name}, a real estate agent${agent.brokerage ? ` at ${agent.brokerage}` : ""}. Write a brief, personal follow-up email to ${lead.name.split(" ")[0]}.

Context: ${dayContext}

Property: ${listingAddress}${listing ? ` | ${listing.beds}bd/${listing.baths}ba | ${listing.sqft?.toLocaleString()} sqft` : ""}
${listing?.features?.length ? `Notable features: ${listing.features.slice(0, 3).join(", ")}` : ""}

Their original message: "${lead.message || "Expressed interest in the property"}"

Rules:
- 2-3 sentences max
- Sound like a real person texting, not a marketing email
- Don't mention price
- Include a soft call to action
- Do NOT include subject line, greeting, or sign-off — just the body
- Match the style: "Hey [name], just checking in..." or "Hi [name], wanted to follow up..."`;

      const aiResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = aiResponse.content.find((b) => b.type === "text");
      const body = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

      if (!body) {
        await db.from("follow_ups").update({ status: "failed" }).eq("id", followUp.id);
        return false;
      }

      // Send the email
      const emailHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <p style="color: #6b7280; margin: 0 0 8px; font-size: 14px;">
              Re: ${listingAddress}
            </p>
            <div style="color: #111827; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${body}</div>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-weight: 600; color: #111827;">${agent.name}</p>
              ${agent.phone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${formatPhone(agent.phone)}</p>` : ""}
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agent.email}</p>
            </div>
          </div>
        </div>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `${agent.name} via ListingFlare <leads@listingflare.com>`,
          to: lead.email,
          replyTo: agent.email,
          subject: `${followUp.subject} — ${listingAddress}`,
          html: emailHtml,
        }),
      });

      if (emailRes.ok) {
        await db
          .from("follow_ups")
          .update({ status: "sent", body, sent_at: new Date().toISOString() })
          .eq("id", followUp.id);
        return true;
      } else {
        console.error("Follow-up email failed:", await emailRes.text().catch(() => "unknown"));
        await db.from("follow_ups").update({ status: "failed", body }).eq("id", followUp.id);
        return false;
      }
    } catch (err) {
      console.error("Follow-up processing error:", err);
      await db.from("follow_ups").update({ status: "failed" }).eq("id", followUp.id);
      return false;
    }
  }));

  const processed = results.filter((r) => r.status === "fulfilled" && r.value === true).length;

  // Also trigger showing reminders in the same cron run (Hobby plan 2-cron limit)
  let reminderStats: unknown = null;
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
    const reminderRes = await fetch(`${appUrl}/api/showings/reminders`, {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
      },
    });
    if (reminderRes.ok) {
      reminderStats = await reminderRes.json().catch(() => null);
    }
  } catch (err) {
    console.error("Reminder trigger error:", err);
  }

  return NextResponse.json({ ok: true, processed, reminders: reminderStats });
}
