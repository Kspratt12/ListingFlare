// Agent response to a showing request: confirm or decline.
// Every database, email, calendar and follow-up call is injected, so tests run it
// with fakes and nothing real is sent.
//
// Rules:
//   - only the agent who owns the showing can respond (anything else is a 404,
//     so ids cannot be probed);
//   - only a "requested" showing can change; historical "confirmed" bookings are
//     never reinterpreted or re-notified;
//   - responding twice with the same action is a no-op (no second email);
//   - confirming is refused if the slot is already confirmed for another buyer,
//     or the date has passed;
//   - the status change is one conditional update (requested -> new status), so
//     two concurrent responses cannot both win;
//   - calendar artifacts (.ics, Google event) and the follow-up sequence exist
//     only after a confirmation.

import {
  buildBuyerDeclinedEmail,
  buildBuyerShowingEmail,
  sanitizeDisplayName,
} from "./showingEmails";
import { generateShowingICS, icsToBase64 } from "./ics";
import { formatShowingDate } from "./showingBooking";
import { labelShowingTime, localDateIn, zonedTimeToUtc } from "./timezone";
import type { OutgoingEmail } from "./showingBooking";

export type ShowingAction = "confirm" | "decline";

export interface ShowingRow {
  id: string;
  agent_id: string;
  listing_id: string;
  lead_id: string;
  showing_date: string;
  showing_time: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
}

export interface ResponseStore {
  getShowing(id: string): Promise<ShowingRow | null>;
  // Another CONFIRMED showing for the same listing, date and time.
  hasConfirmedConflict(listingId: string, date: string, time: string, excludeId: string): Promise<boolean>;
  // One conditional update: only succeeds if the row is still "requested".
  transitionFromRequested(id: string, to: "confirmed" | "declined", at: string): Promise<boolean>;
  updateLead(leadId: string, fields: Record<string, unknown>): Promise<void>;
  getListing(listingId: string): Promise<{ street: string; city: string; state: string } | null>;
  // Effective property zone: listings.timezone, else agent_profiles.timezone, else null.
  getTimeZone(listingId: string, agentId: string): Promise<string | null>;
  getAgent(agentId: string): Promise<{ name: string; phone: string; email: string } | null>;
}

export interface ResponseDeps {
  now(): Date;
  store: ResponseStore;
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
      timeZone: string;
    }
  ): Promise<void>;
  enrollShowingFollowUps(leadId: string, listingId: string, agentId: string): void;
}

export interface ResponseResult {
  status: number;
  body: Record<string, unknown>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function processShowingResponse(
  input: { agentId: string; showingId: unknown; action: unknown },
  deps: ResponseDeps
): Promise<ResponseResult> {
  if (typeof input.showingId !== "string" || !UUID.test(input.showingId)) {
    return { status: 400, body: { error: "Invalid showing" } };
  }
  if (input.action !== "confirm" && input.action !== "decline") {
    return { status: 400, body: { error: "Invalid action" } };
  }
  const action: ShowingAction = input.action;
  const target = action === "confirm" ? "confirmed" : "declined";
  const { store } = deps;

  const showing = await store.getShowing(input.showingId);
  if (!showing || showing.agent_id !== input.agentId) {
    return { status: 404, body: { error: "Showing not found" } };
  }

  // Same action twice: nothing changes, nothing is sent.
  if (showing.status === target) {
    return { status: 200, body: { ok: true, status: target, unchanged: true } };
  }
  if (showing.status !== "requested") {
    return {
      status: 409,
      body: { error: `This showing is already ${showing.status.replace("_", " ")} and cannot be changed here.` },
    };
  }

  if (action === "confirm") {
    // "Today" is the calendar date at the PROPERTY when its zone is known (never the
    // server's). Without a zone it falls back to the UTC date, so a same-day slot is
    // allowed and the agent judges the time of day.
    const tz = await store.getTimeZone(showing.listing_id, showing.agent_id);
    const today = tz ? localDateIn(deps.now(), tz) : deps.now().toISOString().slice(0, 10);
    if (tz) {
      const z = zonedTimeToUtc(showing.showing_date, showing.showing_time, tz);
      if (z && z.status === "gap") {
        return {
          status: 409,
          body: { error: "That local time does not exist on that date (clocks move forward). Decline it and ask the buyer for another time." },
        };
      }
    }
    if (showing.showing_date < today) {
      return { status: 409, body: { error: "That date has already passed. Decline it or ask the buyer for a new time." } };
    }
    if (await store.hasConfirmedConflict(showing.listing_id, showing.showing_date, showing.showing_time, showing.id)) {
      return {
        status: 409,
        body: { error: "You already confirmed another showing for this listing at that time. Decline this request or contact the buyer." },
      };
    }
  }

  const won = await store.transitionFromRequested(showing.id, target, deps.now().toISOString());
  if (!won) {
    return { status: 409, body: { error: "This request was just changed. Refresh to see its current status." } };
  }

  const [listing, agent] = await Promise.all([
    store.getListing(showing.listing_id),
    store.getAgent(showing.agent_id),
  ]);
  const listingAddress = listing ? `${listing.street}, ${listing.city}, ${listing.state}` : "the property";
  const zone = await store.getTimeZone(showing.listing_id, showing.agent_id);
  const timeLabel = labelShowingTime(showing.showing_date, showing.showing_time, zone);
  const formattedDate = formatShowingDate(showing.showing_date);

  if (action === "confirm") {
    await store.updateLead(showing.lead_id, { status: "showing_scheduled", is_read: true });
  }

  if (deps.emailEnabled && agent && showing.email) {
    const common = {
      buyerName: showing.name,
      listingAddress,
      formattedDate,
      showingTime: timeLabel,
      agentName: agent.name,
      agentPhone: agent.phone,
      agentEmail: agent.email,
    };
    try {
      if (action === "confirm") {
        const mail = buildBuyerShowingEmail(common);
        const ics = generateShowingICS({
          uid: showing.id,
          date: showing.showing_date,
          time: showing.showing_time,
          durationMinutes: 30,
          summary: `Property Showing - ${listingAddress}`,
          description: [`Showing with ${showing.name}`, `Agent: ${agent.name}`].join("\n"),
          timeZone: zone,
          location: listingAddress,
          organizerName: agent.name || "Listing Agent",
          organizerEmail: agent.email,
          attendeeName: showing.name,
          attendeeEmail: showing.email,
        });
        await deps.sendEmail({
          from: `${sanitizeDisplayName(agent.name)} via ListingFlare <leads@listingflare.com>`,
          to: showing.email,
          replyTo: agent.email,
          subject: mail.subject,
          html: mail.html,
          attachments: [{ filename: "showing.ics", content: icsToBase64(ics), contentType: "text/calendar" }],
        });
      } else {
        const mail = buildBuyerDeclinedEmail(common);
        await deps.sendEmail({
          from: `${sanitizeDisplayName(agent.name)} via ListingFlare <leads@listingflare.com>`,
          to: showing.email,
          replyTo: agent.email,
          subject: mail.subject,
          html: mail.html,
        });
      }
    } catch (err) {
      console.error("Showing response email failed:", err);
    }
  }

  let calendar: "created_or_not_connected" | "skipped_no_timezone" | undefined;
  if (action === "confirm") {
    if (zone) {
      try {
        await deps.addGoogleEvent(showing.agent_id, {
          showingDate: showing.showing_date,
          showingTime: showing.showing_time,
          listingAddress,
          name: showing.name,
          email: showing.email,
          phone: showing.phone,
          message: showing.message,
          timeZone: zone,
        });
      } catch (err) {
        console.error("Google Calendar event creation failed:", err);
      }
      calendar = "created_or_not_connected";
    } else {
      // No property time zone is stored, so an exact calendar time cannot be computed.
      // A wrong event is worse than none: skip it and tell the agent how to fix it.
      calendar = "skipped_no_timezone";
    }
    deps.enrollShowingFollowUps(showing.lead_id, showing.listing_id, showing.agent_id);
  }

  return { status: 200, body: { ok: true, status: target, ...(calendar ? { calendar } : {}) } };
}
