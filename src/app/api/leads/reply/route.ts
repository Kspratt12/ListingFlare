import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { formatPhone } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const leadEmail = formData.get("leadEmail") as string;
    const leadName = formData.get("leadName") as string;
    const message = formData.get("message") as string;
    const listingAddress = formData.get("listingAddress") as string;

    if (!leadEmail || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get agent profile for reply-to info
    const { data: agent } = await supabase
      .from("agent_profiles")
      .select("name, email, phone")
      .eq("id", user.id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const resend = new Resend(resendKey);

    // Build attachments from uploaded files
    const attachmentFiles = formData.getAll("attachments") as File[];
    const attachments = [];
    for (const file of attachmentFiles) {
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        attachments.push({
          filename: file.name,
          content: buffer,
        });
      }
    }

    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
          <p style="color: #6b7280; margin: 0 0 8px; font-size: 14px;">
            Re: ${listingAddress}
          </p>
          <p style="color: #111827; margin: 0 0 24px; font-size: 14px;">
            Hi ${leadName.split(" ")[0]},
          </p>
          <div style="color: #111827; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${message}</div>
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-weight: 600; color: #111827;">${agent.name}</p>
            ${agent.phone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${formatPhone(agent.phone)}</p>` : ""}
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agent.email}</p>
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: `${agent.name} via ListingFlare <leads@listingflare.com>`,
      to: leadEmail,
      replyTo: agent.email,
      subject: `Re: ${listingAddress} — ${agent.name}`,
      html: emailHtml,
      attachments,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Lead reply error:", err);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
