// Property time zones for showings.
//
// A showing is stored as a plain date ("2026-11-14") and a wall-clock time
// ("10:00 AM"), meaning the time at the PROPERTY. Turning that into an exact
// moment needs the property's IANA time zone, which is stored explicitly
// (listings.timezone, falling back to agent_profiles.timezone). It is never
// guessed from the server (Vercel runs in UTC) or from the viewer's browser.
// With no time zone known, calendar artifacts stay "floating" (.ics) or are not
// created (Google Calendar) instead of being wrong.
//
// Daylight-saving rules (explicit):
//   - A local time that happens twice (clocks go back, e.g. 1:30 AM on 2026-11-01
//     in New York) means the FIRST occurrence (still daylight time).
//   - A local time that does not exist (clocks go forward, e.g. 2:30 AM on
//     2027-03-14 in New York) is reported as "gap". Confirming such a showing is
//     refused; nobody can attend at a time that never happens.
// Uses Intl only; no dependency.

export const US_TIME_ZONES: Array<{ value: string; label: string }> = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Mountain, no daylight saving (Arizona)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Offset of `tz` from UTC at an instant, in minutes (EST = -300).
function offsetMinutes(tz: string, instantMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / 60000);
}

export function parseClock(time: string): { hour: number; minute: number } | null {
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const pm = m[3].toUpperCase() === "PM";
  if (pm && hour !== 12) hour += 12;
  if (!pm && hour === 12) hour = 0;
  return { hour, minute };
}

export interface ZonedResult {
  utc: Date;
  status: "ok" | "ambiguous" | "gap";
}

export function zonedTimeToUtc(date: string, time: string, tz: string): ZonedResult | null {
  const dm = String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const clock = parseClock(time);
  if (!dm || !clock || !isValidTimeZone(tz)) return null;
  const wall = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], clock.hour, clock.minute);
  const DAY = 24 * 3600 * 1000;
  const offsets = Array.from(new Set([offsetMinutes(tz, wall - DAY), offsetMinutes(tz, wall + DAY)]));
  const valid = offsets
    .map((off) => wall - off * 60000)
    .filter((u, i) => offsetMinutes(tz, u) === offsets[i]);
  if (valid.length === 0) {
    // Gap: interpret with the offset in force before the change (moves the time forward).
    return { utc: new Date(wall - Math.max(...offsets) * 60000), status: "gap" };
  }
  if (valid.length > 1) return { utc: new Date(Math.min(...valid)), status: "ambiguous" };
  return { utc: new Date(valid[0]), status: "ok" };
}

// Today's calendar date at the property (YYYY-MM-DD).
export function localDateIn(now: Date, tz: string): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return p;
}

// Short zone name at an instant, for example "EST" or "EDT".
export function zoneAbbreviation(utc: Date, tz: string): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(utc)
    .find((p) => p.type === "timeZoneName");
  return part ? part.value : tz;
}

// "10:00 AM EST" when the zone is known, otherwise the time exactly as entered.
export function labelShowingTime(date: string, time: string, tz: string | null): string {
  if (!tz) return time;
  const z = zonedTimeToUtc(date, time, tz);
  return z ? `${time} ${zoneAbbreviation(z.utc, tz)}` : time;
}
