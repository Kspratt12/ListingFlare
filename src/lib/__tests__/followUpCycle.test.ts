import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { JOB_PATHS, runFollowUpCycle, type CycleDeps, type DueFollowUp } from "../followUpCycle";

// The daily job, run against fakes. `log` records everything the cycle did, so each
// test can say exactly which rows were processed and which jobs were (not) invoked.

const ROWS: DueFollowUp[] = [
  { id: "f1", status: "pending", lead_id: "l1", day_number: 1 },
  { id: "f2", status: "pending", lead_id: "l2", day_number: 3 },
];

function run(opts: {
  nurture: boolean;
  rows?: DueFollowUp[] | null;
  fetchError?: unknown;
  now?: string;
  lifecycle?: boolean;
  keys?: boolean;
  processRow?: (row: DueFollowUp) => Promise<boolean>;
}) {
  const log: string[] = [];
  const rows = opts.rows === undefined ? ROWS : opts.rows;
  const before = JSON.stringify(rows);
  const deps: CycleDeps = {
    now: () => new Date(opts.now ?? "2026-11-10T14:00:00Z"),
    nurtureEnabled: () => opts.nurture,
    trialLifecycleEnabled: () => opts.lifecycle ?? true,
    keysPresent: () => opts.keys ?? true,
    fetchDue: async () => {
      log.push("fetchDue");
      return { rows, error: opts.fetchError ?? null };
    },
    processRow: async (row) => {
      log.push(`processRow:${row.id}`);
      return opts.processRow ? opts.processRow(row) : true;
    },
    callJob: async (p) => {
      log.push(`job:${p}`);
      return { from: p };
    },
  };
  return {
    deps,
    log,
    rowsUntouched: () => assert.equal(JSON.stringify(rows), before, "rows were modified"),
  };
}

const CHAINED = [
  `job:${JOB_PATHS.reminders}`,
  `job:${JOB_PATHS.feedback}`,
  `job:${JOB_PATHS.testimonials}`,
  `job:${JOB_PATHS.trialLifecycle}`,
];
const jobs = (log: string[]) => log.filter((l) => l.startsWith("job:")).sort();
const processed = (log: string[]) => log.filter((l) => l.startsWith("processRow:"));

// ---- quiet day: no follow-up is due ------------------------------------------

test("no due follow-ups: identical result with the gate off and on, and no chained job is invoked", async () => {
  for (const nurture of [false, true]) {
    const t = run({ nurture, rows: [] });
    const r = await runFollowUpCycle(t.deps);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true, processed: 0 }, `nurture=${nurture}`);
    assert.deepEqual(t.log, ["fetchDue"], `nurture=${nurture}`);
  }
});

test("a fetch error or a null result behaves like a quiet day", async () => {
  for (const t of [run({ nurture: false, rows: null }), run({ nurture: true, rows: ROWS, fetchError: new Error("db") })]) {
    const r = await runFollowUpCycle(t.deps);
    assert.deepEqual(r.body, { ok: true, processed: 0 });
    assert.deepEqual(t.log, ["fetchDue"]);
  }
});

// ---- due follow-ups, gate OFF -------------------------------------------------

test("due follow-ups with the gate off: no row is processed, none is modified, and the body says they are held", async () => {
  const t = run({ nurture: false });
  const r = await runFollowUpCycle(t.deps);
  assert.equal(r.status, 200);
  assert.deepEqual(processed(t.log), [], "no AI call, no email, no status change can happen without processRow");
  t.rowsUntouched();
  assert.equal(r.body.processed, 0);
  assert.equal(r.body.held, 2);
  assert.equal(r.body.nurtureEnabled, false);
});

test("due follow-ups with the gate off invoke exactly the same chained jobs as with the gate on", async () => {
  const off = run({ nurture: false });
  const on = run({ nurture: true });
  await runFollowUpCycle(off.deps);
  await runFollowUpCycle(on.deps);
  assert.deepEqual(jobs(off.log), [...CHAINED].sort());
  assert.deepEqual(jobs(off.log), jobs(on.log), "pausing must neither add nor remove any job");
});

test("the pause does not add any job beyond the four chained ones (plus monthly ROI only on the 1st)", async () => {
  const t = run({ nurture: false });
  await runFollowUpCycle(t.deps);
  assert.equal(jobs(t.log).length, 4);
  assert.ok(!jobs(t.log).includes(`job:${JOB_PATHS.monthlyRoi}`));
});

// ---- gate ON ---------------------------------------------------------------------

test("gate on: every due row is processed and the processed count is reported", async () => {
  const t = run({ nurture: true, processRow: async (row) => row.id === "f1" });
  const r = await runFollowUpCycle(t.deps);
  assert.deepEqual(processed(t.log).sort(), ["processRow:f1", "processRow:f2"]);
  assert.equal(r.body.processed, 1);
  assert.equal("held" in r.body, false);
  assert.equal("nurtureEnabled" in r.body, false);
  assert.deepEqual(jobs(t.log), [...CHAINED].sort());
});

test("gate on: one row failing or throwing does not stop the others or the chained jobs", async () => {
  const t = run({
    nurture: true,
    processRow: async (row) => {
      if (row.id === "f1") throw new Error("boom");
      return true;
    },
  });
  const r = await runFollowUpCycle(t.deps);
  assert.equal(r.body.processed, 1);
  assert.deepEqual(processed(t.log).sort(), ["processRow:f1", "processRow:f2"]);
  assert.deepEqual(jobs(t.log), [...CHAINED].sort());
});

// ---- unchanged behavior around the gate ------------------------------------------

test("monthly ROI is triggered on the 1st (UTC) in every case, and never on other days", async () => {
  for (const nurture of [false, true]) {
    for (const rows of [[], ROWS]) {
      const first = run({ nurture, rows, now: "2026-12-01T14:00:00Z" });
      await runFollowUpCycle(first.deps);
      assert.ok(first.log.includes(`job:${JOB_PATHS.monthlyRoi}`), `1st, nurture=${nurture}, rows=${rows.length}`);

      const other = run({ nurture, rows, now: "2026-12-02T14:00:00Z" });
      await runFollowUpCycle(other.deps);
      assert.ok(!other.log.includes(`job:${JOB_PATHS.monthlyRoi}`), `2nd, nurture=${nurture}, rows=${rows.length}`);
    }
  }
});

test("trial lifecycle stays switchable independently of the gate", async () => {
  for (const nurture of [false, true]) {
    const t = run({ nurture, lifecycle: false });
    const r = await runFollowUpCycle(t.deps);
    assert.ok(!t.log.includes(`job:${JOB_PATHS.trialLifecycle}`));
    assert.equal(r.body.trialLifecycle, null);
    assert.equal(jobs(t.log).length, 3);
  }
});

test("missing provider keys: 500 and nothing at all is called, gate off or on", async () => {
  for (const nurture of [false, true]) {
    const t = run({ nurture, keys: false });
    const r = await runFollowUpCycle(t.deps);
    assert.equal(r.status, 500);
    assert.deepEqual(r.body, { error: "Missing API keys" });
    assert.deepEqual(t.log, []);
  }
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
