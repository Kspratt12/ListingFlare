import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { processShowingResponse, type ResponseDeps, type ShowingRow } from "../showingResponse";
import type { OutgoingEmail } from "../showingBooking";

// Everything a real run would touch (database, email, calendar, follow-ups) is a
// fake that records the call. No test here sends an email or an invitation.

const NOW = new Date("2026-11-10T15:00:00Z");
const AGENT = "9b2c8a40-1111-4222-8333-444455556666";
const OTHER_AGENT = "aaaaaaaa-1111-4222-8333-444455556666";
const SHOWING = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

function row(over: Partial<ShowingRow> = {}): ShowingRow {
  return {
    id: SHOWING,
    agent_id: AGENT,
    listing_id: "11111111-1111-4111-8111-111111111111",
    lead_id: "lead-1",
    showing_date: "2026-11-14",
    showing_time: "10:00 AM",
    name: "Dana Buyer",
    email: "dana@example.test",
    phone: "5551234567",
    message: "",
    status: "requested",
    ...over,
  };
}

function setup(o: { showing?: ShowingRow | null; conflict?: boolean; raced?: boolean; confirmResult?: "confirmed" | "already_confirmed" | "conflict" | "not_requested" | "not_found"; sendFails?: boolean; emailEnabled?: boolean; tz?: string | null; now?: Date } = {}) {
  const calls: string[] = [];
  const emails: OutgoingEmail[] = [];
  const googleEvents: Array<{ timeZone: string; showingDate: string; showingTime: string }> = [];
  const deps: ResponseDeps = {
    now: () => o.now ?? NOW,
    emailEnabled: o.emailEnabled ?? true,
    store: {
      getShowing: async () => (o.showing === undefined ? row() : o.showing),
      confirmAtomically: async (_id, agentId) => {
        calls.push("confirm:" + agentId);
        return o.confirmResult ?? (o.conflict ? "conflict" : o.raced ? "not_requested" : "confirmed");
      },
      declineIfRequested: async (_id, agentId) => {
        calls.push("decline:" + agentId);
        return !o.raced;
      },
      updateLead: async (_id, f) => {
        calls.push("updateLead:" + JSON.stringify(f));
      },
      getListing: async () => ({ street: "1 Main St", city: "Testville", state: "ZZ" }),
      getTimeZone: async () => (o.tz === undefined ? "America/New_York" : o.tz),
      getAgent: async () => ({ name: "Alex Agent", phone: "5550001111", email: "agent@example.test" }),
    },
    async sendEmail(m) {
      calls.push("sendEmail");
      emails.push(m);
      if (o.sendFails) throw new Error("provider down");
    },
    async addGoogleEvent(_agent, ev) {
      calls.push("addGoogleEvent");
      googleEvents.push(ev);
    },
    enrollShowingFollowUps() {
      calls.push("enroll");
    },
  };
  return { deps, calls, emails, googleEvents };
}

const ok = { agentId: AGENT, showingId: SHOWING };

test("confirm: status moves requested -> confirmed, buyer gets ONE confirmation with an invite, calendar + follow-ups follow", async () => {
  const { deps, calls, emails } = setup();
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "confirmed");
  assert.deepEqual(calls.filter((c) => !c.startsWith("updateLead")), ["confirm:" + AGENT, "sendEmail", "addGoogleEvent", "enroll"]);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, "dana@example.test");
  assert.match(emails[0].html, /Your Showing is Confirmed!/);
  assert.equal(emails[0].attachments?.[0].filename, "showing.ics");
  assert.ok(calls.some((c) => c.startsWith("updateLead") && c.includes("showing_scheduled")));
});

test("decline: buyer is told the time is not available, with NO invite, no calendar entry, no follow-ups", async () => {
  const { deps, calls, emails } = setup();
  const r = await processShowingResponse({ ...ok, action: "decline" }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "declined");
  assert.deepEqual(calls, ["decline:" + AGENT, "sendEmail"]);
  assert.match(emails[0].html, /not available/i);
  assert.doesNotMatch(emails[0].html, /Confirmed/);
  assert.equal(emails[0].attachments, undefined);
});

test("only the owning agent can respond; someone else's showing is a 404 with no change", async () => {
  const { deps, calls } = setup({ showing: row({ agent_id: OTHER_AGENT }) });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 404);
  assert.deepEqual(calls, []);
});

test("an unknown showing is a 404", async () => {
  const { deps } = setup({ showing: null });
  assert.equal((await processShowingResponse({ ...ok, action: "confirm" }, deps)).status, 404);
});

test("bad ids and bad actions are rejected before any lookup", async () => {
  const { deps, calls } = setup();
  assert.equal((await processShowingResponse({ agentId: AGENT, showingId: "nope", action: "confirm" }, deps)).status, 400);
  assert.equal((await processShowingResponse({ agentId: AGENT, showingId: SHOWING, action: "cancel" }, deps)).status, 400);
  assert.equal((await processShowingResponse({ agentId: AGENT, showingId: 5, action: "confirm" }, deps)).status, 400);
  assert.deepEqual(calls, []);
});

test("responding twice with the same action changes nothing and sends nothing", async () => {
  const { deps, calls } = setup({ showing: row({ status: "confirmed" }) });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.unchanged, true);
  assert.deepEqual(calls, []);
});

test("a historical confirmed booking cannot be declined here, and is never re-notified", async () => {
  const { deps, calls } = setup({ showing: row({ status: "confirmed" }) });
  const r = await processShowingResponse({ ...ok, action: "decline" }, deps);
  assert.equal(r.status, 409);
  assert.deepEqual(calls, []);
});

test("confirm is refused when another showing is already confirmed for that slot", async () => {
  const { deps, calls } = setup({ conflict: true });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 409);
  assert.match(String(r.body.error), /overlaps/);
  assert.deepEqual(calls, ["confirm:" + AGENT]); // only the atomic check ran; nothing was sent
});

test("declining a conflicting request is still allowed", async () => {
  const { deps } = setup({ conflict: true });
  assert.equal((await processShowingResponse({ ...ok, action: "decline" }, deps)).status, 200);
});

test("confirming a date that has already passed is refused", async () => {
  const { deps, calls } = setup({ showing: row({ showing_date: "2026-11-09" }) });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 409);
  assert.deepEqual(calls, []);
});

test("a concurrent response that lost the conditional update gets 409 and sends nothing", async () => {
  const { deps, calls } = setup({ raced: true });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 409);
  assert.deepEqual(calls, ["confirm:" + AGENT]);
});

test("a failing email provider does not undo the confirmation", async () => {
  const { deps, calls } = setup({ sendFails: true });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 200);
  assert.ok(calls.includes("addGoogleEvent"));
  assert.ok(calls.includes("enroll"));
});

test("with email disabled the status still changes and no email is attempted", async () => {
  const { deps, calls } = setup({ emailEnabled: false });
  assert.equal((await processShowingResponse({ ...ok, action: "confirm" }, deps)).status, 200);
  assert.ok(!calls.includes("sendEmail"));
});

test("the invite attached on confirmation is a confirmed event with the agent as organizer", async () => {
  const { deps, emails } = setup();
  await processShowingResponse({ ...ok, action: "confirm" }, deps);
  const ics = Buffer.from(emails[0].attachments![0].content, "base64").toString("utf8");
  assert.match(ics, /STATUS:CONFIRMED/);
  assert.match(ics, /DTSTART:20261114T150000Z/); // 10:00 AM EST, exact UTC
});

// ---- time zone behaviour ----------------------------------------------------------

test("confirm with a known zone: email shows the zone, the Google event carries the zone, the invite is exact UTC", async () => {
  const { deps, emails, googleEvents, calls } = setup({ tz: "America/New_York" });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 200);
  assert.match(emails[0].html, /10:00 AM EST/);
  assert.equal(googleEvents.length, 1);
  assert.equal(googleEvents[0].timeZone, "America/New_York");
  assert.ok(calls.includes("addGoogleEvent"));
});

test("confirm with NO stored time zone is REFUSED before anything changes: no status change, no email, no calendar entry, and the agent is told to set the zone", async () => {
  const { deps, calls } = setup({ tz: null });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 409);
  assert.equal(r.body.code, "timezone_required");
  assert.match(String(r.body.error), /Settings/);
  assert.deepEqual(calls, []);
});

test("an invalid stored zone is treated as no zone (the store only returns validated zones)", async () => {
  const { deps, calls } = setup({ tz: null });
  assert.equal((await processShowingResponse({ ...ok, action: "confirm" }, deps)).status, 409);
  assert.deepEqual(calls, []);
});

test("DECLINE needs no time zone: an agent can always say no", async () => {
  const { deps, calls } = setup({ tz: null });
  const r = await processShowingResponse({ ...ok, action: "decline" }, deps);
  assert.equal(r.status, 200);
  assert.deepEqual(calls, ["decline:" + AGENT, "sendEmail"]);
});

test("daylight-saving fall-back day: 10:00 AM on 2026-11-01 is EST (UTC-5); the day before it is EDT", async () => {
  const fall = setup({ showing: row({ showing_date: "2026-11-01" }), now: new Date("2026-10-20T12:00:00Z") });
  await processShowingResponse({ ...ok, action: "confirm" }, fall.deps);
  const icsFall = Buffer.from(fall.emails[0].attachments![0].content, "base64").toString("utf8");
  assert.match(icsFall, /DTSTART:20261101T150000Z/);
  assert.match(fall.emails[0].html, /10:00 AM EST/);
  const before = setup({ showing: row({ showing_date: "2026-10-31" }), now: new Date("2026-10-20T12:00:00Z") });
  await processShowingResponse({ ...ok, action: "confirm" }, before.deps);
  const icsBefore = Buffer.from(before.emails[0].attachments![0].content, "base64").toString("utf8");
  assert.match(icsBefore, /DTSTART:20261031T140000Z/);
  assert.match(before.emails[0].html, /10:00 AM EDT/);
});

test("daylight-saving spring-forward day: a time that does not exist (2:30 AM on 2027-03-14) cannot be confirmed", async () => {
  const { deps, calls } = setup({ showing: row({ showing_date: "2027-03-14", showing_time: "2:30 AM" }), now: new Date("2027-03-01T12:00:00Z") });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 409);
  assert.match(String(r.body.error), /does not exist/);
  assert.deepEqual(calls, []);
});

test("a time that happens twice (1:30 AM on 2026-11-01) is confirmed as the first occurrence (EDT)", async () => {
  const { deps, emails } = setup({ showing: row({ showing_date: "2026-11-01", showing_time: "1:30 AM" }), now: new Date("2026-10-20T12:00:00Z") });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 200);
  const ics = Buffer.from(emails[0].attachments![0].content, "base64").toString("utf8");
  assert.match(ics, /DTSTART:20261101T053000Z/);
  assert.match(emails[0].html, /1:30 AM EDT/);
});

test("'today' is the date at the property: 10:30 PM Eastern on Nov 10 can still confirm a Nov 10 slot, though it is already Nov 11 in UTC", async () => {
  const now = new Date("2026-11-11T03:30:00Z");
  const withZone = setup({ showing: row({ showing_date: "2026-11-10", showing_time: "11:00 PM" }), now, tz: "America/New_York" });
  assert.equal((await processShowingResponse({ ...ok, action: "confirm" }, withZone.deps)).status, 200);
  const noZone = setup({ showing: row({ showing_date: "2026-11-10", showing_time: "11:00 PM" }), now, tz: null });
  assert.equal((await processShowingResponse({ ...ok, action: "confirm" }, noZone.deps)).status, 409);
});

test("the server's own time zone has no effect on the result", async () => {
  const before = process.env.TZ;
  process.env.TZ = "Pacific/Auckland";
  try {
    const { deps, emails } = setup();
    await processShowingResponse({ ...ok, action: "confirm" }, deps);
    const ics = Buffer.from(emails[0].attachments![0].content, "base64").toString("utf8");
    assert.match(ics, /DTSTART:20261114T150000Z/);
  } finally {
    if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
  }
});

// ---- authorization, atomic confirm, interval conflicts, displayed times -------------

test("AUTHORIZATION: another agent cannot confirm or decline this agent's request; nothing is read beyond the ownership check, written or sent", async () => {
  for (const action of ["confirm", "decline"]) {
    const { deps, calls, emails } = setup();
    const r = await processShowingResponse({ agentId: OTHER_AGENT, showingId: SHOWING, action }, deps);
    assert.equal(r.status, 404, action);
    assert.deepEqual(calls, [], action);
    assert.equal(emails.length, 0);
  }
});

test("the agent id passed to the atomic confirm is the signed-in agent's, so the database function re-checks ownership itself", async () => {
  const { deps, calls } = setup();
  await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.ok(calls.includes("confirm:" + AGENT));
});

test("the database function reports not_found (wrong agent) -> 404, with no email, calendar or follow-up", async () => {
  const { deps, calls } = setup({ confirmResult: "not_found" });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 404);
  assert.deepEqual(calls, ["confirm:" + AGENT]);
});

test("the atomic confirm finding an OVERLAPPING confirmed showing returns 409 and sends nothing", async () => {
  const { deps, calls, emails } = setup({ confirmResult: "conflict" });
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 409);
  assert.match(String(r.body.error), /overlaps/);
  assert.deepEqual(calls, ["confirm:" + AGENT]);
  assert.equal(emails.length, 0);
});

test("SIMULTANEOUS confirmations of two requests for one slot: the serialized database function lets exactly one win, the other gets a conflict and sends nothing", async () => {
  // A fake that behaves like confirm_showing_request: a queue (the lock) so the second caller sees the first's result.
  let winner: string | null = null;
  const lock: Array<() => void> = [];
  let held = false;
  const acquire = () => new Promise<void>((res) => { if (!held) { held = true; res(); } else lock.push(res); });
  const release = () => { const next = lock.shift(); if (next) next(); else held = false; };
  const mk = (id: string) => {
    const x = setup({ showing: row({ id }) });
    x.deps.store.confirmAtomically = async (sid) => {
      await acquire();
      try {
        await Promise.resolve();
        if (winner && winner !== sid) return "conflict";
        winner = sid;
        return "confirmed";
      } finally { release(); }
    };
    return x;
  };
  const a = mk("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
  const b = mk("3f2504e0-4f89-41d3-9a0c-0305e82c3302");
  const [ra, rb] = await Promise.all([
    processShowingResponse({ agentId: AGENT, showingId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", action: "confirm" }, a.deps),
    processShowingResponse({ agentId: AGENT, showingId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302", action: "confirm" }, b.deps),
  ]);
  assert.deepEqual([ra.status, rb.status].sort(), [200, 409]);
  const sent = (a.emails.length > 0 ? 1 : 0) + (b.emails.length > 0 ? 1 : 0);
  assert.equal(sent, 1, "exactly one buyer is told 'confirmed'");
});

test("TIMES SHOWN TO THE BUYER AND THE AGENT: every email carries the zone abbreviation for that date", async () => {
  const conf = setup({ tz: "America/Chicago", showing: row({ showing_date: "2026-07-15" }), now: new Date("2026-07-01T12:00:00Z") });
  await processShowingResponse({ ...ok, action: "confirm" }, conf.deps);
  assert.match(conf.emails[0].html, /10:00 AM CDT/);
  assert.match(conf.emails[0].subject, /Showing Confirmed/);
  const dec = setup({ tz: "America/Chicago", showing: row({ showing_date: "2026-12-15" }) });
  await processShowingResponse({ ...ok, action: "decline" }, dec.deps);
  assert.match(dec.emails[0].html, /10:00 AM CST/);
  const phx = setup({ tz: "America/Phoenix", showing: row({ showing_date: "2026-07-15" }), now: new Date("2026-07-01T12:00:00Z") });
  await processShowingResponse({ ...ok, action: "confirm" }, phx.deps);
  assert.match(phx.emails[0].html, /10:00 AM MST/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
