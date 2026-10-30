// Switch for discretionary (nurture) sends to buyers.
//
// Discretionary = ListingFlare decided to write, not the buyer asking or an
// appointment that already exists:
//   - day 1/3/7 follow-up emails (inquiry and showing sequences)
//   - "new listing" emails to past leads
//   - post-showing feedback requests
//   - testimonial requests
//
// NOT covered, on purpose: showing confirmations and showing reminders
// (appointment notices), the first AI reply to an inquiry (Approval Mode),
// opt-in listing alerts, and emails an agent sends by hand.
//
// DEFAULT OFF. Discretionary sends run only when NURTURE_SENDS_ENABLED is
// exactly "1". A missing, empty or mistyped value means paused, so forgetting to
// set it can never switch sends on. While paused nothing is deleted or edited:
// pending follow_ups rows stay as they are.
//
// SETTING IT TO "1" IS NOT A ROLLBACK. It reactivates automated messaging to
// buyers. It does not clear, review or expire anything: follow-ups that built up
// while paused become due at once and go out oldest first. Do not set it until
// the pending backlog has been reviewed and the change has been separately
// approved. To undo a bad release, redeploy the previous version instead.
export function nurtureSendsEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.NURTURE_SENDS_ENABLED === "1";
}

export function nurturePausedBody(job: string): Record<string, unknown> {
  return {
    ok: true,
    paused: true,
    job,
    note: "Discretionary sends are paused (NURTURE_SENDS_ENABLED is not 1). Pending records are untouched.",
  };
}
