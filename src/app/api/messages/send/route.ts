import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/formatters";
import { escapeHtml } from "@/lib/escapeHtml";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const leadId = formData.get("leadId") as string;
    const message = formData.get("message") as string;
    const attachmentFiles = formData.getAll("attachments") as File[];

    if (!leadId || !message?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = getAdminClient();

    const { data: lead } = await db
      .from("leads")
      .select("id, name, email, agent_id, listing_id")
      .eq("id", leadId)
      .single();

    if (!lead || lead.agent_id !== user.id) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const [{ data: agent }, { data: listing }] = await Promise.all([
      db.from("agent_profiles").select("name, phone, email").eq("id", lead.agent_id).single(),
      db.from("listings").select("street, city, state").eq("id", lead.listing_id).single(),
    ]);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const listingAddress = listing
      ? `${listing.street}, ${listing.city}, ${listing.state}`
      : "your inquiry";
    const safeAddress = escapeHtml(listingAddress);
    const safeFirstName = escapeHtml(String(lead.name).split(" ")[0]);
    const safeMessage = escapeHtml(message);
    const safeAgentName = escapeHtml(agent.name);
    const safeAgentEmail = escapeHtml(agent.email);
    const subject = `Re: ${listingAddress}`;

    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
          <p style="color: #6b7280; margin: 0 0 8px; font-size: 14px;">Re: ${safeAddress}</p>
          <p style="color: #111827; margin: 0 0 16px; font-size: 14px;">Hi ${safeFirstName},</p>
          <div style="color: #111827; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${safeMessage}</div>
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-weight: 600; color: #111827;">${safeAgentName}</p>
            ${agent.phone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${formatPhone(agent.phone)}</p>` : ""}
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${safeAgentEmail}</p>
          </div>
        </div>
      </div>
    `;

    // Convert attachments to base64 for Resend
    const attachments = await Promise.all(
      attachmentFiles
        .filter((f) => f instanceof File && f.size > 0)
        .map(async (file) => {
          const buf = await file.arrayBuffer();
          return {
            filename: file.name,
            content: Buffer.from(buf).toString("base64"),
          };
        })
    );

    const resendKey = process.env.RESEND_API_KEY;
    let providerMessageId: string | null = null;

    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `${agent.name} via ListingFlare <leads@listingflare.com>`,
          to: lead.email,
          replyTo: agent.email,
          subject,
          html: emailHtml,
          ...(attachments.length > 0 ? { attachments } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        providerMessageId = data?.id || null;
      }
    }

    // Store the outbound message
    await db.from("messages").insert({
      lead_id: leadId,
      agent_id: user.id,
      direction: "outbound",
      subject,
      body: message,
      provider_message_id: providerMessageId,
      attachments: attachmentFiles
        .filter((f) => f instanceof File && f.size > 0)
        .map((f) => ({ filename: f.name })),
    });

    // Auto-update lead status + record first response time
    const { data: currentLead } = await db
      .from("leads")
      .select("status, first_response_at")
      .eq("id", leadId)
      .single();
    const updates: Record<string, unknown> = {};
    if (currentLead?.status === "new") {
      updates.status = "contacted";
      updates.is_read = true;
    }
    if (!currentLead?.first_response_at) {
      updates.first_response_at = new Date().toISOString();
    }
    if (Object.keys(updates).length > 0) {
      await db.from("leads").update(updates).eq("id", leadId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Message send error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
