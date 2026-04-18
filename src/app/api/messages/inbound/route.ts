import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Verify the request comes from Resend (simple shared secret approach).
// Configure RESEND_WEBHOOK_SECRET in env and set the header in Resend dashboard.
function isAuthorized(req: NextRequest): boolean {
  const provided = req.headers.get("x-webhook-secret");
  const expected = process.env.RESEND_WEBHOOK_SECRET;
  if (!expected) return process.env.NODE_ENV === "development";
  return provided === expected;
}

// This endpoint receives inbound email replies from buyers.
// Requires DNS configuration in Resend to catch replies to leads@listingflare.com
// and POST them here.
//
// Payload shape (Resend inbound):
//   {
//     from: { email: "buyer@example.com", name: "Buyer" },
//     subject: "Re: 123 Main St",
//     text: "plain body",
//     html: "<div>...</div>",
//     messageId: "...",
//     inReplyTo: "...",
//   }
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const fromEmail: string | undefined =
      payload?.from?.email || payload?.from || payload?.sender?.email;
    const subject: string = payload?.subject || "";
    const body: string = payload?.text || payload?.html || "";
    const providerId: string | null = payload?.messageId || null;
    const inReplyTo: string | null = payload?.inReplyTo || null;

    if (!fromEmail || !body) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = getAdminClient();

    // Find the most recent lead from this email address.
    // If inReplyTo is set, we'll prefer matching to that original outbound message.
    let leadId: string | null = null;
    let agentId: string | null = null;

    if (inReplyTo) {
      const { data: original } = await db
        .from("messages")
        .select("lead_id, agent_id")
        .eq("provider_message_id", inReplyTo)
        .limit(1)
        .single();
      if (original) {
        leadId = original.lead_id;
        agentId = original.agent_id;
      }
    }

    if (!leadId) {
      const { data: found } = await db
        .from("leads")
        .select("id, agent_id")
        .eq("email", fromEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (found) {
        leadId = found.id;
        agentId = found.agent_id;
      }
    }

    if (!leadId || !agentId) {
      // Silently accept so Resend doesn't retry. Log for debugging.
      console.warn("Inbound email with no matching lead:", fromEmail);
      return NextResponse.json({ ok: true, matched: false });
    }

    await db.from("messages").insert({
      lead_id: leadId,
      agent_id: agentId,
      direction: "inbound",
      subject,
      body: typeof body === "string" ? body : JSON.stringify(body),
      provider_message_id: providerId,
      in_reply_to: inReplyTo,
    });

    // Mark lead as unread and bump status from "new" to "contacted" if still new.
    const { data: lead } = await db
      .from("leads")
      .select("status")
      .eq("id", leadId)
      .single();

    const update: Record<string, unknown> = { is_read: false };
    if (lead?.status === "new") update.status = "contacted";
    await db.from("leads").update(update).eq("id", leadId);

    return NextResponse.json({ ok: true, matched: true });
  } catch (err) {
    console.error("Inbound email error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
