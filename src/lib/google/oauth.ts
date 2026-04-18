// Google Calendar OAuth helpers
// Requires env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_APP_URL
// If any are missing, Google Calendar features gracefully degrade (hide buttons).

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL
  );
}

export function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/api/google/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    console.error("Google token exchange failed:", await res.text().catch(() => ""));
    return null;
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

// Create a calendar event on the agent's primary calendar
export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description: string;
    location: string;
    startISO: string;
    endISO: string;
    attendeeName: string;
    attendeeEmail: string;
  }
): Promise<{ id: string; htmlLink: string } | null> {
  const body = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: { dateTime: event.startISO },
    end: { dateTime: event.endISO },
    attendees: [{ email: event.attendeeEmail, displayName: event.attendeeName }],
    reminders: { useDefault: true },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    console.error("Google Calendar event creation failed:", await res.text().catch(() => ""));
    return null;
  }
  return (await res.json()) as { id: string; htmlLink: string };
}

// Fetch busy times from the primary calendar to block already-busy slots
export async function getBusyTimes(
  accessToken: string,
  fromISO: string,
  toISO: string
): Promise<Array<{ start: string; end: string }>> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: fromISO,
      timeMax: toISO,
      items: [{ id: "primary" }],
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data?.calendars?.primary?.busy || [];
}
