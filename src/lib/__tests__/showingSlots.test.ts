import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { SHOWING_MINUTES, timeToMinutes, sameStart, slotsOverlap } from "../showingSlots";

test("clock parsing", () => {
  assert.equal(timeToMinutes("12:00 AM"), 0);
  assert.equal(timeToMinutes("12:30 PM"), 12 * 60 + 30);
  assert.equal(timeToMinutes("1:05 PM"), 13 * 60 + 5);
  assert.equal(timeToMinutes("11:30 PM"), 23 * 60 + 30);
  assert.equal(timeToMinutes("noon"), null);
  assert.equal(timeToMinutes("13:00"), null);
});

test("a showing lasts 30 minutes; starts closer than that overlap, starts exactly that far apart do not", () => {
  assert.equal(SHOWING_MINUTES, 30);
  assert.ok(slotsOverlap("10:00 AM", "10:00 AM"));
  assert.ok(slotsOverlap("10:00 AM", "10:15 AM"));
  assert.ok(slotsOverlap("10:15 AM", "10:00 AM"));
  assert.ok(slotsOverlap("10:00 AM", "10:29 AM"));
  assert.ok(!slotsOverlap("10:00 AM", "10:30 AM"));
  assert.ok(!slotsOverlap("10:30 AM", "10:00 AM"));
});

test("AM/PM boundaries are handled (11:45 AM vs 12:00 PM overlap; 11:30 AM vs 12:00 PM do not)", () => {
  assert.ok(slotsOverlap("11:45 AM", "12:00 PM"));
  assert.ok(!slotsOverlap("11:30 AM", "12:00 PM"));
  assert.ok(!slotsOverlap("11:30 PM", "12:00 AM"));
});

test("sameStart ignores formatting differences; unparseable times fall back to a case-insensitive text match", () => {
  assert.ok(sameStart("10:00 AM", "10:00 am"));
  assert.ok(sameStart(" 9:00 AM", "9:00 AM"));
  assert.ok(!sameStart("10:00 AM", "10:30 AM"));
  assert.ok(sameStart("Call me", "call me"));
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
