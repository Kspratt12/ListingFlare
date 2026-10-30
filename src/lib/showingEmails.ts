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
// stop the endpoint being used to send a confirmation to an address that
// never asked for one: the buyer email is still sent to an unverified address
// and still says "confirmed", until the separate showing-request phase.

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
