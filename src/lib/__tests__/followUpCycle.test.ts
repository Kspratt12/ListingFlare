import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
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

const INDEPENDENT = [`job:${JOB_PATHS.reminders}`, `job:${JOB_PATHS.trialLifecycle}`];

test("no due follow-ups: showing reminders and trial emails are still reached, once each, and nothing nurture-related runs", async () => {
  for (const nurture of [false, true]) {
    const t = run({ nurture, rows: [] });
    const r = await runFollowUpCycle(t.deps);
    assert.equal(r.status, 200);
    assert.equal(r.body.processed, 0, `nurture=${nurture}`);
    assert.deepEqual(jobs(t.log), [...INDEPENDENT].sort(), `nurture=${nurture}`);
    assert.deepEqual(processed(t.log), []);
    assert.ok(!t.log.includes(`job:${JOB_PATHS.feedback}`) && !t.log.includes(`job:${JOB_PATHS.testimonials}`));
  }
});

test("a fetch error, a throw, or a null result: no row is processed, but the independent stages still run", async () => {
  const thrower = run({ nurture: true });
  thrower.deps.fetchDue = async () => { throw new Error("db down"); };
  for (const t of [run({ nurture: false, rows: null }), run({ nurture: true, rows: ROWS, fetchError: new Error("db") }), thrower]) {
    const r = await runFollowUpCycle(t.deps);
    assert.equal(r.status, 200);
    assert.equal(r.body.processed, 0);
    assert.deepEqual(processed(t.log), []);
    assert.deepEqual(jobs(t.log), [...INDEPENDENT].sort());
  }
});

test("each independent job is invoked exactly once per call, with or without due rows (no double processing)", async () => {
  for (const rows of [[], ROWS]) {
    for (const nurture of [false, true]) {
      const t = run({ nurture, rows });
      await runFollowUpCycle(t.deps);
      for (const j of INDEPENDENT) assert.equal(t.log.filter((l) => l === j).length, 1, `${j} rows=${rows.length} nurture=${nurture}`);
    }
  }
});

test("a failing independent job does not stop the other or the call; a failing row does not stop the independent jobs", async () => {
  const t = run({ nurture: true, rows: [] });
  t.deps.callJob = async (p) => { t.log.push(`job:${p}`); if (p === JOB_PATHS.reminders) throw new Error("reminders down"); return { ok: true }; };
  const r = await runFollowUpCycle(t.deps);
  assert.equal(r.status, 200);
  assert.deepEqual(jobs(t.log), [...INDEPENDENT].sort());
  assert.equal(r.body.reminders, null);
  assert.deepEqual(r.body.trialLifecycle, { ok: true });
});

test("nurture disabled on a quiet day: nothing that sends nurture email is touched (no row processing, no feedback or testimonial job)", async () => {
  const t = run({ nurture: false, rows: [] });
  await runFollowUpCycle(t.deps);
  assert.deepEqual(t.log.filter((l) => l !== `job:${JOB_PATHS.reminders}` && l !== `job:${JOB_PATHS.trialLifecycle}`), ["fetchDue"]);
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
  const quiet = run({ nurture: false, rows: [], lifecycle: false });
  await runFollowUpCycle(quiet.deps);
  assert.deepEqual(jobs(quiet.log), [`job:${JOB_PATHS.reminders}`]);
});

test("the routes keep their own sent-state guards (source check: duplicate sends are prevented by the routes, not by this cycle)", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.env.LF_SRC_DIR as string, p), "utf8");
  const rem = read("app/api/showings/reminders/route.ts");
  assert.ok(rem.includes("!showing.reminder_24h_sent") && rem.includes("!showing.reminder_1h_sent"));
  assert.ok(rem.includes("reminder_24h_sent: true") && rem.includes("reminder_1h_sent: true"));
  const tri = read("app/api/trial/lifecycle/route.ts");
  assert.ok(tri.includes("!a.trial_welcome_sent_at") && tri.includes("!a.trial_day3_sent_at") && tri.includes("trial_day12_sent_at"));
  assert.ok(tri.includes("[SENT_COLUMN[kind]]"));
  const rows = read("app/api/follow-ups/process/route.ts");
  assert.ok(rows.includes("nurtureSendsEnabled()") && rows.includes("runFollowUpCycle"), "the cron route still wires the gate and uses the one cycle");
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
