import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { processInboundEmail, withReviewTag, type InboundDeps, type ReceivedEmail } from "@/lib/inboundEmail";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Receives Resend `email.received` webhooks (buyer replies sent to reply+<lead id>@INBOUND_REPLY_DOMAIN).
// This is a provider webhook, NOT a cron or internal call: it is authenticated only by Resend's signed
// webhook headers over the RAW request body (RESEND_WEBHOOK_SECRET), never by the cron secret, and it fails
// closed. The body is read as text and handed to the verifier untouched; parsing it first would break
// the signature. All the logic lives in lib/inboundEmail.ts.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  const resend = apiKey ? new Resend(apiKey) : null;
  const db = getAdminClient();

  const deps: InboundDeps = {
    webhookSecretConfigured: () => Boolean(secret && resend),
    verify: ({ payload, headers }) =>
      resend!.webhooks.verify({ payload, headers, webhookSecret: secret! }) as unknown as ReturnType<InboundDeps["verify"]>,

    fetchReceived: async (emailId) => {
      const { data, error } = await resend!.emails.receiving.get(emailId);
      if (error || !data) throw new Error(error?.message || "no data");
      return data as unknown as ReceivedEmail;
    },

    getLead: async (leadId) => {
      const { data } = await db.from("leads").select("id, agent_id, email, status, tags").eq("id", leadId).maybeSingle();
      return data ?? null;
    },

    messageExists: async (providerMessageId) => {
      const { data } = await db
        .from("messages")
        .select("id")
        .eq("provider_message_id", providerMessageId)
        .eq("direction", "inbound")
        .limit(1);
      return Boolean(data && data.length > 0);
    },

    insertMessage: async (row) => {
      const { error } = await db.from("messages").insert({ ...row, direction: "inbound" });
      return !error;
    },

    markLeadUnread: async (lead) => {
      // Mark the lead unread and move it from "new" to "contacted" if still new.
      const update: Record<string, unknown> = { is_read: false };
      if (lead.status === "new") update.status = "contacted";
      await db.from("leads").update(update).eq("id", lead.id);
    },

    // Review marker: a fixed tag (no message content) and unread. The rejected message itself is not kept by the app.
    // Applying it twice changes nothing more. KNOWN RISK, NOT PROTECTED: the tags are read, changed and written back
    // without a lock or version check, so a tag edit made at the same moment (by the agent, or a second held reply) can be
    // overwritten, and the marker or the agent's edit can be lost. Concurrent edits are not safe here.
    markNeedsReview: async (lead) => {
      const tags = withReviewTag(lead.tags);
      const update: Record<string, unknown> = { is_read: false };
      if (tags) update.tags = tags;
      const { error } = await db.from("leads").update(update).eq("id", lead.id);
      if (error) throw new Error("review marker not saved");
    },

    log: (message, detail) => console.error(message, detail),
  };

  try {
    const outcome = await processInboundEmail(rawBody, req.headers, deps);
    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch (err) {
    console.error("Inbound email error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
