import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import {
  REVIEW_TAG,
  evaluateAuthentication,
  leadIdFromRecipients,
  processInboundEmail,
  replyToFor,
  withReviewTag,
  type InboundDeps,
  type InboundLead,
  type ReceivedEmail,
  type ReceivedEventData,
  type ReviewReason,
} from "../inboundEmail";

// Everything here runs against fakes: no Resend, no database, no network.

const LEAD_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const OTHER_LEAD_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const DOMAIN = "reply.example.test";
const ENV = { INBOUND_REPLY_DOMAIN: DOMAIN };
const LEAD: InboundLead = { id: LEAD_ID, agent_id: "agent-of-lead", email: "Buyer@Example.com", status: "new" };
const HEADERS = { "svix-id": "msg_1", "svix-timestamp": "1700000000", "svix-signature": "v1,abc" };
const PASSING = { spf: "pass", dkim: "pass", dmarc: "pass" };
const headersOf = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

function eventData(over: Partial<ReceivedEventData> = {}): ReceivedEventData {
  return { email_id: "em_1", from: "buyer@example.com", to: [`reply+${LEAD_ID}@${DOMAIN}`], received_for: [`reply+${LEAD_ID}@${DOMAIN}`], message_id: "<m1@mail>", subject: "Re: 12 Oak St", ...over };
}

function makeDeps(opts: {
  configured?: boolean;
  verifyThrows?: boolean;
  event?: { type?: string; data?: ReceivedEventData };
  lead?: InboundLead | null;
  exists?: boolean;
  received?: ReceivedEmail | null | "throw";
  insertOk?: boolean;
  reviewThrows?: boolean;
} = {}) {
  const calls = { verify: [] as unknown[], fetch: [] as string[], getLead: [] as string[], insert: [] as unknown[], unread: [] as InboundLead[], review: [] as ReviewReason[], logs: [] as string[], logDetails: [] as unknown[] };
  const deps: InboundDeps = {
    env: ENV,
    webhookSecretConfigured: () => opts.configured !== false,
    verify: (input) => {
      calls.verify.push(input);
      if (opts.verifyThrows) throw new Error("bad signature");
      return opts.event ?? { type: "email.received", data: eventData() };
    },
    fetchReceived: async (id) => {
      calls.fetch.push(id);
      if (opts.received === "throw") throw new Error("api down");
      return opts.received === undefined ? { text: "Is it still available?", html: "<p>x</p>", subject: "Re: 12 Oak St", authentication: PASSING } : opts.received;
    },
    getLead: async (id) => { calls.getLead.push(id); return opts.lead === undefined ? LEAD : opts.lead; },
    messageExists: async () => opts.exists === true,
    insertMessage: async (row) => { calls.insert.push(row); return opts.insertOk !== false; },
    markLeadUnread: async (l) => { calls.unread.push(l); },
    markNeedsReview: async (_l, reason) => { if (opts.reviewThrows) throw new Error("db down"); calls.review.push(reason); },
    log: (m, d) => { calls.logs.push(m); calls.logDetails.push(d); },
  };
  return { deps, calls };
}

test("replyToFor: the agent's address unless routing is fully and explicitly configured; no partial setup changes it", () => {
  const ON = { ...ENV, INBOUND_REPLY_ROUTING: "1", RESEND_WEBHOOK_SECRET: "set", RESEND_API_KEY: "set" };
  assert.equal(replyToFor("agent@x.com", LEAD_ID, {}), "agent@x.com");
  // the domain alone (what the receiving test needs) must not change outbound routing
  assert.equal(replyToFor("agent@x.com", LEAD_ID, ENV), "agent@x.com");
  assert.equal(replyToFor("agent@x.com", LEAD_ID, { ...ENV, RESEND_WEBHOOK_SECRET: "set", RESEND_API_KEY: "set" }), "agent@x.com");
  // every other piece present but the explicit switch missing, wrong, or one prerequisite missing
  for (const off of [{ INBOUND_REPLY_ROUTING: undefined }, { INBOUND_REPLY_ROUTING: "true" }, { INBOUND_REPLY_ROUTING: "0" }, { RESEND_WEBHOOK_SECRET: "" }, { RESEND_API_KEY: undefined }, { INBOUND_REPLY_DOMAIN: "" }, { INBOUND_REPLY_DOMAIN: "not a domain" }]) {
    assert.equal(replyToFor("agent@x.com", LEAD_ID, { ...ON, ...off }), "agent@x.com", JSON.stringify(off));
  }
  assert.equal(replyToFor("agent@x.com", "not-a-uuid", ON), "agent@x.com");
  assert.equal(replyToFor("agent@x.com", LEAD_ID.toUpperCase(), ON), `reply+${LEAD_ID}@${DOMAIN}`);
});

test("leadIdFromRecipients: only the configured domain, in any recipient field, with or without a display name", () => {
  assert.equal(leadIdFromRecipients([`reply+${LEAD_ID}@${DOMAIN}`], ENV), LEAD_ID);
  assert.equal(leadIdFromRecipients([`"ListingFlare" <reply+${LEAD_ID}@${DOMAIN}>`], ENV), LEAD_ID);
  assert.equal(leadIdFromRecipients(["x@y.com", `REPLY+${LEAD_ID.toUpperCase()}@${DOMAIN.toUpperCase()}`], ENV), LEAD_ID);
  assert.equal(leadIdFromRecipients([`reply+${LEAD_ID}@evil.test`], ENV), null);
  assert.equal(leadIdFromRecipients([`reply+${LEAD_ID}@${DOMAIN}.evil.test`], ENV), null);
  assert.equal(leadIdFromRecipients([`xreply+${LEAD_ID}@${DOMAIN}`], ENV), null);
  assert.equal(leadIdFromRecipients([`reply+${LEAD_ID}@${DOMAIN}`], {}), null);
  assert.equal(leadIdFromRecipients(["reply+not-a-uuid@" + DOMAIN, null, undefined], ENV), null);
});

test("fails closed: no secret configured, missing headers or a bad signature store nothing and fetch nothing", async () => {
  for (const [label, o, headers, status] of [
    ["not configured", { configured: false }, HEADERS, 500],
    ["missing headers", {}, { "svix-id": "msg_1" }, 400],
    ["bad signature", { verifyThrows: true }, HEADERS, 400],
  ] as const) {
    const { deps, calls } = makeDeps(o);
    const out = await processInboundEmail("{}", headersOf(headers), deps);
    assert.equal(out.status, status, label);
    assert.equal(calls.fetch.length + calls.getLead.length + calls.insert.length, 0, label);
  }
});

test("the verifier receives the raw body untouched, and the three signature headers", async () => {
  const raw = '{ "type":"email.received",  "data":{"a":1} }\n'; // odd spacing: re-serialising would change it
  const { deps, calls } = makeDeps();
  await processInboundEmail(raw, headersOf(HEADERS), deps);
  assert.deepEqual(calls.verify[0], { payload: raw, headers: { id: "msg_1", timestamp: "1700000000", signature: "v1,abc" } });
});

test("other event types are acknowledged and ignored", async () => {
  const { deps, calls } = makeDeps({ event: { type: "email.delivered", data: eventData() } });
  const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
  assert.deepEqual([out.status, out.body.ignored], [200, true]);
  assert.equal(calls.getLead.length + calls.insert.length, 0);
});

test("mail not addressed to a lead reply address, or for an unknown lead, is accepted and dropped", async () => {
  let r = makeDeps({ event: { type: "email.received", data: eventData({ to: ["leads@listingflare.com"], received_for: [] }) } });
  let out = await processInboundEmail("{}", headersOf(HEADERS), r.deps);
  assert.deepEqual([out.status, out.body.matched], [200, false]);
  assert.equal(r.calls.getLead.length + r.calls.fetch.length + r.calls.insert.length, 0);
  r = makeDeps({ lead: null });
  out = await processInboundEmail("{}", headersOf(HEADERS), r.deps);
  assert.deepEqual([out.status, out.body.matched], [200, false]);
  assert.equal(r.calls.fetch.length + r.calls.insert.length, 0);
});

test("wrong-lead sender: a sender who is not the lead's own address is never added to the thread; the lead is held for review", async () => {
  for (const from of ["stranger@example.com", "", "buyer@example.com.evil.test", "other-lead-buyer@example.com"]) {
    const { deps, calls } = makeDeps({ event: { type: "email.received", data: eventData({ from }) } });
    const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
    assert.deepEqual([out.status, out.body.matched, out.body.stored, out.body.held_for_review], [200, true, false, true], from);
    assert.deepEqual(calls.review, ["sender_differs"], from);
    assert.equal(calls.fetch.length + calls.insert.length + calls.unread.length, 0, from); // nothing fetched, stored or shown
  }
});

test("a lead with no email address on record cannot be matched by anyone; the reply is held for review", async () => {
  const { deps, calls } = makeDeps({ lead: { ...LEAD, email: "" } });
  const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
  assert.equal(out.body.held_for_review, true);
  assert.equal(calls.insert.length, 0);
});

test("when the review marker cannot be recorded the answer is a 500 so the provider may retry; nothing is stored in the thread", async () => {
  const { deps, calls } = makeDeps({ event: { type: "email.received", data: eventData({ from: "stranger@example.com" }) }, reviewThrows: true });
  const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
  assert.equal(out.status, 500);
  assert.equal(calls.insert.length, 0);
});

test("isolation: the agent comes from the lead record, never from anything in the request", async () => {
  const { deps, calls } = makeDeps({ event: { type: "email.received", data: { ...eventData(), agent_id: "attacker", lead_id: OTHER_LEAD_ID } as ReceivedEventData } });
  await processInboundEmail("{}", headersOf(HEADERS), deps);
  assert.deepEqual(calls.getLead, [LEAD_ID]);
  assert.equal((calls.insert[0] as { agent_id: string }).agent_id, "agent-of-lead");
  assert.equal((calls.insert[0] as { lead_id: string }).lead_id, LEAD_ID);
});

test("a display-name sender and different letter case still match the lead", async () => {
  const { deps, calls } = makeDeps({ event: { type: "email.received", data: eventData({ from: "Buyer Person <BUYER@example.COM>" }) } });
  const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
  assert.deepEqual([out.status, out.body.matched], [200, true]);
  assert.equal(calls.insert.length, 1);
});

test("happy path: body fetched by email id, stored once as inbound for the lead, lead marked unread", async () => {
  const { deps, calls } = makeDeps();
  const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
  assert.deepEqual([out.status, out.body.matched], [200, true]);
  assert.deepEqual(calls.fetch, ["em_1"]);
  assert.deepEqual(calls.insert, [{ lead_id: LEAD_ID, agent_id: "agent-of-lead", subject: "Re: 12 Oak St", body: "Is it still available?", provider_message_id: "<m1@mail>" }]);
  assert.deepEqual(calls.unread, [LEAD]);
});

// The acceptance policy: DKIM must be "pass" and DMARC "pass" or "gray". SPF never decides on its own.
const VERDICT_MATRIX: Array<[string, ReceivedEmail["authentication"], boolean]> = [
  ["passed (dkim pass, dmarc pass)", { spf: "pass", dkim: "pass", dmarc: "pass" }, true],
  ["gray dmarc with dkim pass (domain has no policy or p=none)", { spf: "pass", dkim: "pass", dmarc: "gray" }, true],
  ["dkim pass, spf fail, dmarc pass", { spf: "fail", dkim: "pass", dmarc: "pass" }, true],
  ["missing authentication (null)", null, false],
  ["missing authentication (undefined)", undefined, false],
  ["empty verdicts", {}, false],
  ["dkim failed", { spf: "pass", dkim: "fail", dmarc: "pass" }, false],
  ["dkim gray (unsigned or signer differs from From)", { spf: "pass", dkim: "gray", dmarc: "gray" }, false],
  ["dkim unknown", { spf: "pass", dkim: "unknown", dmarc: "pass" }, false],
  ["dkim processing_failed", { spf: "pass", dkim: "processing_failed", dmarc: "pass" }, false],
  ["spf pass alone, dkim missing", { spf: "pass", dmarc: "pass" }, false],
  ["dkim pass but dmarc failed", { spf: "pass", dkim: "pass", dmarc: "fail" }, false],
  ["dkim pass but dmarc unknown", { spf: "pass", dkim: "pass", dmarc: "unknown" }, false],
  ["dkim pass but dmarc processing_failed", { spf: "pass", dkim: "pass", dmarc: "processing_failed" }, false],
  ["dkim pass but dmarc missing", { spf: "pass", dkim: "pass" }, false],
  ["non-string verdicts are not verdicts", { spf: "pass", dkim: { result: "pass" }, dmarc: ["pass"] } as unknown as ReceivedEmail["authentication"], false],
  ["case matters: PASS is not the documented value", { spf: "pass", dkim: "PASS", dmarc: "pass" }, false],
];

test("authentication policy: the verdict matrix decides acceptance, and only the lead's own thread is ever written", async () => {
  for (const [label, authentication, accepted] of VERDICT_MATRIX) {
    assert.equal(evaluateAuthentication(authentication).accepted, accepted, "evaluate: " + label);
    const { deps, calls } = makeDeps({ received: { text: "Is it still available?", subject: "Re: 12 Oak St", authentication } });
    const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
    assert.equal(out.status, 200, label);
    if (accepted) {
      assert.deepEqual([calls.insert.length, calls.review.length, out.body.held_for_review], [1, 0, undefined], label);
    } else {
      assert.deepEqual([calls.insert.length, calls.unread.length, out.body.held_for_review, out.body.stored], [0, 0, true, false], label);
      assert.deepEqual(calls.review, ["authentication_not_verified"], label);
    }
  }
});

test("the policy cannot be switched off: routing flags and environment have no effect on enforcement", async () => {
  for (const env of [{}, { INBOUND_REPLY_ROUTING: "1" }, { INBOUND_REPLY_ROUTING: "0" }, { INBOUND_AUTH: "off", INBOUND_AUTH_ENFORCED: "0", ENFORCE_INBOUND_AUTH: "false" }]) {
    const { deps, calls } = makeDeps({ received: { text: "hello", authentication: { spf: "fail", dkim: "fail", dmarc: "fail" } } });
    deps.env = { ...ENV, ...env };
    const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
    assert.equal(out.body.held_for_review, true, JSON.stringify(env));
    assert.equal(calls.insert.length, 0, JSON.stringify(env));
  }
  const lib = fs.readFileSync(path.join(process.env.LF_SRC_DIR as string, "lib/inboundEmail.ts"), "utf8");
  const evalFn = lib.slice(lib.indexOf("export function evaluateAuthentication"), lib.indexOf("export function withReviewTag"));
  assert.ok(!/process\.env|env\./.test(evalFn)); // the decision reads no environment at all
});

test("replays: a replayed accepted message is stored once; a replayed rejected message writes nothing and re-applies the same idempotent marker", async () => {
  let r = makeDeps({ exists: true });
  assert.equal((await processInboundEmail("{}", headersOf(HEADERS), r.deps)).body.duplicate, true);
  assert.equal(r.calls.insert.length + r.calls.review.length + r.calls.fetch.length, 0);
  r = makeDeps({ received: { text: "x", authentication: { spf: "pass", dkim: "fail", dmarc: "fail" } } });
  for (let i = 0; i < 3; i++) {
    const out = await processInboundEmail("{}", headersOf(HEADERS), r.deps);
    assert.equal(out.body.held_for_review, true);
  }
  assert.equal(r.calls.insert.length, 0);
});

test("the review marker is a fixed tag, added once, ahead of the agent's own tags, and never twice", () => {
  assert.deepEqual(withReviewTag(undefined), [REVIEW_TAG]);
  assert.deepEqual(withReviewTag(null), [REVIEW_TAG]);
  assert.deepEqual(withReviewTag(["vip", "cold"]), [REVIEW_TAG, "vip", "cold"]);
  assert.equal(withReviewTag([REVIEW_TAG, "vip"]), null); // already marked: nothing to write
  assert.equal(REVIEW_TAG, "reply_needs_review");
});

test("logs carry identifiers and short verdict strings only: no message body, subject or email addresses", async () => {
  const SECRET_BODY = "my SSN is 123-45-6789 and I live at 99 Private Lane";
  const SECRET_SUBJECT = "Re: private subject line";
  const cases = [
    makeDeps({ received: { text: SECRET_BODY, subject: SECRET_SUBJECT, authentication: PASSING } }),
    makeDeps({ received: { text: SECRET_BODY, subject: SECRET_SUBJECT, authentication: { spf: "fail", dkim: "fail", dmarc: "fail" } } }),
    makeDeps({ event: { type: "email.received", data: eventData({ from: "stranger@example.com", subject: SECRET_SUBJECT }) } }),
    makeDeps({ event: { type: "email.received", data: eventData({ to: ["leads@listingflare.com"], received_for: [], subject: SECRET_SUBJECT }) } }),
  ];
  for (const c of cases) {
    await processInboundEmail("{}", headersOf(HEADERS), c.deps);
    const logged = JSON.stringify([c.calls.logs, c.calls.logDetails]);
    for (const leak of [SECRET_BODY, "123-45-6789", SECRET_SUBJECT, "buyer@example.com", "stranger@example.com", "Buyer@Example.com"]) {
      assert.ok(!logged.includes(leak), "log leaked: " + leak);
    }
  }
});

test("retries: an already-stored message is acknowledged without a second insert or fetch", async () => {
  const { deps, calls } = makeDeps({ exists: true });
  const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
  assert.deepEqual([out.status, out.body.duplicate], [200, true]);
  assert.equal(calls.fetch.length + calls.insert.length + calls.unread.length, 0);
});

test("a failed body fetch or failed save is a 500 so Resend retries; nothing is half-stored", async () => {
  let r = makeDeps({ received: "throw" });
  assert.equal((await processInboundEmail("{}", headersOf(HEADERS), r.deps)).status, 500);
  assert.equal(r.calls.insert.length + r.calls.unread.length, 0);
  r = makeDeps({ received: null });
  assert.equal((await processInboundEmail("{}", headersOf(HEADERS), r.deps)).status, 500);
  r = makeDeps({ insertOk: false });
  assert.equal((await processInboundEmail("{}", headersOf(HEADERS), r.deps)).status, 500);
  assert.equal(r.calls.unread.length, 0);
});

test("html is used when there is no text part; an empty message is acknowledged but not stored", async () => {
  let r = makeDeps({ received: { text: "", html: "<p>Hello</p>", authentication: PASSING } });
  await processInboundEmail("{}", headersOf(HEADERS), r.deps);
  assert.equal((r.calls.insert[0] as { body: string }).body, "<p>Hello</p>");
  r = makeDeps({ received: { text: "  ", html: null, authentication: PASSING } });
  const out = await processInboundEmail("{}", headersOf(HEADERS), r.deps);
  assert.deepEqual([out.status, out.body.empty], [200, true]);
  assert.equal(r.calls.insert.length, 0);
});

// Interop with the REAL installed Resend verifier: sign a payload the way Svix does (HMAC-SHA256 over
// "<id>.<timestamp>.<raw body>" with the base64 key after "whsec_") and check the SDK accepts the
// documented svix-* header values, and rejects a changed body, a changed id and an old timestamp.
test("the real Resend verifier accepts a correctly signed raw body and rejects tampering", () => {
  const resend = new Resend("re_test_unused");
  const key = crypto.randomBytes(24);
  const webhookSecret = "whsec_" + key.toString("base64");
  const payload = JSON.stringify({ type: "email.received", data: eventData() });
  const id = "msg_2abc";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sign = (i: string, t: string, p: string) => "v1," + crypto.createHmac("sha256", key).update(`${i}.${t}.${p}`).digest("base64");
  const good = { id, timestamp, signature: sign(id, timestamp, payload) };

  const event = resend.webhooks.verify({ payload, headers: good, webhookSecret }) as unknown as { type: string };
  assert.equal(event.type, "email.received");
  assert.throws(() => resend.webhooks.verify({ payload: payload + " ", headers: good, webhookSecret }));
  assert.throws(() => resend.webhooks.verify({ payload, headers: { ...good, id: "msg_other" }, webhookSecret }));
  assert.throws(() => resend.webhooks.verify({ payload, headers: { ...good, signature: "v1,AAAA" }, webhookSecret }));
  const old = String(Math.floor(Date.now() / 1000) - 3600);
  assert.throws(() => resend.webhooks.verify({ payload, headers: { id, timestamp: old, signature: sign(id, old, payload) }, webhookSecret }));
  assert.throws(() => resend.webhooks.verify({ payload, headers: good, webhookSecret: "whsec_" + crypto.randomBytes(24).toString("base64") }));
});

test("the route reads the raw body as text, has no static-secret path, and the outbound routes use replyToFor", () => {
  const dir = path.join(process.env.LF_SRC_DIR as string, "app/api");
  const route = fs.readFileSync(path.join(dir, "messages/inbound/route.ts"), "utf8");
  assert.ok(route.includes("await req.text()"));
  assert.ok(!route.includes("req.json("));
  assert.ok(!route.includes("x-webhook-secret"));
  assert.ok(!route.includes("secretsMatch"));
  assert.ok(!route.includes("CRON_SECRET"));
  for (const f of ["messages/send/route.ts", "leads/auto-reply/route.ts", "follow-ups/process/route.ts"]) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    assert.ok(src.includes("replyToFor("), f);
    assert.ok(!/replyTo: agent\.email/.test(src), f);
  }
});

assertNoNetworkAttempts();
