import { createClient } from "@supabase/supabase-js";
import { escapeHtml } from "./escapeHtml";

type AlertEvent = "reduced" | "increased" | "pending" | "sold" | "relisted";

interface AlertInput {
  listingId: string;
  event: AlertEvent;
  oldPrice?: number | null;
  newPrice: number;
  listingAddress: string;
  listingUrl: string;
  agentName?: string | null;
}

// Fires a notification email to every active subscriber of a listing
// when the price changes or status transitions. Non-blocking - errors
// don't cascade back to the caller.
export async function sendListingAlert(input: AlertInput): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subs } = await db
    .from("listing_email_alerts")
    .select("email, unsubscribe_token")
    .eq("listing_id", input.listingId)
    .eq("active", true);

  if (!subs || subs.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.listingflare.com";
  const safeAddress = escapeHtml(input.listingAddress);
  const safeAgent = input.agentName ? escapeHtml(input.agentName) : "The listing agent";

  const diff = input.oldPrice != null ? input.newPrice - input.oldPrice : 0;
  const diffPct = input.oldPrice && input.oldPrice > 0 ? Math.abs(diff / input.oldPrice) * 100 : 0;

  let headline = "Update on your watched listing";
  let body = "";
  switch (input.event) {
    case "reduced":
      headline = `Price drop: $${Math.abs(diff).toLocaleString()} off`;
      body = `The list price on <strong>${safeAddress}</strong> just dropped from $${(input.oldPrice || 0).toLocaleString()} to <strong>$${input.newPrice.toLocaleString()}</strong> (${diffPct.toFixed(1)}% lower).`;
      break;
    case "increased":
      headline = "Price update";
      body = `The list price on <strong>${safeAddress}</strong> changed to $${input.newPrice.toLocaleString()}.`;
      break;
    case "pending":
      headline = "Listing now pending";
      body = `<strong>${safeAddress}</strong> is under contract. ${safeAgent} may reach out if it falls through.`;
      break;
    case "sold":
      headline = "Listing sold";
      body = `<strong>${safeAddress}</strong> has closed.`;
      break;
    case "relisted":
      headline = "Back on the market";
      body = `<strong>${safeAddress}</strong> is back on the market at $${input.newPrice.toLocaleString()}.`;
      break;
  }

  const safeUrl = escapeHtml(input.listingUrl);

  await Promise.all(
    subs.map(async (sub) => {
      const unsubUrl = `${appUrl}/api/listings/alerts/unsubscribe?token=${sub.unsubscribe_token}`;
      const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 12px; color: #111827;">${escapeHtml(headline)}</h2>
            <p style="color: #374151; margin: 0 0 20px; font-size: 15px; line-height: 1.6;">${body}</p>
            <div style="text-align: center;">
              <a href="${safeUrl}" style="display: inline-block; background: #b8965a; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                View Listing
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 28px 0 0; text-align: center;">
              You subscribed to updates on this listing. <a href="${unsubUrl}" style="color: #9ca3af;">Unsubscribe</a>.
            </p>
          </div>
        </div>
      `;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "ListingFlare Alerts <alerts@listingflare.com>",
            to: sub.email,
            subject: headline,
            html,
          }),
        });
      } catch (err) {
        console.error("Listing alert send error:", err);
      }
    })
  );
}
