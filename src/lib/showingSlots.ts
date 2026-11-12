// What "the same slot" means for showings.
//
// A showing occupies an INTERVAL, not just a start time: SHOWING_MINUTES long (the same 30 minutes the
// calendar invite uses), starting at its wall-clock time at the property. Two showings for the same
// listing on the same date CONFLICT when their intervals overlap, that is when their starts are less than
// SHOWING_MINUTES apart. The public scheduler offers 30-minute starts, so there this is the same as
// "identical start"; the interval rule also covers times an agent types in by hand (for example 10:15
// against a confirmed 10:00).
//
// A DUPLICATE is narrower: the same buyer (same email) asking for the same start time again.
//
// The same rule is implemented in SQL in confirm_showing_request (migration 041); keep them in step.

export const SHOWING_MINUTES = 30;

// "10:30 AM" -> 630. null when the text is not a 12-hour clock time.
export function timeToMinutes(time: string): number | null {
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 1 || h > 12 || min > 59) return null;
  return (h % 12) * 60 + (m[3].toUpperCase() === "PM" ? 12 * 60 : 0) + min;
}

export function sameStart(a: string, b: string): boolean {
  const x = timeToMinutes(a), y = timeToMinutes(b);
  return x !== null && y !== null ? x === y : a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function slotsOverlap(a: string, b: string): boolean {
  const x = timeToMinutes(a), y = timeToMinutes(b);
  if (x === null || y === null) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return Math.abs(x - y) < SHOWING_MINUTES;
}
