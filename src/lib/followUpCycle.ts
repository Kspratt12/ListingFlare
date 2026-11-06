// Orchestration for the daily GET /api/follow-ups/process job, with every
// provider and database call injected so it can be tested with fakes.
//
// When discretionary sends are paused, due follow-up rows are left exactly as they
// are (no status change, no AI call, no email); everything else happens in the same
// circumstances as when sends are enabled.
//
// Showing reminders and trial emails run on every call, independent of whether any
// follow-up is due (they used to run only on days with a due row). Feedback and
// testimonial requests are nurture features and still run only when a row is due.

export interface DueFollowUp {
  id: string;
  [key: string]: unknown;
}

export interface CycleDeps {
  now(): Date;
  nurtureEnabled(): boolean;
  trialLifecycleEnabled(): boolean;
  keysPresent(): boolean;
  fetchDue(): Promise<{ rows: DueFollowUp[] | null; error: unknown }>;
  processRow(row: DueFollowUp): Promise<boolean>;
  // Calls one of the app's own job routes; resolves to its JSON, or null when the
  // call failed or returned a non-2xx status.
  callJob(path: string): Promise<unknown>;
}

export interface CycleResult {
  status: number;
  body: Record<string, unknown>;
}

export const JOB_PATHS = {
  monthlyRoi: "/api/cron/monthly-roi",
  reminders: "/api/showings/reminders",
  feedback: "/api/feedback/request",
  testimonials: "/api/testimonials/request",
  trialLifecycle: "/api/trial/lifecycle",
} as const;

export async function runFollowUpCycle(deps: CycleDeps): Promise<CycleResult> {
  if (!deps.keysPresent()) {
    return { status: 500, body: { error: "Missing API keys" } };
  }

  // On the 1st of the month, also fire monthly ROI summary emails (to agents).
  // Fire-and-forget, and independent of whether any follow-up is due.
  if (deps.now().getUTCDate() === 1) {
    Promise.resolve(deps.callJob(JOB_PATHS.monthlyRoi)).catch((err) =>
      console.error("Monthly ROI cron chain error:", err)
    );
  }

  // A failed or throwing follow-up lookup is treated as "nothing due"; it must not stop the
  // independent stages below.
  let fetched: Awaited<ReturnType<CycleDeps["fetchDue"]>>;
  try {
    fetched = await deps.fetchDue();
  } catch (err) {
    console.error("Follow-up lookup error:", err);
    fetched = { rows: null, error: err };
  }
  const due = !fetched.error && fetched.rows ? fetched.rows : [];
  const hasDue = due.length > 0;

  const nurtureEnabled = deps.nurtureEnabled();

  let processed = 0;
  if (hasDue && nurtureEnabled) {
    const results = await Promise.allSettled(due.map((row) => deps.processRow(row)));
    processed = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
  }

  // Showing reminders and trial emails run on every daily call, whether or not any follow-up
  // is due. Each is invoked once here and nowhere else. Feedback and testimonial requests
  // (nurture features that gate themselves) still run only when a follow-up is due.
  const safe = (p: Promise<unknown>) => p.catch(() => null);
  const [reminders, trialLifecycle, feedback, testimonials] = await Promise.all([
    safe(deps.callJob(JOB_PATHS.reminders)),
    deps.trialLifecycleEnabled()
      ? safe(deps.callJob(JOB_PATHS.trialLifecycle))
      : Promise.resolve(null),
    hasDue ? safe(deps.callJob(JOB_PATHS.feedback)) : Promise.resolve(null),
    hasDue ? safe(deps.callJob(JOB_PATHS.testimonials)) : Promise.resolve(null),
  ]);

  if (!hasDue) {
    return { status: 200, body: { ok: true, processed: 0, reminders, trialLifecycle } };
  }

  return {
    status: 200,
    body: {
      ok: true,
      processed,
      ...(nurtureEnabled ? {} : { nurtureEnabled: false, held: due.length }),
      reminders,
      feedback,
      testimonials,
      trialLifecycle,
    },
  };
}
