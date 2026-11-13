import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { attemptShowingReminder, type ReminderShowing } from "../showingReminderRun";

const NY = "America/New_York";

// An in-memory "database" whose claim is atomic (like UPDATE ... WHERE reminder_24h_sent = false RETURNING id).
function store(show: Partial<ReminderShowing> = {}) {
  const row: ReminderShowing = { id: "s1", status: "confirmed", showing_date: "2026-11-14", showing_time: "10:00 AM", reminder_24h_sent: false, ...show };
  const sends: string[] = [];
  const mk = (now: string, opts: { tz?: string | null; sendOk?: boolean; sendDelay?: number } = {}) => ({
    now: new Date(now),
    timeZone: opts.tz === undefined ? NY : opts.tz,
    claim: async (id: string) => { if (row.id !== id || row.reminder_24h_sent) return false; row.reminder_24h_sent = true; return true; },
    release: async () => { row.reminder_24h_sent = false; },
    send: async () => {
      if (opts.sendDelay) await new Promise((r) => setTimeout(r, opts.sendDelay));
      sends.push(now);
      return opts.sendOk !== false;
    },
  });
  // A run reads the row first (possibly before another run changes it), then attempts.
  const snapshot = () => ({ ...row });
  return { row, sends, mk, snapshot };
}

test("consecutive daily runs send one reminder in total", async () => {
  const s = store();
  const results: string[] = [];
  for (let d = 4; d >= 0; d--) {
    const now = new Date(Date.parse("2026-11-14T15:00:00Z") - (d * 24 + 1) * 3_600_000 + 0).toISOString(); // runs at the same time of day, 25h, 49h ... before? (d=0 is 1h before)
    results.push(await attemptShowingReminder(s.snapshot(), s.mk(now)));
  }
  assert.equal(s.sends.length, 1);
  assert.equal(results.filter((r) => r === "sent").length, 1);
});

test("duplicate prevention is the stored flag plus an atomic claim: two OVERLAPPING runs that both read the row unsent cannot both send", async () => {
  const s = store();
  const now = "2026-11-13T14:00:00Z"; // 25h before the 15:00Z start: eligible
  const a = s.snapshot(); const b = s.snapshot(); // both runs read reminder_24h_sent=false before either claims
  const [ra, rb] = await Promise.all([
    attemptShowingReminder(a, s.mk(now, { sendDelay: 5 })),
    attemptShowingReminder(b, s.mk(now, { sendDelay: 5 })),
  ]);
  assert.equal(s.sends.length, 1);
  assert.deepEqual([ra, rb].sort(), ["sent", "skipped:already_sent"]);
});

test("a failed send releases the claim; the next daily run retries while the showing is still more than an hour away", async () => {
  const s = store();
  assert.equal(await attemptShowingReminder(s.snapshot(), s.mk("2026-11-13T14:00:00Z", { sendOk: false })), "failed");
  assert.equal(s.row.reminder_24h_sent, false);
  assert.equal(await attemptShowingReminder(s.snapshot(), s.mk("2026-11-14T10:00:00Z")), "sent"); // 5h before start
  assert.equal(s.row.reminder_24h_sent, true);
});

test("a failed send is NOT retried once the showing is within the last hour or has started", async () => {
  for (const [now, reason] of [["2026-11-14T14:30:00Z", "too_soon"], ["2026-11-14T15:00:00Z", "too_soon"], ["2026-11-14T18:00:00Z", "too_soon"]] as const) {
    const s = store();
    const r = await attemptShowingReminder(s.snapshot(), s.mk(now));
    assert.equal(r, `skipped:${reason}`, now);
    assert.equal(s.sends.length, 0);
  }
});

test("a send that throws is treated as a failure and releases the claim", async () => {
  const s = store();
  const deps = { ...s.mk("2026-11-13T14:00:00Z"), send: async () => { throw new Error("network"); } };
  assert.equal(await attemptShowingReminder(s.snapshot(), deps), "failed");
  assert.equal(s.row.reminder_24h_sent, false);
});

test("canceled, declined, requested showings and a missing time zone are never sent or claimed", async () => {
  for (const status of ["canceled", "declined", "requested"]) {
    const s = store({ status });
    assert.equal(await attemptShowingReminder(s.snapshot(), s.mk("2026-11-13T14:00:00Z")), "skipped:not_confirmed");
    assert.equal(s.row.reminder_24h_sent, false);
  }
  const s = store();
  assert.equal(await attemptShowingReminder(s.snapshot(), s.mk("2026-11-13T14:00:00Z", { tz: null })), "skipped:no_timezone");
  assert.equal(s.row.reminder_24h_sent, false);
});

test("daylight-saving: a nonexistent local time is skipped and not claimed; an ambiguous one is reminded once", async () => {
  const gap = store({ showing_date: "2027-03-14", showing_time: "2:30 AM" });
  assert.equal(await attemptShowingReminder(gap.snapshot(), gap.mk("2027-03-13T14:00:00Z")), "skipped:nonexistent_time");
  assert.equal(gap.row.reminder_24h_sent, false);
  const amb = store({ showing_date: "2026-11-01", showing_time: "1:30 AM" });
  assert.equal(await attemptShowingReminder(amb.snapshot(), amb.mk("2026-10-31T14:00:00Z")), "sent");
  assert.equal(await attemptShowingReminder(amb.snapshot(), amb.mk("2026-11-01T04:00:00Z")), "skipped:already_sent");
});

test("a claim lost to another run sends nothing", async () => {
  const s = store();
  s.row.reminder_24h_sent = false;
  const stale = s.snapshot(); // this run saw unsent
  s.row.reminder_24h_sent = true; // another run claimed meanwhile
  assert.equal(await attemptShowingReminder(stale, s.mk("2026-11-13T14:00:00Z")), "skipped:already_sent");
  assert.equal(s.sends.length, 0);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
