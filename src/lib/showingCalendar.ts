import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPhone } from "./formatters";
import { createCalendarEvent, refreshAccessToken, isGoogleConfigured } from "./google/oauth";
import { zonedTimeToUtc } from "./timezone";

export interface GoogleShowingEvent {
  showingDate: string;
  showingTime: string;
  listingAddress: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  // IANA zone of the property. Required: the server's own zone is never used.
  timeZone: string;
}

// Called only after an agent CONFIRMS a showing. Skips silently when Google is
// not configured or the agent has not connected a calendar.
export async function addGoogleEvent(
  db: SupabaseClient,
  agentId: string,
  e: GoogleShowingEvent
) {
  if (!isGoogleConfigured()) return;

  const { data: fullAgent } = await db
    .from("agent_profiles")
    .select("google_access_token, google_refresh_token, google_token_expires_at")
    .eq("id", agentId)
    .single();
  if (!fullAgent?.google_access_token) return;

  let accessToken = fullAgent.google_access_token;
  const expiresAt = fullAgent.google_token_expires_at
    ? new Date(fullAgent.google_token_expires_at)
    : null;

  // Refresh token if expired/expiring soon
  if (expiresAt && expiresAt < new Date() && fullAgent.google_refresh_token) {
    const refreshed = await refreshAccessToken(fullAgent.google_refresh_token);
    if (refreshed) {
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString();
      await db
        .from("agent_profiles")
        .update({ google_access_token: accessToken, google_token_expires_at: newExpiresAt })
        .eq("id", agentId);
    }
  }

  // Exact instants from the property's own zone (daylight saving included); never the server's zone.
  const zoned = zonedTimeToUtc(e.showingDate, e.showingTime, e.timeZone);
  if (!zoned || zoned.status === "gap") return;
  const startDate = zoned.utc;
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  await createCalendarEvent(accessToken, {
    summary: `Showing - ${e.listingAddress}`,
    description: [
      `Buyer: ${e.name}`,
      e.phone ? `Phone: ${formatPhone(e.phone)}` : null,
      e.message ? `Notes: ${e.message}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    location: e.listingAddress,
    startISO: startDate.toISOString(),
    endISO: endDate.toISOString(),
    attendeeName: e.name,
    attendeeEmail: e.email,
  });
}
