// Generate RFC 5545 ICS calendar invite for property showings.
// Attaches to confirmation emails so buyers/agents can add the showing
// to Google Calendar, Apple Calendar, Outlook, etc. with one click.

interface ShowingInvite {
  uid: string;
  date: string;           // "2026-04-25"
  time: string;           // "10:00 AM"
  durationMinutes?: number;
  summary: string;
  description: string;
  location: string;
  organizerName: string;
  organizerEmail: string;
  attendeeName: string;
  attendeeEmail: string;
}

function parseTimeTo24h(time: string): { hour: number; minute: number } {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: 10, minute: 0 };
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

function formatIcsDate(year: number, month: number, day: number, hour: number, minute: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
}

function addMinutes(hour: number, minute: number, add: number): { hour: number; minute: number } {
  const total = hour * 60 + minute + add;
  return { hour: Math.floor(total / 60) % 24, minute: total % 60 };
}

// ICS requires long lines to be folded at 75 octets with CRLF + space.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 74) {
    parts.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  if (remaining.length > 0) parts.push(" " + remaining);
  return parts.join("\r\n");
}

// Escape special chars per RFC 5545
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function generateShowingICS(invite: ShowingInvite): string {
  const duration = invite.durationMinutes ?? 30;
  const [yearStr, monthStr, dayStr] = invite.date.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const { hour, minute } = parseTimeTo24h(invite.time);
  const end = addMinutes(hour, minute, duration);

  const dtStart = formatIcsDate(year, month, day, hour, minute);
  const dtEnd = formatIcsDate(year, month, day, end.hour, end.minute);

  const now = new Date();
  const dtStamp =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    "T" +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0") +
    "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ListingFlare//Showing Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${invite.uid}@listingflare.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(invite.summary)}`,
    `DESCRIPTION:${escapeText(invite.description)}`,
    `LOCATION:${escapeText(invite.location)}`,
    `ORGANIZER;CN=${escapeText(invite.organizerName)}:mailto:${invite.organizerEmail}`,
    `ATTENDEE;CN=${escapeText(invite.attendeeName)};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${invite.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n");
}

// Base64-encode string content for Resend attachment API
export function icsToBase64(ics: string): string {
  return Buffer.from(ics, "utf-8").toString("base64");
}
