// One reminder attempt for one showing, with the database and the email provider injected.
//
// Duplicate protection does NOT come from the eligibility window (a window cannot know whether an earlier
// run already sent). It comes from the stored flag reminder_24h_sent plus a conditional claim: the row is
// updated false -> true only if it is still false, and only the run whose update matched a row may send.
// Two overlapping runs therefore cannot both send. If the send fails the claim is released (true -> false)
// so a later daily run retries, but only while the showing is still eligible (more than an hour away,
// confirmed, time zone known); once the showing is too close or has started, the retry is no longer sent.
import { decideShowingReminder } from "./showingReminders";

export interface ReminderShowing { id: string; status: string; showing_date: string; showing_time: string; reminder_24h_sent?: boolean | null }

export interface ReminderAttemptDeps {
  now: Date;
  timeZone: string | null;
  claim(showingId: string): Promise<boolean>; // atomic: false -> true only if still false; true when this caller won
  release(showingId: string): Promise<void>; // true -> false after a failed send
  send(): Promise<boolean>; // provider accepted the message
}

export type ReminderAttemptResult = "sent" | "failed" | `skipped:${string}`;

export async function attemptShowingReminder(showing: ReminderShowing, deps: ReminderAttemptDeps): Promise<ReminderAttemptResult> {
  const decision = decideShowingReminder({
    status: showing.status,
    showingDate: showing.showing_date,
    showingTime: showing.showing_time,
    timeZone: deps.timeZone,
    alreadySent: !!showing.reminder_24h_sent,
    now: deps.now,
  });
  if (!decision.send) return `skipped:${decision.reason}`;
  if (!(await deps.claim(showing.id))) return "skipped:already_sent";
  let ok = false;
  try { ok = await deps.send(); } catch { ok = false; }
  if (ok) return "sent";
  await deps.release(showing.id);
  return "failed";
}
