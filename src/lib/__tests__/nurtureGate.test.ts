import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { nurturePausedBody, nurtureSendsEnabled } from "../automationFlags";
import { BOOKING_LIMITS } from "../showingBooking";

const srcDir = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8");

test("the gate is on only for the exact value 1; everything else is paused", () => {
  assert.equal(nurtureSendsEnabled({ NURTURE_SENDS_ENABLED: "1" }), true);
  for (const v of [undefined, "", "0", "true", "TRUE", "yes", "on", " 1", "1 ", "01", "2"]) {
    assert.equal(nurtureSendsEnabled({ NURTURE_SENDS_ENABLED: v }), false, String(v));
  }
  assert.equal(nurtureSendsEnabled({}), false);
  // default argument reads the real environment, which _isolation has cleared
  assert.equal(nurtureSendsEnabled(), false);
});

test("the paused response is explicit and says nothing was changed", () => {
  const b = nurturePausedBody("feedback-request");
  assert.equal(b.ok, true);
  assert.equal(b.paused, true);
  assert.equal(b.job, "feedback-request");
  assert.match(String(b.note), /untouched/i);
});

// ---- static checks. These show where the gate sits in each route file; they do
// ---- NOT execute the handlers (see the report: next/server cannot be imported by
// ---- this runner).

function handlerBody(text: string): string {
  const i = text.search(/export async function (GET|POST)\b/);
  assert.ok(i >= 0, "handler found");
  return text.slice(i);
}

const FIRST_IO = /(getAdminClient\(\)|createServerSupabaseClient\(\)|process\.env\.RESEND_API_KEY|fetch\()/;

for (const route of [
  "app/api/feedback/request/route.ts",
  "app/api/testimonials/request/route.ts",
  "app/api/listings/notify-past-leads/route.ts",
]) {
  test(`static: ${route} checks the gate before any database, session or email access`, () => {
    const body = handlerBody(read(route));
    const gate = body.indexOf("nurtureSendsEnabled()");
    const io = body.search(FIRST_IO);
    assert.ok(gate >= 0, "gate present");
    assert.ok(io >= 0, "io present");
    assert.ok(gate < io, "gate precedes the first database/session/email access");
    assert.match(body.slice(gate, io), /return NextResponse\.json\(/);
  });
}

test("static: the daily job delegates to the tested cycle and does not touch follow_ups outside it", () => {
  const text = read("app/api/follow-ups/process/route.ts");
  assert.match(text, /runFollowUpCycle\(/);
  const handler = handlerBody(text);
  // the only follow_ups access in the handler is the read inside fetchDue
  const uses = Array.from(handler.matchAll(/from\("follow_ups"\)/g)).length;
  assert.equal(uses, 1);
  assert.doesNotMatch(handler, /\.update\(|\.delete\(|\.insert\(/);
});

test("static: appointment notices are not behind the gate", () => {
  for (const route of ["app/api/showings/reminders/route.ts", "app/api/showings/book/route.ts"]) {
    assert.doesNotMatch(read(route), /nurtureSendsEnabled|NURTURE_SENDS_ENABLED/, route);
  }
  assert.doesNotMatch(read("lib/showingBooking.ts"), /nurture/i);
});

// ---- migration 035: static review of the SQL -------------------------------------
// The SQL has NOT been executed (no Postgres is available here). These checks only
// confirm the file has the structure the design depends on and matches the app's numbers.

const sql = fs.readFileSync(path.join(srcDir, "..", "supabase-migration-035-booking-attempts.sql"), "utf8");
const code = sql.replace(/--.*$/gm, ""); // ignore comments

test("migration 035: both advisory locks are taken, in a fixed order, before anything is counted or inserted", () => {
  const emailLock = code.indexOf("pg_advisory_xact_lock(hashtextextended('booking_attempts:email:'");
  const listingLock = code.indexOf("pg_advisory_xact_lock(hashtextextended('booking_attempts:listing:'");
  const firstCount = code.indexOf("select count(*)");
  const insert = code.indexOf("insert into public.booking_attempts");
  assert.ok(emailLock > 0 && listingLock > emailLock, "email lock, then listing lock");
  assert.ok(firstCount > listingLock, "counting starts after both locks");
  assert.ok(insert > firstCount, "the insert is after every count, in the same function");
});

test("migration 035: the table is private and the function is executable by the service role only", () => {
  assert.match(code, /alter table public\.booking_attempts enable row level security/);
  assert.match(code, /revoke all on public\.booking_attempts from anon, authenticated/);
  assert.doesNotMatch(code, /create policy/i);
  assert.match(code, /security definer/);
  assert.match(code, /set search_path = public, pg_temp/);
  assert.match(code, /revoke all on function public\.reserve_booking_attempt\(uuid, text, int, int, int, int\)\s+from public, anon, authenticated/);
  assert.match(code, /grant execute on function public\.reserve_booking_attempt\(uuid, text, int, int, int, int\)\s+to service_role/);
});

test("migration 035: the default thresholds in the SQL equal BOOKING_LIMITS in the app", () => {
  const def = (name: string) => {
    const m = new RegExp(`${name} int default (\\d+)`).exec(code);
    assert.ok(m, name);
    return Number(m[1]);
  };
  assert.equal(def("p_window_minutes"), BOOKING_LIMITS.windowMinutes);
  assert.equal(def("p_per_email_listing"), BOOKING_LIMITS.perEmailPerListing);
  assert.equal(def("p_per_email_all"), BOOKING_LIMITS.perEmailAllListings);
  assert.equal(def("p_per_listing"), BOOKING_LIMITS.perListing);
  assert.deepEqual(
    { ...BOOKING_LIMITS },
    { windowMinutes: 10, perEmailPerListing: 3, perEmailAllListings: 5, perListing: 15 }
  );
});

test("the route passes every threshold to the function from BOOKING_LIMITS, not literals", () => {
  const route = read("app/api/showings/book/route.ts");
  for (const k of ["windowMinutes", "perEmailPerListing", "perEmailAllListings", "perListing"]) {
    assert.match(route, new RegExp(`BOOKING_LIMITS\\.${k}`), k);
  }
  assert.match(route, /rpc\("reserve_booking_attempt"/);
  assert.match(route, /return "unavailable"/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
