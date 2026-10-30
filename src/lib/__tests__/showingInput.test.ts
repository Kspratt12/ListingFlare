import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SHOWING_TIME_SLOTS,
  isAcceptableShowingDate,
  isValidEmail,
  validateShowingRequest,
} from "../showingInput";

const NOW = new Date("2026-11-10T15:00:00Z");
const LISTING = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const good = (over: Record<string, unknown> = {}) => ({
  listingId: LISTING,
  showingDate: "2026-11-14",
  showingTime: "10:00 AM",
  name: "Dana Buyer",
  email: "Dana.Buyer@Example.com",
  phone: "(555) 123-4567",
  message: "Is Saturday ok?",
  preApproved: "yes",
  timeline: "asap",
  hasAgent: "no",
  source: "instagram",
  honeypot: "",
  formStartedAt: 1700000000000,
  ...over,
});

const rejects = (body: unknown, field?: string) => {
  const r = validateShowingRequest(body, NOW);
  assert.equal(r.ok, false, `expected rejection for ${JSON.stringify(body)}`);
  if (!r.ok && field) assert.equal(r.field, field);
  if (!r.ok) {
    // one generic message, no field names leaked to the caller
    assert.equal(r.error, "Please check the date, time and contact details and try again.");
  }
};

test("a normal booking passes and the email is lower-cased", () => {
  const r = validateShowingRequest(good(), NOW);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.email, "dana.buyer@example.com");
    assert.equal(r.value.showingTime, "10:00 AM");
    assert.equal(r.value.source, "instagram");
  }
});

test("a client-supplied leadId is ignored, never carried into the validated value", () => {
  const r = validateShowingRequest(good({ leadId: "11111111-1111-4111-8111-111111111111" }), NOW);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal("leadId" in r.value, false);
});

test("body must be an object and listingId must be a UUID", () => {
  rejects(null, "body");
  rejects("hello", "body");
  rejects([], "body");
  rejects(good({ listingId: "not-a-uuid" }), "listingId");
  rejects(good({ listingId: undefined }), "listingId");
  rejects(good({ listingId: `${LISTING}' or '1'='1` }), "listingId");
});

test("showingTime must be exactly one of the offered slots", () => {
  for (const slot of SHOWING_TIME_SLOTS) {
    assert.equal(validateShowingRequest(good({ showingTime: slot }), NOW).ok, true, slot);
  }
  for (const bad of [
    "10:15 AM",
    "10:00 am",
    "10:00AM",
    " 10:00 AM",
    "10:00 AM ",
    "8:00 AM",
    "5:30 PM",
    "",
    "<script>alert(1)</script>",
    '10:00 AM"><img src=x onerror=alert(1)>',
    "10:00 AM\r\nBcc: victim@example.com",
    "x".repeat(10_000),
    1000,
    null,
  ]) {
    rejects(good({ showingTime: bad }), "showingTime");
  }
});

test("showingDate must be a real calendar date inside the accepted window", () => {
  // window is UTC today - 1 day .. UTC today + 366 days (see the limitation note in showingInput.ts)
  assert.equal(isAcceptableShowingDate("2026-11-09", NOW), true); // yesterday (UTC)
  assert.equal(isAcceptableShowingDate("2026-11-10", NOW), true); // today
  assert.equal(isAcceptableShowingDate("2027-11-11", NOW), true); // today + 366 days
  assert.equal(isAcceptableShowingDate("2026-11-08", NOW), false); // two days ago
  assert.equal(isAcceptableShowingDate("2027-11-12", NOW), false); // today + 367 days
  for (const bad of [
    "2026-02-31",
    "2026-13-01",
    "2026-00-10",
    "2026-11-1",
    "26-11-14",
    "2026/11/14",
    "2026-11-14T10:00:00Z",
    "2026-11-14<script>",
    "",
    null,
    20261114,
  ]) {
    assert.equal(isAcceptableShowingDate(bad, NOW), false, String(bad));
  }
  rejects(good({ showingDate: "2020-01-01" }), "showingDate");
});

test("the date rule is a UTC window, not a statement about the property's timezone", () => {
  // Documented limitation: late on the evening of the 10th in Los Angeles it is already the
  // 11th in UTC, and a slot "today" in LA that has already passed is still accepted.
  const lateLosAngeles = new Date("2026-11-11T05:00:00Z"); // 9pm on 10 Nov in Los Angeles
  assert.equal(isAcceptableShowingDate("2026-11-10", lateLosAngeles), true);
});

test("email must be one plain address with no whitespace, quotes, angle brackets or line breaks", () => {
  assert.equal(isValidEmail("a.b+c@example.co.uk"), true);
  for (const bad of [
    "a@b",
    "a b@example.com",
    "a@example.com\r\nATTENDEE:mailto:evil@example.com",
    "a@example.com\nBEGIN:VALARM",
    'a"@example.com',
    "<a@example.com>",
    "a@example.com, b@example.com",
    "a@@example.com",
    "a..b@example.com",
    "a@exam..ple.com",
    "@example.com",
    `${"a".repeat(250)}@example.com`,
    "",
    null,
    42,
  ]) {
    assert.equal(isValidEmail(bad), false, String(bad));
  }
  rejects(good({ email: "a@example.com\r\nBEGIN:VALARM" }), "email");
});

test("name cannot carry markup, quotes, control characters or exceed 100 characters", () => {
  assert.equal(validateShowingRequest(good({ name: "Mary O'Brien-Smith Jr." }), NOW).ok, true);
  for (const bad of [
    "<script>alert(1)</script>",
    'Dana "><img src=x onerror=1>',
    "Dana\r\nBcc: x@example.com",
    "Dana\u0000",
    "",
    "   ",
    "A".repeat(101),
    5,
    null,
  ]) {
    rejects(good({ name: bad }), "name");
  }
});

test("phone and message are bounded and control-character free", () => {
  assert.equal(validateShowingRequest(good({ phone: "+1 (555) 123-4567" }), NOW).ok, true);
  assert.equal(validateShowingRequest(good({ phone: "" }), NOW).ok, true);
  assert.equal(validateShowingRequest(good({ phone: undefined }), NOW).ok, true);
  rejects(good({ phone: "555-1234<script>" }), "phone");
  rejects(good({ phone: "1".repeat(31) }), "phone");
  rejects(good({ phone: 5551234 }), "phone");

  assert.equal(validateShowingRequest(good({ message: "line one\nline two" }), NOW).ok, true);
  rejects(good({ message: "x".repeat(1001) }), "message");
  rejects(good({ message: "bad\u0000byte" }), "message");
  rejects(good({ message: { not: "a string" } }), "message");
});

test("qualification answers must be known values; anything else is rejected", () => {
  assert.equal(validateShowingRequest(good({ preApproved: undefined, timeline: "", hasAgent: null }), NOW).ok, true);
  rejects(good({ preApproved: "definitely" }), "preApproved");
  rejects(good({ timeline: "<b>asap</b>" }), "timeline");
  rejects(good({ hasAgent: "maybe" }), "hasAgent");
});

test("an odd source falls back to 'direct' instead of being stored", () => {
  const r = validateShowingRequest(good({ source: '<script>x</script>' }), NOW);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.source, "direct");
});

test("the server's slot list matches the slot list in the browser form", () => {
  const srcDir = process.env.LF_SRC_DIR;
  assert.ok(srcDir, "LF_SRC_DIR is set by the test runner");
  const component = fs.readFileSync(path.join(srcDir, "components", "ShowingScheduler.tsx"), "utf8");
  const block = /const TIME_SLOTS = \[([\s\S]*?)\];/.exec(component);
  assert.ok(block, "TIME_SLOTS array found in ShowingScheduler.tsx");
  const clientSlots = Array.from(block[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  assert.deepEqual(clientSlots, [...SHOWING_TIME_SLOTS]);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
