// Orchestration for POST /api/showings/book, with every database, email, calendar,
// push and follow-up call injected. The route file only builds the real
// dependencies and calls processBookingRequest(); tests call it with fakes.
//
// Order of operations (nothing earlier in the list may depend on a later one):
//   1. validate the request                    - no I/O
//   2. honeypot / timing check                 - no I/O, silent success for bots
//   3. look up the listing                     - read only
//   4. legacy lead-count rate limit            - read only
//   5. atomic booking-attempt reservation      - the first write
//   6. find/create lead, insert showing, send emails, calendar, follow-up, push
//
// What this does NOT do: booking still sends the buyer an unverified
// "confirmed" email (and an .ics invite) to whatever address was typed. That
// stays until the separately approved showing-request phase.

import { validateShowingRequest, type ShowingInput } from "./showingInput";
import {
  buildAgentShowingEmail,
  buildBuyerShowingEmail,
  sanitizeDisplayName,
} from "./showingEmails";
import { generateShowingICS, icsToBase64 } from "./ics";
import { formatPhone } from "./formatters";

// Thresholds for the atomic limiter (enforced by public.reserve_booking_attempt).
// A booking attempt is counted when it is accepted; rejected attempts are not
// counted, so a blocked sender cannot extend their own block.
export const BOOKING_LIMITS = {
  windowMinutes: 10,
  perEmailPerListing: 3,
  perEmailAllListings: 5,
  perListing: 15,
} as const;

export interface BookingStore {
  findListing(listingId: string): Promise<{ id: string; agent_id: string } | null>;
  legacyLeadRateLimit(
    listingId: string,
    email: string
  ): Promise<{ ok: true } | { ok: false; reason: string }>;
  // "reserved": counted and allowed. "limited": over a threshold. "unavailable":
  // the limiter itself failed (for example the migration is not applied).
  reserveBookingAttempt(
    listingId: string,
    email: string
  ): Promise<"reserved" | "limited" | "unavailable">;
  findLeadId(listingId: string, email: string): Promise<string | null>;
  insertLead(row: Record<string, unknown>): Promise<string | null>;
  updateLead(leadId: string, fields: Record<string, unknown>): Promise<void>;
  insertShowing(row: Record<string, unknown>): Promise<{ id: string } | null>;
  getListing(listingId: string): Promise<{ street: string; city: string; state: string } | null>;
  getAgent(
    agentId: string
  ): Promise<{ name: string; phone: string; email: string; brokerage: string } | null>;
}

export interface OutgoingEmail {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
}

export interface BookingDeps {
  now(): Date;
  store: BookingStore;
  spamCheck(input: {
    honeypot: unknown;
    formStartedAt: unknown;
    listingId: string;
    email: string;
  }): { ok: boolean };
  emailEnabled: boolean;
  sendEmail(msg: OutgoingEmail): Promise<void>;
  addGoogleEvent(
    agentId: string,
    event: {
      showingDate: string;
      showingTime: string;
      listingAddress: string;
      name: string;
      email: string;
      phone: string;
      message: string;
    }
  ): Promise<void>;
  enrollShowingFollowUps(leadId: string, listingId: string, agentId: string): void;
  notifyAgentPush(
    agentId: string,
    payload: { title: string; body: string; url: string; tag: string }
  ): void;
  appUrl: string;
}

export interface BookingResult {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

const RETRY_AFTER_SECONDS = String(BOOKING_LIMITS.windowMinutes * 60);

export async function processBookingRequest(
  rawBody: unknown,
  deps: BookingDeps
): Promise<BookingResult> {
  // 1. Validate. Nothing has been read or written yet.
  const checked = validateShowingRequest(rawBody, deps.now());
  if (!checked.ok) {
    return { status: 400, body: { error: checked.error } };
  }
  const input: ShowingInput = checked.value;

  // 2. Cheap bot checks. Silent success so bots learn nothing.
  const cheap = deps.spamCheck({
    honeypot: input.honeypot,
    formStartedAt: input.formStartedAt,
    listingId: input.listingId,
    email: input.email,
  });
  if (!cheap.ok) {
    return { status: 200, body: { ok: true } };
  }

  const { store } = deps;

  // 3. Derive the agent from the listing - never from the client.
  const listingRow = await store.findListing(input.listingId);
  if (!listingRow) {
    return { status: 404, body: { error: "Listing not found" } };
  }
  const agentId = listingRow.agent_id;

  // 4. Existing lead-count limits (read only).
  const legacy = await store.legacyLeadRateLimit(input.listingId, input.email);
  if (!legacy.ok) {
    return { status: 429, body: { error: legacy.reason } };
  }

  // 5. Atomic reservation: the check and the count are one database call, so
  // concurrent requests cannot all pass a stale count. This is the first write.
  const reservation = await store.reserveBookingAttempt(input.listingId, input.email);
  if (reservation === "limited") {
    return {
      status: 429,
      body: { error: "Too many booking requests. Please try again in a few minutes." },
      headers: { "Retry-After": RETRY_AFTER_SECONDS },
    };
  }
  if (reservation === "unavailable") {
    // Fail closed: if the limiter cannot run, no booking is created and nothing is sent.
    return {
      status: 503,
      body: { error: "Booking is temporarily unavailable. Please try again shortly." },
    };
  }

  // 6. Lead: always looked up by listing + email on the server; a client-sent
  // leadId is never used.
  let leadId = await store.findLeadId(input.listingId, input.email);
  if (!leadId) {
    leadId = await store.insertLead({
      listing_id: input.listingId,
      agent_id: agentId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message || `Showing requested for ${input.showingDate} at ${input.showingTime}`,
      status: "showing_scheduled",
      pre_approved: input.preApproved,
      timeline: input.timeline,
      has_agent: input.hasAgent,
      source: input.source,
    });
  } else {
    const updates: Record<string, string> = {};
    if (input.preApproved) updates.pre_approved = input.preApproved;
    if (input.timeline) updates.timeline = input.timeline;
    if (input.hasAgent) updates.has_agent = input.hasAgent;
    if (input.source) updates.source = input.source;
    if (Object.keys(updates).length > 0) await store.updateLead(leadId, updates);
  }
  if (!leadId) {
    return { status: 500, body: { error: "Failed to create lead" } };
  }

  await store.updateLead(leadId, { status: "showing_scheduled", is_read: true });

  const showing = await store.insertShowing({
    lead_id: leadId,
    listing_id: input.listingId,
    agent_id: agentId,
    showing_date: input.showingDate,
    showing_time: input.showingTime,
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.message,
  });
  if (!showing) {
    return { status: 500, body: { error: "Failed to book showing" } };
  }

  const [listing, agent] = await Promise.all([
    store.getListing(input.listingId),
    store.getAgent(agentId),
  ]);

  const listingAddress = listing
    ? `${listing.street}, ${listing.city}, ${listing.state}`
    : "the property";

  const formattedDate = new Date(input.showingDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (deps.emailEnabled && agent) {
    const buyerMail = buildBuyerShowingEmail({
      buyerName: input.name,
      listingAddress,
      formattedDate,
      showingTime: input.showingTime,
      agentName: agent.name,
      agentPhone: agent.phone,
      agentEmail: agent.email,
    });
    const agentMail = buildAgentShowingEmail({
      buyerName: input.name,
      buyerEmail: input.email,
      buyerPhone: input.phone,
      message: input.message,
      listingAddress,
      formattedDate,
      showingTime: input.showingTime,
      dashboardUrl: `${deps.appUrl}/dashboard/leads`,
    });

    const ics = generateShowingICS({
      uid: showing.id,
      date: input.showingDate,
      time: input.showingTime,
      durationMinutes: 30,
      summary: `Property Showing - ${listingAddress}`,
      description: [
        `Showing with ${input.name}`,
        agent.phone
          ? `Agent: ${agent.name} (${formatPhone(agent.phone)})`
          : `Agent: ${agent.name}`,
        input.phone ? `Buyer phone: ${formatPhone(input.phone)}` : null,
        input.message ? `Notes: ${input.message}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      location: listingAddress,
      organizerName: agent.name || "Listing Agent",
      organizerEmail: agent.email,
      attendeeName: input.name,
      attendeeEmail: input.email,
    });
    const attachment = {
      filename: "showing.ics",
      content: icsToBase64(ics),
      contentType: "text/calendar",
    };

    // A failed send is logged but never turns a saved booking into an error.
    const sends = await Promise.allSettled([
      deps.sendEmail({
        from: `${sanitizeDisplayName(agent.name)} via ListingFlare <leads@listingflare.com>`,
        to: input.email,
        replyTo: agent.email,
        subject: buyerMail.subject,
        html: buyerMail.html,
        attachments: [attachment],
      }),
      deps.sendEmail({
        from: "ListingFlare <leads@listingflare.com>",
        to: agent.email,
        subject: agentMail.subject,
        html: agentMail.html,
        attachments: [attachment],
      }),
    ]);
    for (const s of sends) {
      if (s.status === "rejected") console.error("Showing email send failed:", s.reason);
    }
  }

  try {
    await deps.addGoogleEvent(agentId, {
      showingDate: input.showingDate,
      showingTime: input.showingTime,
      listingAddress,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
    });
  } catch (err) {
    console.error("Google Calendar event creation failed:", err);
  }

  deps.enrollShowingFollowUps(leadId, input.listingId, agentId);

  deps.notifyAgentPush(agentId, {
    title: "New showing booked",
    body: `${input.name} booked ${formattedDate} at ${input.showingTime}. Tap to view.`,
    url: "/dashboard/showings",
    tag: `showing-${showing.id}`,
  });

  return { status: 200, body: { ok: true, showingId: showing.id } };
}
