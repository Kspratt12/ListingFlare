import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPhone } from "./formatters";
import { createCalendarEvent, refreshAccessToken, isGoogleConfigured } from "./google/oauth";

export interface GoogleShowingEvent {
  showingDate: string;
  showingTime: string;
  listingAddress: string;
  name: string;
  email: string;
  phone: string;
  message: string;
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

  // Parse showing time to ISO strings.
  // NOTE: new Date(y, m, d, h, min) uses the SERVER's timezone, and no agent or
  // property timezone is stored, so the event time is only correct when the
  // server timezone matches the agent's. Unchanged by this patch; the timezone
  // phase replaces it.
  const timeMatch = String(e.showingTime).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) return;
  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  if (timeMatch[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (timeMatch[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  const [yStr, mStr, dStr] = e.showingDate.split("-");
  const startDate = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr), hour, minute);
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
