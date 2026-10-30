import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_LIMITS,
  processBookingRequest,
  type BookingDeps,
  type OutgoingEmail,
} from "../showingBooking";

// These tests run the booking flow end to end against fake dependencies. Every
// call a real run would make to the database, email provider, calendar, push
// service or follow-up scheduler lands in `calls`, so a test can say exactly what
// did and did not happen - and in what order.

const NOW = new Date("2026-11-10T15:00:00Z");
const LISTING = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const AGENT = "9b2c8a40-1111-4222-8333-444455556666";

const WRITES = new Set([
  "reserveBookingAttempt",
  "insertLead",
  "updateLead",
  "insertShowing",
  "sendEmail",
  "addGoogleEvent",
  "enrollShowingFollowUps",
  "notifyAgentPush",
]);

interface Opts {
  listing?: { id: string; agent_id: string } | null;
  legacy?: { ok: true } | { ok: false; reason: string };
  reserve?: () => Promise<"reserved" | "limited" | "unavailable">;
  existingLeadId?: string | null;
  spamOk?: boolean;
  emailEnabled?: boolean;
  sendEmail?: (m: OutgoingEmail) => Promise<void>;
  agentName?: string;
}

function setup(o: Opts = {}) {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const rec = <T>(name: string, value: T) => (...args: unknown[]): T => {
    calls.push({ name, args });
    return value;
  };
  const recAsync = <T>(name: string, value: T) => async (...args: unknown[]): Promise<T> => {
    calls.push({ name, args });
    await Promise.resolve(); // a real call yields to other requests here
    return value;
  };

  const emails: OutgoingEmail[] = [];

  const deps: BookingDeps = {
    now: () => NOW,
    spamCheck: (input) => {
      calls.push({ name: "spamCheck", args: [input] });
      return { ok: o.spamOk ?? true };
    },
    emailEnabled: o.emailEnabled ?? true,
    appUrl: "https://app.example.test",
    store: {
      findListing: recAsync("findListing", o.listing === undefined ? { id: LISTING, agent_id: AGENT } : o.listing),
      legacyLeadRateLimit: recAsync("legacyLeadRateLimit", o.legacy ?? { ok: true as const }),
      reserveBookingAttempt: async (...args: unknown[]) => {
        calls.push({ name: "reserveBookingAttempt", args });
        return o.reserve ? o.reserve() : "reserved";
      },
      findLeadId: recAsync("findLeadId", o.existingLeadId ?? null),
      insertLead: recAsync("insertLead", "lead-new-1"),
      updateLead: recAsync("updateLead", undefined),
      insertShowing: recAsync("insertShowing", { id: "showing-1" }),
      getListing: recAsync("getListing", { street: "1 Main St", city: "Testville", state: "ZZ" }),
      getAgent: recAsync("getAgent", {
        name: o.agentName ?? "Alex Agent",
        phone: "5551234567",
        email: "agent@example.test",
        brokerage: "Example Realty",
      }),
    } as unknown as BookingDeps["store"],
    sendEmail: async (m) => {
      calls.push({ name: "sendEmail", args: [m] });
      emails.push(m);
      await Promise.resolve();
      if (o.sendEmail) await o.sendEmail(m);
    },
    addGoogleEvent: recAsync("addGoogleEvent", undefined) as BookingDeps["addGoogleEvent"],
    enrollShowingFollowUps: rec("enrollShowingFollowUps", undefined) as BookingDeps["enrollShowingFollowUps"],
    notifyAgentPush: rec("notifyAgentPush", undefined) as BookingDeps["notifyAgentPush"],
  };
  return { deps, calls, emails };
}

const body = (over: Record<string, unknown> = {}) => ({
  listingId: LISTING,
  showingDate: "2026-11-14",
  showingTime: "10:00 AM",
  name: "Dana Buyer",
  email: "dana@example.test",
  phone: "555-123-4567",
  message: "See you then",
  preApproved: "yes",
  timeline: "asap",
  hasAgent: "no",
  source: "direct",
  honeypot: "",
  ...over,
});

const names = (calls: Array<{ name: string }>) => calls.map((c) => c.name);
const writesIn = (calls: Array<{ name: string }>) => calls.filter((c) => WRITES.has(c.name));

// ---- nothing happens before validation ------------------------------------

test("invalid input is rejected with no database call, no write and no send of any kind", async () => {
  const bad: unknown[] = [
    null,
    "not json object",
    body({ listingId: "nope" }),
    body({ showingDate: "2026-02-31" }),
    body({ showingDate: "2020-01-01" }),
    body({ showingTime: "10:07 AM" }),
    body({ showingTime: '10:00 AM"><img src=x onerror=1>' }),
    body({ showingTime: "x".repeat(50_000) }),
    body({ email: "dana@example.test\r\nBcc: victim@example.test" }),
    body({ email: "" }),
    body({ name: "<script>alert(1)</script>" }),
    body({ name: "" }),
    body({ phone: "<b>" }),
    body({ message: "x".repeat(1001) }),
    body({ preApproved: "sure" }),
  ];
  for (const b of bad) {
    const { deps, calls } = setup();
    const r = await processBookingRequest(b, deps);
    assert.equal(r.status, 400, JSON.stringify(b)?.slice(0, 80));
    assert.deepEqual(calls, [], `calls made for ${JSON.stringify(b)?.slice(0, 80)}`);
  }
  assertNoNetworkAttempts();
});

test("a bot that fills the honeypot gets a silent success and nothing else happens", async () => {
  const { deps, calls } = setup({ spamOk: false });
  const r = await processBookingRequest(body({ honeypot: "http://spam.example" }), deps);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true });
  assert.deepEqual(names(calls), ["spamCheck"]);
});

test("an unknown listing is a 404 after a single read, with no limiter row and no writes", async () => {
  const { deps, calls } = setup({ listing: null });
  const r = await processBookingRequest(body(), deps);
  assert.equal(r.status, 404);
  assert.deepEqual(names(calls), ["spamCheck", "findListing"]);
});

// ---- nothing is written or sent when rate limited --------------------------

test("over the legacy lead limit: 429, and the atomic reservation is never attempted", async () => {
  const { deps, calls } = setup({ legacy: { ok: false, reason: "Too many submissions from this address." } });
  const r = await processBookingRequest(body(), deps);
  assert.equal(r.status, 429);
  assert.deepEqual(writesIn(calls), []);
});

test("over the booking limit: 429 with Retry-After, and no lead, showing, email, calendar, follow-up or push", async () => {
  const { deps, calls, emails } = setup({ reserve: async () => "limited" });
  const r = await processBookingRequest(body(), deps);
  assert.equal(r.status, 429);
  assert.equal(r.headers?.["Retry-After"], String(BOOKING_LIMITS.windowMinutes * 60));
  assert.deepEqual(names(writesIn(calls)), ["reserveBookingAttempt"]);
  assert.deepEqual(emails, []);
  assert.ok(!names(calls).includes("findLeadId"));
});

test("limiter unavailable (for example the migration is not applied): fails closed with 503 and writes nothing", async () => {
  const { deps, calls, emails } = setup({ reserve: async () => "unavailable" });
  const r = await processBookingRequest(body(), deps);
  assert.equal(r.status, 503);
  assert.deepEqual(names(writesIn(calls)), ["reserveBookingAttempt"]);
  assert.deepEqual(emails, []);
});

// ---- ordering ---------------------------------------------------------------

test("reads come first, the reservation is the first write, and every other write follows it", async () => {
  const { deps, calls } = setup();
  const r = await processBookingRequest(body(), deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.showingId, "showing-1");

  const order = names(calls);
  const reserveAt = order.indexOf("reserveBookingAttempt");
  assert.ok(reserveAt > 0);
  assert.deepEqual(order.slice(0, reserveAt), ["spamCheck", "findListing", "legacyLeadRateLimit"]);
  const firstWrite = order.findIndex((n) => WRITES.has(n));
  assert.equal(firstWrite, reserveAt, "the reservation is the first write");
  assert.ok(order.indexOf("insertLead") > reserveAt);
  assert.ok(order.indexOf("insertShowing") > order.indexOf("insertLead"));
  assert.ok(order.indexOf("sendEmail") > order.indexOf("insertShowing"));
  assert.ok(order.indexOf("enrollShowingFollowUps") > order.indexOf("insertShowing"));
});

test("the reservation is keyed on the listing and the lower-cased email", async () => {
  const { deps, calls } = setup();
  await processBookingRequest(body({ email: "Dana.Buyer@Example.TEST" }), deps);
  const reserve = calls.find((c) => c.name === "reserveBookingAttempt");
  assert.deepEqual(reserve?.args, [LISTING, "dana.buyer@example.test"]);
});

// ---- the client cannot choose the lead or the agent ---------------------------

test("a client-supplied leadId or agentId is never used", async () => {
  const OTHER_LEAD = "11111111-1111-4111-8111-111111111111";
  const { deps, calls } = setup({ existingLeadId: "lead-existing-9" });
  const r = await processBookingRequest(
    body({ leadId: OTHER_LEAD, agentId: "attacker-agent" }),
    deps
  );
  assert.equal(r.status, 200);
  const touched = JSON.stringify(calls.map((c) => c.args));
  assert.ok(!touched.includes(OTHER_LEAD));
  assert.ok(!touched.includes("attacker-agent"));
  const showing = calls.find((c) => c.name === "insertShowing");
  assert.equal((showing?.args[0] as Record<string, unknown>).lead_id, "lead-existing-9");
  assert.equal((showing?.args[0] as Record<string, unknown>).agent_id, AGENT);
});

// ---- concurrency --------------------------------------------------------------

test("concurrent bookings: only as many succeed as the single atomic reservation allows", async () => {
  // Stand-in for public.reserve_booking_attempt: the check and the count are one
  // synchronous step, which is the guarantee the SQL function provides with its
  // advisory locks. The flow under test must rely on this one call and nothing else.
  let accepted = 0;
  const reserve = async (): Promise<"reserved" | "limited"> => {
    if (accepted >= BOOKING_LIMITS.perEmailPerListing) return "limited";
    accepted += 1;
    return "reserved";
  };

  const shared = setup({ reserve });
  const results = await Promise.all(
    Array.from({ length: 20 }, () => processBookingRequest(body(), shared.deps))
  );

  const ok = results.filter((r) => r.status === 200).length;
  const limited = results.filter((r) => r.status === 429).length;
  assert.equal(ok, BOOKING_LIMITS.perEmailPerListing);
  assert.equal(limited, 20 - BOOKING_LIMITS.perEmailPerListing);

  const count = (n: string) => shared.calls.filter((c) => c.name === n).length;
  assert.equal(count("reserveBookingAttempt"), 20);
  assert.equal(count("insertShowing"), BOOKING_LIMITS.perEmailPerListing);
  assert.equal(count("sendEmail"), BOOKING_LIMITS.perEmailPerListing * 2);
  assert.equal(count("enrollShowingFollowUps"), BOOKING_LIMITS.perEmailPerListing);
  assert.equal(count("notifyAgentPush"), BOOKING_LIMITS.perEmailPerListing);
});

// ---- what a successful booking sends -----------------------------------------

test("a successful booking sends exactly one buyer email and one agent email, each with the invite", async () => {
  const { deps, emails } = setup();
  const r = await processBookingRequest(body(), deps);
  assert.equal(r.status, 200);
  assert.equal(emails.length, 2);
  const [buyer, agent] = emails;
  assert.equal(buyer.to, "dana@example.test");
  assert.equal(agent.to, "agent@example.test");
  assert.equal(buyer.attachments?.[0].filename, "showing.ics");
  assert.equal(agent.attachments?.[0].filename, "showing.ics");
  // Documented limitation: until the showing-request phase this still says "Confirmed"
  // to an address nobody has verified.
  assert.match(buyer.html, /Your Showing is Confirmed!/);
});

test("markup in the submitted name never becomes HTML in either email (it is rejected before any send)", async () => {
  const { deps, calls } = setup();
  const r = await processBookingRequest(body({ name: '<img src=x onerror=alert(1)>' }), deps);
  assert.equal(r.status, 400);
  assert.deepEqual(calls, []);
});

test("an apostrophe in a real name is encoded, not dropped or trusted", async () => {
  const { deps, emails } = setup();
  await processBookingRequest(body({ name: "Mary O'Brien" }), deps);
  assert.match(emails[1].html, /Mary O&#39;Brien/);
});

test("an agent name with header characters cannot inject into the From line", async () => {
  const { deps, emails } = setup({ agentName: 'Evil <x@y.test>\r\nBcc: z@example.test' });
  await processBookingRequest(body(), deps);
  const from = emails[0].from;
  assert.doesNotMatch(from, /[\r\n]/);
  assert.equal((from.match(/</g) ?? []).length, 1);
  assert.match(from, / via ListingFlare <leads@listingflare\.com>$/);
});

test("a failed email send is logged but does not turn a saved booking into an error", async () => {
  const origError = console.error;
  console.error = () => {};
  try {
    const { deps, calls } = setup({
      sendEmail: async () => {
        throw new Error("provider down");
      },
    });
    const r = await processBookingRequest(body(), deps);
    assert.equal(r.status, 200);
    assert.ok(names(calls).includes("enrollShowingFollowUps"));
  } finally {
    console.error = origError;
  }
});

test("with email disabled nothing is sent, but the booking is still saved", async () => {
  const { deps, calls, emails } = setup({ emailEnabled: false });
  const r = await processBookingRequest(body(), deps);
  assert.equal(r.status, 200);
  assert.deepEqual(emails, []);
  assert.ok(names(calls).includes("insertShowing"));
});

test("no test in this file reached the network", () => {
  assertNoNetworkAttempts();
});
