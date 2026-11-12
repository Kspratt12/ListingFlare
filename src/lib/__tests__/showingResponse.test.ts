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

function setup(o: { showing?: ShowingRow | null; conflict?: boolean; raced?: boolean; sendFails?: boolean; emailEnabled?: boolean } = {}) {
  const calls: string[] = [];
  const emails: OutgoingEmail[] = [];
  const deps: ResponseDeps = {
    now: () => NOW,
    emailEnabled: o.emailEnabled ?? true,
    store: {
      getShowing: async () => (o.showing === undefined ? row() : o.showing),
      hasConfirmedConflict: async () => !!o.conflict,
      transitionFromRequested: async (_id, to) => {
        calls.push("transition:" + to);
        return !o.raced;
      },
      updateLead: async (_id, f) => {
        calls.push("updateLead:" + JSON.stringify(f));
      },
      getListing: async () => ({ street: "1 Main St", city: "Testville", state: "ZZ" }),
      getAgent: async () => ({ name: "Alex Agent", phone: "5550001111", email: "agent@example.test" }),
    },
    async sendEmail(m) {
      calls.push("sendEmail");
      emails.push(m);
      if (o.sendFails) throw new Error("provider down");
    },
    async addGoogleEvent() {
      calls.push("addGoogleEvent");
    },
    enrollShowingFollowUps() {
      calls.push("enroll");
    },
  };
  return { deps, calls, emails };
}

const ok = { agentId: AGENT, showingId: SHOWING };

test("confirm: status moves requested -> confirmed, buyer gets ONE confirmation with an invite, calendar + follow-ups follow", async () => {
  const { deps, calls, emails } = setup();
  const r = await processShowingResponse({ ...ok, action: "confirm" }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "confirmed");
  assert.deepEqual(calls.filter((c) => !c.startsWith("updateLead")), ["transition:confirmed", "sendEmail", "addGoogleEvent", "enroll"]);
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
  assert.deepEqual(calls, ["transition:declined", "sendEmail"]);
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
  assert.match(String(r.body.error), /already confirmed another/);
  assert.deepEqual(calls, []);
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
  assert.deepEqual(calls, ["transition:confirmed"]);
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
  assert.match(ics, /DTSTART:20261114T100000/);
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
