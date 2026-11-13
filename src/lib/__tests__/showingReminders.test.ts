import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { decideShowingReminder, REMINDER_MAX_HOURS, REMINDER_MIN_HOURS } from "../showingReminders";

const NY = "America/New_York";
const SLOTS = ["9:00 AM", "9:30 AM", "10:00 AM", "12:00 PM", "12:30 PM", "1:00 PM", "2:30 PM", "3:30 PM", "4:30 PM", "5:00 PM"];
const base = { status: "confirmed", alreadySent: false, timeZone: NY } as const;

// The daily job runs at 14:00 UTC (vercel.json). Simulate consecutive daily runs and count reminders per showing.
function runsFor(date: string, time: string, tz: string | null, fromIso: string, days: number, status = "confirmed") {
  let sent = 0; let sentAt: string | null = null;
  let already = false;
  for (let d = 0; d < days; d++) {
    const now = new Date(Date.parse(fromIso) + d * 86_400_000);
    const r = decideShowingReminder({ status, showingDate: date, showingTime: time, timeZone: tz, alreadySent: already, now });
    if (r.send) { sent++; sentAt = now.toISOString(); already = true; }
  }
  return { sent, sentAt };
}

test("every offered slot is reminded exactly once by a once-a-day run, across a week of runs (Eastern time, standard and daylight time)", () => {
  for (const date of ["2026-11-14", "2026-07-15", "2026-11-02", "2026-03-09"]) {
    for (const time of SLOTS) {
      const { sent } = runsFor(date, time, NY, new Date(Date.parse(date + "T14:00:00Z") - 5 * 86_400_000).toISOString(), 6);
      assert.equal(sent, 1, `${date} ${time}`);
    }
  }
});

test("other zones are handled too (Pacific, Arizona without daylight saving)", () => {
  for (const tz of ["America/Los_Angeles", "America/Phoenix", "America/Chicago"]) {
    for (const time of SLOTS) {
      const { sent } = runsFor("2026-11-14", time, tz, "2026-11-09T14:00:00Z", 6);
      assert.equal(sent, 1, `${tz} ${time}`);
    }
  }
});

test("the moment comes from the property time zone, not the server: 10:00 AM New York is 15:00 UTC in November", () => {
  const r = decideShowingReminder({ ...base, showingDate: "2026-11-14", showingTime: "10:00 AM", now: new Date("2026-11-13T14:00:00Z") });
  assert.ok(r.send);
  if (r.send) {
    assert.equal(r.startsAt.toISOString(), "2026-11-14T15:00:00.000Z");
    assert.equal(r.hoursUntil, 25);
  }
});

test("no time zone known: no reminder is sent (never guessed from the server)", () => {
  assert.deepEqual(decideShowingReminder({ ...base, timeZone: null, showingDate: "2026-11-14", showingTime: "10:00 AM", now: new Date("2026-11-13T14:00:00Z") }), { send: false, reason: "no_timezone" });
  assert.deepEqual(decideShowingReminder({ ...base, timeZone: undefined, showingDate: "2026-11-14", showingTime: "10:00 AM", now: new Date("2026-11-13T14:00:00Z") }), { send: false, reason: "no_timezone" });
});

test("declined, requested and canceled showings never get a reminder", () => {
  for (const status of ["requested", "declined", "canceled", "completed", "no_show"]) {
    const r = decideShowingReminder({ ...base, status, showingDate: "2026-11-14", showingTime: "10:00 AM", now: new Date("2026-11-13T14:00:00Z") });
    assert.deepEqual(r, { send: false, reason: "not_confirmed" }, status);
  }
});

test("a reminder already sent is never repeated", () => {
  const r = decideShowingReminder({ ...base, alreadySent: true, showingDate: "2026-11-14", showingTime: "10:00 AM", now: new Date("2026-11-13T14:00:00Z") });
  assert.deepEqual(r, { send: false, reason: "already_sent" });
});

test("window edges: too far, too soon, and past showings are not reminded", () => {
  const at = (iso: string) => decideShowingReminder({ ...base, showingDate: "2026-11-14", showingTime: "10:00 AM", now: new Date(iso) }); // starts 15:00Z
  assert.equal((at("2026-11-12T22:00:00Z") as { reason: string }).reason, "too_far"); // 41h
  assert.equal(at("2026-11-13T03:00:00Z").send, true); // 36h exactly
  assert.equal((at("2026-11-13T02:59:00Z") as { reason: string }).reason, "too_far");
  assert.equal(at("2026-11-14T13:59:00Z").send, true); // just over 1h
  assert.equal((at("2026-11-14T14:00:00Z") as { reason: string }).reason, "too_soon"); // exactly 1h
  assert.equal((at("2026-11-14T16:00:00Z") as { reason: string }).reason, "too_soon"); // already started
  assert.equal(REMINDER_MAX_HOURS, 36); assert.equal(REMINDER_MIN_HOURS, 1);
});

test("daylight-saving: a time that does not exist is not reminded; an ambiguous time uses the first occurrence", () => {
  const gap = decideShowingReminder({ ...base, showingDate: "2027-03-14", showingTime: "2:30 AM", now: new Date("2027-03-13T14:00:00Z") });
  assert.deepEqual(gap, { send: false, reason: "nonexistent_time" });
  const amb = decideShowingReminder({ ...base, showingDate: "2026-11-01", showingTime: "1:30 AM", now: new Date("2026-10-31T14:00:00Z") });
  assert.ok(amb.send);
  if (amb.send) assert.equal(amb.startsAt.toISOString(), "2026-11-01T05:30:00.000Z"); // first 1:30 AM is EDT (UTC-4)
});

test("invalid stored time or time zone is skipped rather than guessed", () => {
  assert.deepEqual(decideShowingReminder({ ...base, showingDate: "2026-11-14", showingTime: "soon", now: new Date("2026-11-13T14:00:00Z") }), { send: false, reason: "invalid_time" });
  assert.deepEqual(decideShowingReminder({ ...base, timeZone: "Not/AZone", showingDate: "2026-11-14", showingTime: "10:00 AM", now: new Date("2026-11-13T14:00:00Z") }), { send: false, reason: "invalid_time" });
});

// ---- the route uses the decision function, claims before sending, releases the claim on failure and logs failures
const srcDir = process.env.LF_SRC_DIR as string;
const route = fs.readFileSync(path.join(srcDir, "app/api/showings/reminders/route.ts"), "utf8");
test("static: the route uses the time-zone-aware decision, not server-local parsing", () => {
  assert.match(route, /decideShowingReminder\(/);
  assert.doesNotMatch(route, /new Date\(parseInt\(yStr\)/);
  assert.match(route, /listing\?\.timezone \|\| agent\.timezone/);
});
test("static: duplicate-send protection (claim first, release on failure) and failure visibility", () => {
  const claim = route.indexOf('.update({ reminder_24h_sent: true })');
  const send = route.indexOf("https://api.resend.com/emails");
  assert.ok(claim > 0 && send > claim, "claim comes before the provider call");
  assert.match(route, /\.eq\("reminder_24h_sent", false\)/);
  assert.match(route, /update\(\{ reminder_24h_sent: false \}\)/);
  assert.match(route, /console\.error\("Showing reminders: provider rejected/);
  assert.doesNotMatch(route, /console\.(log|error)\([^)]*(showing\.email|showing\.name|resendKey)/);
});
test("static: only confirmed showings are queried and values placed in the email are escaped", () => {
  assert.match(route, /\.eq\("status", "confirmed"\)/);
  assert.match(route, /escapeHtml\(listingAddress\)/);
  assert.match(route, /escapeHtml\(agent\.name\)/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
