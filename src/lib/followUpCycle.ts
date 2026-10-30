// Orchestration for the daily GET /api/follow-ups/process job, with every
// provider and database call injected so it can be tested with fakes.
//
// Behavior is the same as before this file existed, with one addition: when
// discretionary sends are paused, due follow-up rows are left exactly as they
// are (no status change, no AI call, no email) and everything else - the
// monthly ROI trigger, the early return on quiet days, and the chained jobs -
// happens in exactly the same circumstances as when sends are enabled.
//
// Do not "fix" the quiet-day early return here: chained jobs (reminders,
// feedback, testimonials, trial emails) currently run only on days when at least
// one follow-up is due. Changing that would newly switch those jobs on.

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

  const { rows, error } = await deps.fetchDue();
  if (error || !rows || rows.length === 0) {
    return { status: 200, body: { ok: true, processed: 0 } };
  }

  const nurtureEnabled = deps.nurtureEnabled();

  let processed = 0;
  if (nurtureEnabled) {
    const results = await Promise.allSettled(rows.map((row) => deps.processRow(row)));
    processed = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
  }

  // Chained daily jobs: same set, same circumstances, whether or not nurture is on.
  const safe = (p: Promise<unknown>) => p.catch(() => null);
  const [reminders, feedback, testimonials, trialLifecycle] = await Promise.all([
    safe(deps.callJob(JOB_PATHS.reminders)),
    safe(deps.callJob(JOB_PATHS.feedback)),
    safe(deps.callJob(JOB_PATHS.testimonials)),
    deps.trialLifecycleEnabled()
      ? safe(deps.callJob(JOB_PATHS.trialLifecycle))
      : Promise.resolve(null),
  ]);

  return {
    status: 200,
    body: {
      ok: true,
      processed,
      ...(nurtureEnabled ? {} : { nurtureEnabled: false, held: rows.length }),
      reminders,
      feedback,
      testimonials,
      trialLifecycle,
    },
  };
}
