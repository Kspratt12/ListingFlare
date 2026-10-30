// Server-side validation for the public showing form (/api/showings/book).
//
// The browser form already limits what a visitor can pick, but the endpoint is
// public, so nothing it sends can be trusted. Everything here runs before any
// database read, write or email.
//
// KNOWN LIMITATION (temporary date rule): dates are checked against UTC only.
// A date no earlier than "UTC today minus one day" is accepted so a visitor in
// the Americas is not rejected for today's date. This does NOT establish that
// the requested slot is in the future in the property's or the agent's
// timezone; ListingFlare does not store a timezone yet. A same-day slot that
// has already passed locally can still be accepted.

export const SHOWING_TIME_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
] as const;

const MAX_DAYS_AHEAD = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Deliberately conservative: no quotes, angle brackets, whitespace or control
// characters can pass, so a validated address is safe in a header, an href and
// an iCalendar line. Some rare but legal addresses are rejected on purpose.
const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;
const PHONE_RE = /^[0-9+().\-\s]*$/;
// C0 controls and DEL (tab, CR and LF are handled separately where allowed)
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/;
// eslint-disable-next-line no-control-regex
const MESSAGE_BAD_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const PRE_APPROVED = ["yes", "working_on_it", "no", "cash", "not_specified"];
const TIMELINE = ["asap", "30_90", "3_6_months", "just_looking", "not_specified"];
const HAS_AGENT = ["yes", "no", "not_specified"];

export interface ShowingInput {
  listingId: string;
  showingDate: string;
  showingTime: string;
  name: string;
  email: string; // lower-cased
  phone: string;
  message: string;
  preApproved: string | null;
  timeline: string | null;
  hasAgent: string | null;
  source: string;
  honeypot: unknown;
  formStartedAt: unknown;
}

export type ShowingValidation =
  | { ok: true; value: ShowingInput }
  | { ok: false; field: string; error: string };

const fail = (field: string): ShowingValidation => ({
  ok: false,
  field,
  // One generic message for every field: do not tell a bot which check failed.
  error: "Please check the date, time and contact details and try again.",
});

export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    EMAIL_RE.test(value) &&
    !value.includes("..")
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isValidShowingTime(value: unknown): value is (typeof SHOWING_TIME_SLOTS)[number] {
  return typeof value === "string" && (SHOWING_TIME_SLOTS as readonly string[]).includes(value);
}

// Real calendar date in YYYY-MM-DD, no earlier than UTC today - 1 day and no
// later than UTC today + 366 days. See the limitation note at the top.
export function isAcceptableShowingDate(value: unknown, now: Date): value is string {
  if (typeof value !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return false; // e.g. 2026-02-31
  }
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return t >= todayUtc - DAY_MS && t <= todayUtc + MAX_DAYS_AHEAD * DAY_MS;
}

function optionalEnum(value: unknown, allowed: string[]): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" && allowed.includes(value)) return value;
  return undefined; // present but not allowed
}

export function validateShowingRequest(body: unknown, now: Date): ShowingValidation {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fail("body");
  const b = body as Record<string, unknown>;

  // leadId is intentionally ignored: the server finds or creates the lead itself.
  if (!isUuid(b.listingId)) return fail("listingId");
  if (!isAcceptableShowingDate(b.showingDate, now)) return fail("showingDate");
  if (!isValidShowingTime(b.showingTime)) return fail("showingTime");

  if (typeof b.name !== "string") return fail("name");
  const name = b.name.trim();
  if (name.length < 1 || name.length > 100 || CONTROL_RE.test(name) || /[<>"]/.test(name)) {
    return fail("name");
  }

  if (typeof b.email !== "string") return fail("email");
  const email = b.email.trim().toLowerCase();
  if (!isValidEmail(email)) return fail("email");

  let phone = "";
  if (b.phone !== undefined && b.phone !== null && b.phone !== "") {
    if (typeof b.phone !== "string") return fail("phone");
    phone = b.phone.trim();
    if (phone.length > 30 || !PHONE_RE.test(phone)) return fail("phone");
  }

  let message = "";
  if (b.message !== undefined && b.message !== null && b.message !== "") {
    if (typeof b.message !== "string") return fail("message");
    message = b.message.replace(/\r\n?/g, "\n").trim();
    if (message.length > 1000 || MESSAGE_BAD_CONTROL_RE.test(message)) return fail("message");
  }

  const preApproved = optionalEnum(b.preApproved, PRE_APPROVED);
  if (preApproved === undefined) return fail("preApproved");
  const timeline = optionalEnum(b.timeline, TIMELINE);
  if (timeline === undefined) return fail("timeline");
  const hasAgent = optionalEnum(b.hasAgent, HAS_AGENT);
  if (hasAgent === undefined) return fail("hasAgent");

  // source is analytics only; anything odd falls back instead of rejecting the booking
  const source =
    typeof b.source === "string" && /^[A-Za-z0-9_.:\- ]{1,40}$/.test(b.source) ? b.source : "direct";

  return {
    ok: true,
    value: {
      listingId: b.listingId,
      showingDate: b.showingDate,
      showingTime: b.showingTime,
      name,
      email,
      phone,
      message,
      preApproved,
      timeline,
      hasAgent,
      source,
      honeypot: typeof b.honeypot === "string" ? b.honeypot.slice(0, 200) : "",
      formStartedAt: typeof b.formStartedAt === "number" ? b.formStartedAt : undefined,
    },
  };
}
