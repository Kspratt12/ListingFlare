import { assertNoNetworkAttempts, setEnv } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as bookPOST } from "../../app/api/showings/book/route";
import { GET as processGET } from "../../app/api/follow-ups/process/route";
import { GET as feedbackGET } from "../../app/api/feedback/request/route";
import { GET as testimonialsGET } from "../../app/api/testimonials/request/route";

// These tests call the REAL route handlers. Nothing leaves the process: the
// environment holds only dummy values, and global fetch is replaced by an
// in-memory fake that plays the database (PostgREST), the email provider, the AI
// provider and this app's own chained job URLs. Every request is recorded, and a
// request to any other host throws.
//
// Not covered here: listings/notify-past-leads. It imports next/headers, which the
// runner's one approved import rewrite (next/server) does not reach, so that route
// is checked by the static assertions in nurtureGate.test.ts instead.

const LISTING = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const AGENT = "9b2c8a40-1111-4222-8333-444455556666";
const SECRET = "test-cron-secret-not-real";
const APP = "http://app.test";
const DB = "http://127.0.0.1:1";

interface Call {
  method: string;
  host: string;
  path: string;
  table: string | null;
  headers: Headers;
  body: unknown;
  raw: string;
}

type Fixtures = Record<string, Array<Record<string, unknown>>>;

function baseFixtures(): Fixtures {
  return {
    listings: [
      { id: LISTING, agent_id: AGENT, street: "1 Main St", city: "Testville", state: "ZZ", price: 500000, beds: 3, baths: 2, sqft: 1800, features: ["Fenced yard"] },
    ],
    agent_profiles: [
      { id: AGENT, name: "Alex Agent", phone: "5551234567", email: "agent@example.test", brokerage: "Example Realty", subscription_status: "active", trial_ends_at: null },
    ],
    leads: [],
    follow_ups: [],
    showings: [],
  };
}

function installFakeWeb(opts: { fixtures?: Fixtures; rpc?: () => Response } = {}) {
  const fixtures = opts.fixtures ?? baseFixtures();
  const calls: Call[] = [];
  const unexpected: string[] = [];
  const previous = globalThis.fetch;

  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : (input as { url: string }).url);
    const method = (init?.method || "GET").toUpperCase();
    const headers = new Headers(init?.headers as HeadersInit | undefined);
    const raw = typeof init?.body === "string" ? init.body : "";
    let body: unknown = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
    const m = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
    const table = m ? m[1] : null;
    calls.push({ method, host: url.host, path: url.pathname, table, headers, body, raw });

    if (url.host === "127.0.0.1:1") {
      if (url.pathname === "/rest/v1/rpc/reserve_booking_attempt") return opts.rpc ? opts.rpc() : json(200, true);
      if (!table) return json(404, { message: "unexpected path" });
      const rows = fixtures[table] ?? [];
      const wantsObject = (headers.get("accept") || "").includes("pgrst.object");
      if (method === "HEAD") return new Response(null, { status: 200, headers: { "content-range": "*/0" } });
      if (method === "GET") {
        if (!wantsObject) return json(200, rows);
        return rows.length ? json(200, rows[0]) : json(406, { code: "PGRST116", message: "no rows", details: "", hint: "" });
      }
      if (method === "POST") {
        const row = { id: `${table}-new-1`, ...(body && typeof body === "object" ? (body as object) : {}) };
        return wantsObject ? json(201, row) : json(201, [row]);
      }
      return new Response(null, { status: 204 }); // PATCH / DELETE
    }
    if (url.host === "api.resend.com") return json(200, { id: "em_test_1" });
    if (url.host === "api.anthropic.com") {
      return json(200, {
        id: "msg_test", type: "message", role: "assistant", model: "test-model",
        content: [{ type: "text", text: "Hey Dana, just checking in on the home." }],
        stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
      });
    }
    if (url.host === "app.test") return json(200, { ok: true, job: url.pathname });
    unexpected.push(`${method} ${url.href}`);
    throw new Error(`unexpected request: ${method} ${url.href}`);
  }) as typeof fetch;

  return {
    calls,
    unexpected,
    restore: () => { globalThis.fetch = previous; },
    writes: () => calls.filter((c) => c.method !== "GET" && c.method !== "HEAD"),
    dbWrites: () => calls.filter((c) => c.host === "127.0.0.1:1" && c.method !== "GET" && c.method !== "HEAD" && c.path !== "/rest/v1/rpc/reserve_booking_attempt"),
    label: (c: Call) => `${c.method} ${c.host}${c.path}`,
  };
}

function dummyEnv() {
  setEnv("NEXT_PUBLIC_SUPABASE_URL", DB);
  setEnv("SUPABASE_SERVICE_ROLE_KEY", "dummy-service-key");
  setEnv("RESEND_API_KEY", "dummy-resend-key");
  setEnv("ANTHROPIC_API_KEY", "dummy-anthropic-key");
  setEnv("CRON_SECRET", SECRET);
  setEnv("NEXT_PUBLIC_APP_URL", APP);
  setEnv("NURTURE_SENDS_ENABLED", undefined);
  setEnv("DISABLE_TRIAL_LIFECYCLE", undefined);
}
function clearEnv() {
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "ANTHROPIC_API_KEY", "CRON_SECRET", "NEXT_PUBLIC_APP_URL", "NURTURE_SENDS_ENABLED", "DISABLE_TRIAL_LIFECYCLE"]) setEnv(k, undefined);
}

async function withWeb<T>(opts: Parameters<typeof installFakeWeb>[0], fn: (web: ReturnType<typeof installFakeWeb>) => Promise<T>): Promise<T> {
  dummyEnv();
  const web = installFakeWeb(opts);
  try {
    const out = await fn(web);
    assert.deepEqual(web.unexpected, [], "request to an unexpected host");
    return out;
  } finally {
    web.restore();
    clearEnv();
  }
}

const bookReq = (body: unknown, raw?: string) =>
  new NextRequest(`${APP}/api/showings/book`, { method: "POST", body: raw ?? JSON.stringify(body), headers: { "content-type": "application/json" } });
const cronReq = (path: string, token: string | null = SECRET) =>
  new NextRequest(`${APP}${path}`, { method: "GET", headers: token ? { authorization: `Bearer ${token}` } : {} });

const goodBody = (over: Record<string, unknown> = {}) => ({
  listingId: LISTING, showingDate: "2999-01-01", showingTime: "10:00 AM",
  name: "Dana Buyer", email: "Dana@Example.test", phone: "555-123-4567", message: "See you then",
  preApproved: "yes", timeline: "asap", hasAgent: "no", source: "direct", honeypot: "", ...over,
});
// showingDate must be inside the accepted window: build one a few days ahead
const soon = () => new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);

const tag = (web: ReturnType<typeof installFakeWeb>) => web.calls.map(web.label);

// ===================================================================== booking route

test("book: unparseable body and every invalid request get a 400 and make zero requests of any kind", async () => {
  await withWeb({}, async (web) => {
    const bad: Array<[string, Response | Promise<Response>]> = [];
    bad.push(["not json", bookPOST(bookReq(null, "{nope"))]);
    for (const over of [
      { listingId: "x" }, { showingDate: "2020-01-01" }, { showingTime: "10:07 AM" },
      { showingTime: '10:00 AM"><img src=x onerror=1>' }, { email: "a@b.co\r\nBcc: v@x.co" },
      { name: "<script>1</script>" }, { message: "x".repeat(2000) },
    ]) bad.push([JSON.stringify(over), bookPOST(bookReq(goodBody({ showingDate: soon(), ...over })))]);
    for (const [name, p] of bad) assert.equal((await p).status, 400, name);
    assert.deepEqual(web.calls, [], "no request may precede validation");
  });
});

test("book: limiter says no -> 429 + Retry-After, and the only requests are reads plus the limiter call (no lead, showing or email)", async () => {
  await withWeb({ rpc: () => new Response("false", { status: 200, headers: { "content-type": "application/json" } }) }, async (web) => {
    const res = await bookPOST(bookReq(goodBody({ showingDate: soon() })));
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("retry-after"), "600");
    assert.deepEqual(web.dbWrites(), [], "no database write");
    assert.deepEqual(web.calls.filter((c) => c.host === "api.resend.com"), [], "no email");
    assert.ok(tag(web).includes("POST 127.0.0.1:1/rest/v1/rpc/reserve_booking_attempt"));
  });
});

test("book: limiter missing or failing -> 503, fail closed, nothing written or sent", async () => {
  for (const rpc of [
    () => new Response(JSON.stringify({ code: "PGRST202", message: "function not found" }), { status: 404, headers: { "content-type": "application/json" } }),
    () => new Response(JSON.stringify({ code: "XX000", message: "boom" }), { status: 500, headers: { "content-type": "application/json" } }),
  ]) {
    const origError = console.error; console.error = () => {};
    try {
      await withWeb({ rpc }, async (web) => {
        const res = await bookPOST(bookReq(goodBody({ showingDate: soon() })));
        assert.equal(res.status, 503);
        assert.deepEqual(web.dbWrites(), []);
        assert.deepEqual(web.calls.filter((c) => c.host === "api.resend.com"), []);
      });
    } finally { console.error = origError; }
  }
});

test("book: the limiter call carries the exact constants and only validated values, whatever the request body says", async () => {
  await withWeb({}, async (web) => {
    const hostile = goodBody({
      showingDate: soon(),
      // attempts to influence the limiter or the lead/agent: none of these may reach any request
      p_per_listing: 999999, p_per_email_listing: 999999, p_window_minutes: 1, windowMinutes: 1,
      perListing: 999999, perEmailPerListing: 999999, limits: { perListing: 999999 },
      leadId: "11111111-1111-4111-8111-111111111111", agentId: "attacker-agent-id",
    });
    const res = await bookPOST(bookReq(hostile));
    assert.equal(res.status, 200);
    const rpc = web.calls.filter((c) => c.path === "/rest/v1/rpc/reserve_booking_attempt");
    assert.equal(rpc.length, 1);
    assert.deepEqual(rpc[0].body, {
      p_listing_id: LISTING,
      p_email: "dana@example.test",
      p_window_minutes: 10,
      p_per_email_listing: 3,
      p_per_email_all: 5,
      p_per_listing: 15,
    });
    assert.equal(rpc[0].headers.get("authorization"), "Bearer dummy-service-key");
    const everything = web.calls.map((c) => c.raw).join("\n");
    assert.ok(!everything.includes("999999"), "a submitted threshold reached a request");
    assert.ok(!everything.includes("11111111-1111-4111-8111-111111111111"), "client leadId reached a request");
    assert.ok(!everything.includes("attacker-agent-id"), "client agentId reached a request");
  });
});

test("book: success order - reads, then the limiter call as the first write, then lead and showing, then exactly two emails", async () => {
  await withWeb({}, async (web) => {
    const res = await bookPOST(bookReq(goodBody({ showingDate: soon() })));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, showingId: "showings-new-1" });
    await new Promise((r) => setTimeout(r, 20)); // let the fire-and-forget follow-up call land
    const t = tag(web);
    const firstWrite = web.calls.findIndex((c) => c.method !== "GET" && c.method !== "HEAD");
    assert.equal(t[firstWrite], "POST 127.0.0.1:1/rest/v1/rpc/reserve_booking_attempt", "limiter is the first write");
    assert.ok(t.indexOf("POST 127.0.0.1:1/rest/v1/leads") > firstWrite);
    assert.ok(t.indexOf("POST 127.0.0.1:1/rest/v1/showings") > t.indexOf("POST 127.0.0.1:1/rest/v1/leads"));
    assert.equal(t.filter((x) => x === "POST api.resend.com/emails").length, 2);
    const follow = web.calls.filter((c) => c.host === "app.test" && c.path === "/api/follow-ups/schedule");
    assert.equal(follow.length, 1);
    assert.equal(follow[0].headers.get("x-internal-secret"), SECRET);
    assert.deepEqual((follow[0].body as { sequenceType: string }).sequenceType, "showing");
    // the buyer email goes to the lower-cased validated address and is still the unverified "confirmed" email
    const buyer = web.calls.filter((c) => c.host === "api.resend.com")[0].body as { to: string; html: string };
    assert.equal(buyer.to, "dana@example.test");
    assert.match(buyer.html, /Your Showing is Confirmed!/);
  });
});

// ===================================================================== authentication on cron routes

const CRON_ROUTES: Array<[string, (r: NextRequest) => Promise<Response>]> = [
  ["/api/follow-ups/process", processGET],
  ["/api/feedback/request", feedbackGET],
  ["/api/testimonials/request", testimonialsGET],
];

test("cron routes: no header, wrong token, or no configured secret -> 401 with zero requests", async () => {
  for (const [path, handler] of CRON_ROUTES) {
    await withWeb({}, async (web) => {
      assert.equal((await handler(cronReq(path, null))).status, 401, `${path} no header`);
      assert.equal((await handler(cronReq(path, "wrong"))).status, 401, `${path} wrong token`);
      setEnv("CRON_SECRET", undefined);
      assert.equal((await handler(cronReq(path, SECRET))).status, 401, `${path} secret unset`);
      assert.equal((await handler(cronReq(path, ""))).status, 401, `${path} empty token, secret unset`);
      assert.deepEqual(web.calls, []);
    });
  }
});

// ===================================================================== feedback / testimonial requests (gate)

test("feedback and testimonial requests: gate off -> 200 'paused' and zero requests (no database, no email)", async () => {
  for (const [path, handler] of CRON_ROUTES.slice(1)) {
    await withWeb({}, async (web) => {
      const res = await handler(cronReq(path));
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.paused, true, path);
      assert.equal(body.sent, 0, path);
      assert.deepEqual(web.calls, [], `${path} touched something while paused`);
    });
  }
});

test("feedback and testimonial requests: gate on -> the handler proceeds past the gate (and still sends nothing here: no data)", async () => {
  for (const [path, handler] of CRON_ROUTES.slice(1)) {
    await withWeb({}, async (web) => {
      setEnv("NURTURE_SENDS_ENABLED", "1");
      const res = await handler(cronReq(path));
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.notEqual(body.paused, true, path);
      assert.ok(web.calls.some((c) => c.host === "127.0.0.1:1"), `${path} should query the (fake) database once enabled`);
      assert.deepEqual(web.calls.filter((c) => c.host === "api.resend.com"), []);
    });
  }
});

// ===================================================================== daily follow-up job

const dueRow = () => ({
  id: "f1", lead_id: "l1", agent_id: AGENT, listing_id: LISTING, day_number: 1, sequence_type: "inquiry",
  subject: "Still interested?", status: "pending", scheduled_at: "2020-01-01T00:00:00Z",
});
const leadRow = () => ({ id: "l1", name: "Dana Buyer", email: "dana@example.test", phone: "", message: "Hi there", status: "new" });
const withDue = (): Fixtures => ({ ...baseFixtures(), follow_ups: [dueRow()], leads: [leadRow()] });

const roiExpected = () => new Date().getUTCDate() === 1;
const CHAINED = ["/api/showings/reminders", "/api/feedback/request", "/api/testimonials/request", "/api/trial/lifecycle"];
const appPaths = (web: ReturnType<typeof installFakeWeb>) => web.calls.filter((c) => c.host === "app.test").map((c) => c.path).sort();

test("daily job: missing provider keys -> 500 and zero requests", async () => {
  await withWeb({}, async (web) => {
    setEnv("ANTHROPIC_API_KEY", undefined);
    assert.equal((await processGET(cronReq("/api/follow-ups/process"))).status, 500);
    setEnv("ANTHROPIC_API_KEY", "dummy");
    setEnv("RESEND_API_KEY", undefined);
    assert.equal((await processGET(cronReq("/api/follow-ups/process"))).status, 500);
    assert.deepEqual(web.calls, []);
  });
});

test("daily job, nothing due: identical quiet-day result with the gate off and on; only the read, no chained job", async () => {
  for (const gate of [undefined, "1"]) {
    await withWeb({}, async (web) => {
      setEnv("NURTURE_SENDS_ENABLED", gate);
      const res = await processGET(cronReq("/api/follow-ups/process"));
      assert.deepEqual(await res.json(), { ok: true, processed: 0 }, `gate=${gate}`);
      const db = web.calls.filter((c) => c.host === "127.0.0.1:1");
      assert.deepEqual(db.map(web.label), ["GET 127.0.0.1:1/rest/v1/follow_ups"]);
      const expectApp = roiExpected() ? ["/api/cron/monthly-roi"] : [];
      assert.deepEqual(appPaths(web), expectApp, `gate=${gate}`);
      assert.deepEqual(web.writes().filter((c) => c.host !== "app.test"), []);
    });
  }
});

test("daily job, rows due, gate OFF: nothing is read or written for the rows, no AI, no email; the chained jobs run exactly as before", async () => {
  await withWeb({ fixtures: withDue() }, async (web) => {
    const res = await processGET(cronReq("/api/follow-ups/process"));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.processed, 0);
    assert.equal(body.held, 1);
    assert.equal(body.nurtureEnabled, false);
    // the due-rows read is the ONLY database access
    assert.deepEqual(web.calls.filter((c) => c.host === "127.0.0.1:1").map(web.label), ["GET 127.0.0.1:1/rest/v1/follow_ups"]);
    assert.deepEqual(web.calls.filter((c) => c.host === "api.anthropic.com" || c.host === "api.resend.com"), []);
    assert.deepEqual(web.dbWrites(), []);
    const expected = [...CHAINED, ...(roiExpected() ? ["/api/cron/monthly-roi"] : [])].sort();
    assert.deepEqual(appPaths(web), expected, "chained job set");
    for (const c of web.calls.filter((c) => c.host === "app.test")) assert.equal(c.headers.get("authorization"), `Bearer ${SECRET}`);
  });
});

test("daily job, rows due, gate ON: the row is processed and marked sent, and the chained job set is identical to gate OFF", async () => {
  await withWeb({ fixtures: withDue() }, async (web) => {
    setEnv("NURTURE_SENDS_ENABLED", "1");
    const res = await processGET(cronReq("/api/follow-ups/process"));
    const body = await res.json();
    assert.equal(body.processed, 1);
    assert.equal("held" in body, false);
    assert.equal(web.calls.filter((c) => c.host === "api.anthropic.com").length, 1);
    const emails = web.calls.filter((c) => c.host === "api.resend.com");
    assert.equal(emails.length, 1);
    assert.equal((emails[0].body as { to: string }).to, "dana@example.test");
    const patches = web.calls.filter((c) => c.method === "PATCH" && c.table === "follow_ups");
    assert.equal(patches.length, 1);
    assert.equal((patches[0].body as { status: string }).status, "sent");
    const expected = [...CHAINED, ...(roiExpected() ? ["/api/cron/monthly-roi"] : [])].sort();
    assert.deepEqual(appPaths(web), expected, "same chained job set as gate off");
  });
});

test("daily job: DISABLE_TRIAL_LIFECYCLE still removes only the trial job, gate off or on", async () => {
  for (const gate of [undefined, "1"]) {
    await withWeb({ fixtures: withDue() }, async (web) => {
      setEnv("DISABLE_TRIAL_LIFECYCLE", "1");
      setEnv("NURTURE_SENDS_ENABLED", gate);
      await processGET(cronReq("/api/follow-ups/process"));
      assert.ok(!appPaths(web).includes("/api/trial/lifecycle"));
      assert.equal(CHAINED.filter((p) => appPaths(web).includes(p)).length, 3);
    });
  }
});

test("no test in this file reached the real network", () => {
  assertNoNetworkAttempts();
});
