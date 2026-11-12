import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { isValidTimeZone, zonedTimeToUtc, localDateIn, labelShowingTime, parseClock } from "../timezone";
import { generateShowingICS } from "../ics";

const NY = "America/New_York";
const iso = (d: string, t: string, tz: string) => zonedTimeToUtc(d, t, tz)!.utc.toISOString();

test("validates IANA names and rejects junk", () => {
  assert.ok(isValidTimeZone("America/Chicago"));
  assert.ok(!isValidTimeZone("Mars/Base"));
  assert.ok(!isValidTimeZone(""));
  assert.ok(!isValidTimeZone(5));
  assert.ok(!isValidTimeZone("x".repeat(100)));
});

test("12-hour clock parsing, including noon and midnight", () => {
  assert.deepEqual(parseClock("12:00 AM"), { hour: 0, minute: 0 });
  assert.deepEqual(parseClock("12:30 PM"), { hour: 12, minute: 30 });
  assert.deepEqual(parseClock("1:05 PM"), { hour: 13, minute: 5 });
  assert.equal(parseClock("13:00"), null);
  assert.equal(parseClock("0:30 AM"), null);
});

test("ordinary winter and summer offsets (New York)", () => {
  assert.equal(iso("2026-12-15", "10:00 AM", NY), "2026-12-15T15:00:00.000Z"); // EST, UTC-5
  assert.equal(iso("2026-07-15", "10:00 AM", NY), "2026-07-15T14:00:00.000Z"); // EDT, UTC-4
});

test("fall-back day 2026-11-01: morning before the change is EDT, after it EST", () => {
  assert.equal(iso("2026-10-31", "10:00 AM", NY), "2026-10-31T14:00:00.000Z");
  assert.equal(iso("2026-11-01", "10:00 AM", NY), "2026-11-01T15:00:00.000Z"); // after 2 AM change -> EST
  assert.equal(iso("2026-11-01", "12:30 AM", NY), "2026-11-01T04:30:00.000Z"); // still EDT
});

test("a time that happens twice (1:30 AM on 2026-11-01) means the FIRST occurrence and is flagged ambiguous", () => {
  const r = zonedTimeToUtc("2026-11-01", "1:30 AM", NY)!;
  assert.equal(r.status, "ambiguous");
  assert.equal(r.utc.toISOString(), "2026-11-01T05:30:00.000Z"); // EDT, the earlier instant
});

test("spring-forward day 2027-03-14: before and after the change", () => {
  assert.equal(iso("2027-03-13", "10:00 AM", NY), "2027-03-13T15:00:00.000Z"); // EST
  assert.equal(iso("2027-03-14", "10:00 AM", NY), "2027-03-14T14:00:00.000Z"); // EDT
  assert.equal(iso("2027-03-14", "1:30 AM", NY), "2027-03-14T06:30:00.000Z"); // still EST
});

test("a time that does not exist (2:30 AM on 2027-03-14) is reported as a gap", () => {
  const r = zonedTimeToUtc("2027-03-14", "2:30 AM", NY)!;
  assert.equal(r.status, "gap");
});

test("normal times are status ok", () => {
  assert.equal(zonedTimeToUtc("2026-11-14", "10:00 AM", NY)!.status, "ok");
});

test("a zone without daylight saving (Phoenix) never shifts", () => {
  assert.equal(iso("2026-11-01", "10:00 AM", "America/Phoenix"), "2026-11-01T17:00:00.000Z");
  assert.equal(iso("2027-03-14", "10:00 AM", "America/Phoenix"), "2027-03-14T17:00:00.000Z");
  assert.equal(zonedTimeToUtc("2027-03-14", "2:30 AM", "America/Phoenix")!.status, "ok");
});

test("west coast and central use their own offsets and DST dates", () => {
  assert.equal(iso("2026-12-15", "10:00 AM", "America/Los_Angeles"), "2026-12-15T18:00:00.000Z");
  assert.equal(iso("2026-07-15", "10:00 AM", "America/Chicago"), "2026-07-15T15:00:00.000Z");
});

test("the same wall clock is a different instant in different zones, and never depends on the server zone", () => {
  assert.notEqual(iso("2026-11-14", "10:00 AM", NY), iso("2026-11-14", "10:00 AM", "America/Los_Angeles"));
  const before = process.env.TZ;
  process.env.TZ = "Asia/Tokyo";
  try {
    assert.equal(iso("2026-11-14", "10:00 AM", NY), "2026-11-14T15:00:00.000Z");
  } finally {
    if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
  }
});

test("local date at the property: 11 PM Eastern is already the next day in UTC", () => {
  const now = new Date("2026-11-11T03:30:00Z"); // 10:30 PM EST on Nov 10
  assert.equal(localDateIn(now, NY), "2026-11-10");
  assert.equal(localDateIn(now, "Pacific/Honolulu"), "2026-11-10");
  assert.equal(now.toISOString().slice(0, 10), "2026-11-11");
});

test("time labels carry the abbreviation that applies on that date", () => {
  assert.equal(labelShowingTime("2026-12-15", "10:00 AM", NY), "10:00 AM EST");
  assert.equal(labelShowingTime("2026-07-15", "10:00 AM", NY), "10:00 AM EDT");
  assert.equal(labelShowingTime("2026-07-15", "10:00 AM", null), "10:00 AM");
});

test("ICS with a known zone writes an exact UTC time; without one it stays floating", () => {
  const base = {
    uid: "u1", date: "2026-11-14", time: "10:00 AM", durationMinutes: 30, summary: "s", description: "d", location: "l",
    organizerName: "Agent", organizerEmail: "a@example.test", attendeeName: "Buyer", attendeeEmail: "b@example.test",
  };
  const withTz = generateShowingICS({ ...base, timeZone: NY });
  assert.match(withTz, /DTSTART:20261114T150000Z/);
  assert.match(withTz, /DTEND:20261114T153000Z/);
  const floating = generateShowingICS(base);
  assert.match(floating, /DTSTART:20261114T100000\r?\n/);
  const spring = generateShowingICS({ ...base, date: "2027-03-14", timeZone: NY });
  assert.match(spring, /DTSTART:20270314T140000Z/); // EDT
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
