// Email content for /api/showings/book, built as pure functions so the
// encoding can be tested without sending anything.
//
// Encoding rules, by output context:
//  - HTML text and attribute values: escapeHtml() on every dynamic value
//  - mailto: links: only built from an address that passed isValidEmail()
//  - Subject and From display name: control characters removed (header
//    injection), length capped. Providers add their own header encoding.
//
// NOTE: encoding stops submitted markup from becoming email HTML. It does not
// stop the endpoint being used to send mail to an address that never asked
// for one. The buyer address is unverified, so the request-phase buyer email
// only says "received, not confirmed"; the "confirmed" email is sent only after
// an agent confirms the request.

import { escapeHtml } from "./escapeHtml";
import { formatPhone } from "./formatters";
import { isValidEmail } from "./showingInput";

// eslint-disable-next-line no-control-regex
const HEADER_UNSAFE_RE = /[\u0000-\u001f\u007f]/g;

export function sanitizeHeaderText(value: unknown, max = 200): string {
  return String(value ?? "")
    .replace(HEADER_UNSAFE_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// For the From: display name, which sits before an <address>
export function sanitizeDisplayName(value: unknown, max = 80): string {
  return sanitizeHeaderText(value, max).replace(/[<>"\\]/g, "");
}

export function safeMailto(email: unknown): string {
  return isValidEmail(email) ? `mailto:${email}` : "";
}

export interface BuyerEmailInput {
  buyerName: string;
  listingAddress: string;
  formattedDate: string;
  showingTime: string;
  agentName: string;
  agentPhone?: string | null;
  agentEmail: string;
}

export interface AgentEmailInput {
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  message?: string | null;
  listingAddress: string;
  formattedDate: string;
  showingTime: string;
  dashboardUrl: string;
  // True when no property time zone is stored: the agent must set one before confirming.
  needsTimeZone?: boolean;
}

const BRAND_HEADER = `
  <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #b8965a; margin: 0; font-size: 20px;">ListingFlare</h1>
  </div>`;

const row = (label: string, valueHtml: string, bold = true) => `
  <tr>
    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">${label}</td>
    <td style="padding: 8px 0; color: #111827;${bold ? " font-weight: 600;" : ""}">${valueHtml}</td>
  </tr>`;

export function buildBuyerShowingEmail(i: BuyerEmailInput): { subject: string; html: string } {
  const firstName = escapeHtml(String(i.buyerName).split(" ")[0]);
  const agentName = escapeHtml(i.agentName);
  const agentPhone = i.agentPhone ? escapeHtml(formatPhone(i.agentPhone)) : "";
  const agentEmail = escapeHtml(i.agentEmail);

  const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          ${BRAND_HEADER}
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">Your Showing is Confirmed!</h2>
            <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
              Hi ${firstName}, your showing has been scheduled. Here are the details:
            </p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${row("Property", escapeHtml(i.listingAddress))}
                ${row("Date", escapeHtml(i.formattedDate))}
                ${row("Time", escapeHtml(i.showingTime))}
                ${row("Agent", agentName)}
              </table>
            </div>
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 0 0 16px;">
              <p style="margin: 0; color: #92400e; font-size: 13px;">
                📅 <strong>Add to calendar:</strong> Open the attached <code>showing.ics</code> file to add this to Google Calendar, Apple Calendar, or Outlook in one tap.
              </p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Need to reschedule? Reply to this email or call ${agentPhone || "your agent"}.
            </p>
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-weight: 600; color: #111827;">${agentName}</p>
              ${agentPhone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agentPhone}</p>` : ""}
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agentEmail}</p>
            </div>
          </div>
        </div>
      `;

  return {
    subject: sanitizeHeaderText(`Showing Confirmed - ${i.listingAddress} on ${i.formattedDate}`),
    html,
  };
}

export function buildAgentShowingEmail(i: AgentEmailInput): { subject: string; html: string } {
  const name = escapeHtml(i.buyerName);
  const email = escapeHtml(i.buyerEmail);
  const mailto = escapeHtml(safeMailto(i.buyerEmail));
  const phoneDigits = i.buyerPhone ? formatPhone(i.buyerPhone) : "";
  const phoneHtml = escapeHtml(phoneDigits);
  const message = i.message ? escapeHtml(i.message) : "";

  const emailCell = mailto
    ? `<a href="${mailto}" style="color: #b8965a;">${email}</a>`
    : email;
  const phoneCell = phoneDigits
    ? `<a href="tel:${phoneHtml.replace(/-/g, "")}" style="color: #b8965a;">${phoneHtml}</a>`
    : "";

  const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          ${BRAND_HEADER}
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">New Showing Booked!</h2>
            <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
              A buyer has scheduled a showing for <strong>${escapeHtml(i.listingAddress)}</strong>.
            </p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${row("Buyer", name)}
                ${row("Email", emailCell, false)}
                ${phoneCell ? row("Phone", phoneCell, false) : ""}
                ${row("Date", escapeHtml(i.formattedDate))}
                ${row("Time", escapeHtml(i.showingTime))}
                ${message ? row("Notes", message, false) : ""}
              </table>
            </div>
            <div style="margin-top: 16px;">
              <a href="${escapeHtml(i.dashboardUrl)}"
                style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                View in Dashboard
              </a>
            </div>
          </div>
        </div>
      `;

  return {
    subject: sanitizeHeaderText(`Showing booked - ${i.buyerName} for ${i.listingAddress}`),
    html,
  };
}

// ---- Request workflow emails ------------------------------------------------
// A buyer submission is a REQUEST. Nothing here says "confirmed" except the
// confirmation email sent after the agent confirms (buildBuyerShowingEmail).
// Times are shown exactly as the buyer picked them, in the property's local
// time; ListingFlare does not store a timezone yet.

const LOCAL_TIME_NOTE = "Times are in the property's local time.";

export function buildBuyerRequestEmail(i: BuyerEmailInput): { subject: string; html: string } {
  const firstName = escapeHtml(String(i.buyerName).split(" ")[0]);
  const agentName = escapeHtml(i.agentName);
  const agentPhone = i.agentPhone ? escapeHtml(formatPhone(i.agentPhone)) : "";
  const agentEmail = escapeHtml(i.agentEmail);

  const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          ${BRAND_HEADER}
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">Showing request received</h2>
            <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
              Hi ${firstName}, ${agentName} has your request. <strong>It is not confirmed yet.</strong> You will get another email once the agent confirms or suggests a different time.
            </p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${row("Property", escapeHtml(i.listingAddress))}
                ${row("Requested", escapeHtml(i.formattedDate + " at " + i.showingTime))}
                ${row("Status", "Waiting for the agent to confirm")}
              </table>
              <p style="margin: 12px 0 0; color: #6b7280; font-size: 12px;">${LOCAL_TIME_NOTE}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Please do not plan around this time until it is confirmed. Questions? Reply to this email or call ${agentPhone || "your agent"}.
            </p>
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-weight: 600; color: #111827;">${agentName}</p>
              ${agentPhone ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agentPhone}</p>` : ""}
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${agentEmail}</p>
            </div>
          </div>
        </div>
      `;
  return {
    subject: sanitizeHeaderText(`Showing request received (not yet confirmed) - ${i.listingAddress}`),
    html,
  };
}

export function buildAgentRequestEmail(i: AgentEmailInput): { subject: string; html: string } {
  const name = escapeHtml(i.buyerName);
  const email = escapeHtml(i.buyerEmail);
  const mailto = escapeHtml(safeMailto(i.buyerEmail));
  const phoneDigits = i.buyerPhone ? formatPhone(i.buyerPhone) : "";
  const message = i.message ? escapeHtml(i.message) : "";
  const emailCell = mailto ? `<a href="${mailto}" style="color: #b8965a;">${email}</a>` : email;
  const dashboardUrl = escapeHtml(i.dashboardUrl);

  const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          ${BRAND_HEADER}
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">New showing request</h2>
            <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
              ${name} asked to see <strong>${escapeHtml(i.listingAddress)}</strong>. <strong>Nothing is confirmed until you confirm it</strong> in your dashboard.
            </p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${row("Requested", escapeHtml(i.formattedDate + " at " + i.showingTime))}
                ${row("Buyer", name)}
                ${row("Email", emailCell, false)}
                ${phoneDigits ? row("Phone", escapeHtml(phoneDigits), false) : ""}
                ${message ? row("Message", message, false) : ""}
              </table>
              <p style="margin: 12px 0 0; color: #6b7280; font-size: 12px;">${LOCAL_TIME_NOTE}</p>
            </div>
            ${i.needsTimeZone ? `<p style="margin: 0 0 16px; color: #92400e; font-size: 13px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px;">Set your time zone in Settings first. It is required to confirm a showing, so the invite and calendar show the right time.</p>` : ""}
            <a href="${dashboardUrl}" style="display: inline-block; background: #b8965a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Confirm or decline</a>
          </div>
        </div>
      `;
  return {
    subject: sanitizeHeaderText(`Showing request - ${i.buyerName} for ${i.listingAddress}`),
    html,
  };
}

export function buildBuyerDeclinedEmail(i: BuyerEmailInput): { subject: string; html: string } {
  const firstName = escapeHtml(String(i.buyerName).split(" ")[0]);
  const agentName = escapeHtml(i.agentName);
  const agentPhone = i.agentPhone ? escapeHtml(formatPhone(i.agentPhone)) : "";
  const agentEmail = escapeHtml(i.agentEmail);
  const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          ${BRAND_HEADER}
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 8px; color: #111827;">That time is not available</h2>
            <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
              Hi ${firstName}, ${agentName} could not confirm <strong>${escapeHtml(i.formattedDate + " at " + i.showingTime)}</strong> for ${escapeHtml(i.listingAddress)}. No showing is scheduled for that time. You are welcome to request another time on the listing page, or contact the agent directly.
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">${agentName}${agentPhone ? " · " + agentPhone : ""} · ${agentEmail}</p>
          </div>
        </div>
      `;
  return {
    subject: sanitizeHeaderText(`Showing time not available - ${i.listingAddress}`),
    html,
  };
}
