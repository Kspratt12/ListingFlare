// Showing reminder eligibility.
//
// The reminder job runs once a day (it is called from the daily follow-up cron), so the rule has to work
// for a once-a-day cadence: a showing gets ONE reminder, on the first daily run at which it is more than
// REMINDER_MIN_HOURS and at most REMINDER_MAX_HOURS away. Because the window is longer than the 24-hour
// gap between runs, every confirmed showing that is at least REMINDER_MAX_HOURS away at some run becomes
// eligible at exactly one run. A showing confirmed closer than that is reminded at the next run only if
// it is still more than REMINDER_MIN_HOURS away.
//
// The start moment comes from the property's time zone (listings.timezone, else the agent's). Without a
// known time zone the moment cannot be computed, so no reminder is sent (never guessed from the server,
// which runs in UTC). A time that does not exist (daylight-saving gap) is not reminded.

import { zonedTimeToUtc } from "./timezone";

export const REMINDER_MIN_HOURS = 1;
export const REMINDER_MAX_HOURS = 36;

export type ReminderDecision =
  | { send: true; startsAt: Date; hoursUntil: number }
  | { send: false; reason: "already_sent" | "not_confirmed" | "no_timezone" | "invalid_time" | "nonexistent_time" | "too_far" | "too_soon" };

export function decideShowingReminder(input: {
  status: string;
  showingDate: string;
  showingTime: string;
  timeZone: string | null | undefined;
  alreadySent: boolean;
  now: Date;
}): ReminderDecision {
  if (input.status !== "confirmed") return { send: false, reason: "not_confirmed" };
  if (input.alreadySent) return { send: false, reason: "already_sent" };
  if (!input.timeZone) return { send: false, reason: "no_timezone" };
  const z = zonedTimeToUtc(input.showingDate, input.showingTime, input.timeZone);
  if (!z) return { send: false, reason: "invalid_time" };
  if (z.status === "gap") return { send: false, reason: "nonexistent_time" };
  const hoursUntil = (z.utc.getTime() - input.now.getTime()) / 3_600_000;
  if (hoursUntil > REMINDER_MAX_HOURS) return { send: false, reason: "too_far" };
  if (hoursUntil <= REMINDER_MIN_HOURS) return { send: false, reason: "too_soon" };
  return { send: true, startsAt: z.utc, hoursUntil };
}
