import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkHoneypotAndTiming,
  checkRateLimits,
  DUPLICATE_WINDOW_MS,
} from "@/lib/antiSpam";
import { sendPushToAgent } from "@/lib/sendPush";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface LeadCreateBody {
  listingId?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  source?: string;
  status?: string;
  has_agent?: string;
  pre_approved?: string;
  timeline?: string;
  honeypot?: string;
  formStartedAt?: number;
  sendNotification?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LeadCreateBody;
    const {
      listingId,
      name,
      email,
      phone,
      message,
      source,
      status,
      has_agent,
      pre_approved,
      timeline,
      honeypot,
      formStartedAt,
      sendNotification = true,
    } = body;

    if (!listingId || !name || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Cheap spam filters first - fail fast before hitting DB
    const cheap = checkHoneypotAndTiming({
      honeypot,
      formStartedAt,
      listingId,
      email,
    });
    if (!cheap.ok) {
      // Return 200 so bots don't learn the honeypot works
      return NextResponse.json({ ok: true, leadId: null });
    }

    const db = getAdminClient();

    // Look up listing to derive the real agent_id - never trust client-sent agentId
    const { data: listing } = await db
      .from("listings")
      .select("id, agent_id, status")
      .eq("id", listingId)
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // DB-backed rate limits
    const limited = await checkRateLimits(db, {
      listingId,
      email,
    });
    if (!limited.ok) {
      return NextResponse.json({ error: limited.reason }, { status: 429 });
    }

    // Duplicate check - if the same email/listing submitted in the last 30s,
    // return the existing lead instead of creating a new one
    const duplicateCutoff = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
    const { data: recent } = await db
      .from("leads")
      .select("id")
      .eq("listing_id", listingId)
      .eq("email", email.toLowerCase())
      .gte("created_at", duplicateCutoff)
      .limit(1)
      .maybeSingle();

    if (recent) {
      return NextResponse.json({ ok: true, leadId: recent.id, duplicate: true });
    }

    const insertPayload: Record<string, unknown> = {
      listing_id: listingId,
      agent_id: listing.agent_id,
      name,
      email: email.toLowerCase(),
      phone: phone || "",
      message: message || "",
    };
    if (status) insertPayload.status = status;
    if (source) insertPayload.source = source;
    if (has_agent) insertPayload.has_agent = has_agent;
    if (pre_approved) insertPayload.pre_approved = pre_approved;
    if (timeline) insertPayload.timeline = timeline;

    const { data: newLead, error } = await db
      .from("leads")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error || !newLead) {
      console.error("Lead insert error:", error);
      return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }

    // Fire email notification (non-blocking)
    if (sendNotification) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
      fetch(`${appUrl}/api/leads/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: newLead.id,
          listingId,
          agentId: listing.agent_id,
          leadName: name,
          leadEmail: email,
          leadPhone: phone,
          leadMessage: message,
        }),
      }).catch((err) => console.error("Notify error:", err));

      // Push notification - phone buzz for the agent (non-blocking)
      sendPushToAgent(listing.agent_id, {
        title: "New lead",
        body: `${name} just inquired. Tap to view.`,
        url: "/dashboard/leads",
        tag: `lead-${newLead.id}`,
      }).catch((err) => console.error("Push error:", err));
    }

    return NextResponse.json({ ok: true, leadId: newLead.id });
  } catch (err) {
    console.error("Lead create error:", err);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
