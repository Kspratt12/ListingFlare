import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import {
  leadIdFromRecipients,
  processInboundEmail,
  replyToFor,
  type InboundDeps,
  type InboundLead,
  type ReceivedEmail,
  type ReceivedEventData,
} from "../inboundEmail";

// Everything here runs against fakes: no Resend, no database, no network.

const LEAD_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const OTHER_LEAD_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const DOMAIN = "reply.example.test";
const ENV = { INBOUND_REPLY_DOMAIN: DOMAIN };
const LEAD: InboundLead = { id: LEAD_ID, agent_id: "agent-of-lead", email: "Buyer@Example.com", status: "new" };
const HEADERS = { "svix-id": "msg_1", "svix-timestamp": "1700000000", "svix-signature": "v1,abc" };
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
} = {}) {
  const calls = { verify: [] as unknown[], fetch: [] as string[], getLead: [] as string[], insert: [] as unknown[], unread: [] as InboundLead[], logs: [] as string[] };
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
      return opts.received === undefined ? { text: "Is it still available?", html: "<p>x</p>", subject: "Re: 12 Oak St" } : opts.received;
    },
    getLead: async (id) => { calls.getLead.push(id); return opts.lead === undefined ? LEAD : opts.lead; },
    messageExists: async () => opts.exists === true,
    insertMessage: async (row) => { calls.insert.push(row); return opts.insertOk !== false; },
    markLeadUnread: async (l) => { calls.unread.push(l); },
    log: (m) => calls.logs.push(m),
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

test("isolation: a sender who is not the lead's own address cannot add to the lead's thread", async () => {
  const { deps, calls } = makeDeps({ event: { type: "email.received", data: eventData({ from: "stranger@example.com" }) } });
  const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
  assert.deepEqual([out.status, out.body.matched], [200, false]);
  assert.equal(calls.fetch.length + calls.insert.length + calls.unread.length, 0);
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

test("authentication verdicts are recorded for the controlled check but do not gate storage (sender match alone is not proof of authenticity)", async () => {
  const verdicts = { spf: "fail", dkim: "gray", dmarc: "fail" };
  const { deps, calls } = makeDeps({ received: { text: "hello", authentication: verdicts } });
  const logged: unknown[] = [];
  const base = deps.log;
  deps.log = (m, d) => { logged.push([m, d]); base(m, d); };
  const out = await processInboundEmail("{}", headersOf(HEADERS), deps);
  assert.deepEqual([out.status, out.body.matched], [200, true]);
  assert.equal(calls.insert.length, 1); // current behaviour: recorded, not enforced
  assert.deepEqual(logged, [["Inbound email authentication verdicts (provider-computed)", { emailId: "em_1", authentication: verdicts }]]);
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
  let r = makeDeps({ received: { text: "", html: "<p>Hello</p>" } });
  await processInboundEmail("{}", headersOf(HEADERS), r.deps);
  assert.equal((r.calls.insert[0] as { body: string }).body, "<p>Hello</p>");
  r = makeDeps({ received: { text: "  ", html: null } });
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
