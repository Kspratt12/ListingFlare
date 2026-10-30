import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BILLING_UNAVAILABLE_MESSAGE,
  PERSIST_ATTEMPTS,
  processCheckoutRequest,
  type CheckoutDeps,
  type CheckoutProfile,
  type CheckoutUser,
  type SaveCustomerResult,
} from "../stripeCheckout";

// Everything here runs against fakes: no Stripe, no database, no network.
// "Session creation" below means the fake Stripe Checkout Session call.

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "agent@example.com" };
const PROFILE_NEW: CheckoutProfile = { stripe_customer_id: null, email: "agent@example.com", name: "Alex Agent" };
const NEW_CUSTOMER_ID = "cus_new_123";

type SaveStep = SaveCustomerResult | Error;

function makeDeps(opts: {
  user?: CheckoutUser | null;
  profile?: CheckoutProfile | null;
  saves?: SaveStep[]; // consumed in order; the last entry repeats
  pricing?: boolean;
  customerThrows?: boolean;
  sessionThrows?: boolean;
} = {}) {
  const events: string[] = [];
  const saved: Array<[string, string]> = [];
  const sessions: Array<{ customerId: string; userId: string }> = [];
  const logs: Array<{ message: string; detail: unknown }> = [];
  const state = { customersCreated: 0 };
  let saveCall = 0;
  const saves = opts.saves ?? [{ rows: [{ id: USER.id }], error: null }];

  const deps: CheckoutDeps = {
    getUser: async () => (opts.user === undefined ? USER : opts.user),
    getProfile: async () => (opts.profile === undefined ? PROFILE_NEW : opts.profile),
    createCustomer: async () => {
      events.push("createCustomer");
      state.customersCreated++;
      if (opts.customerThrows) throw new Error("stripe is down");
      return { id: NEW_CUSTOMER_ID };
    },
    saveCustomerId: async (userId, customerId) => {
      events.push("saveCustomerId");
      saved.push([userId, customerId]);
      const step = saves[Math.min(saveCall++, saves.length - 1)];
      if (step instanceof Error) throw step;
      return step;
    },
    isPricingConfigured: () => opts.pricing !== false,
    createCheckoutSession: async (input) => {
      events.push("createCheckoutSession");
      sessions.push(input);
      if (opts.sessionThrows) throw new Error("session failed");
      return { url: "https://checkout.example/session" };
    },
    log: (message, detail) => {
      logs.push({ message, detail });
    },
  };
  return { deps, events, saved, sessions, logs, state };
}

const OK: SaveCustomerResult = { rows: [{ id: USER.id }], error: null };

// ---- behaviour that must not change ----

test("signed-out request: 401, nothing is read, created or saved", async () => {
  const t = makeDeps({ user: null });
  const out = await processCheckoutRequest(t.deps);
  assert.equal(out.status, 401);
  assert.deepEqual(out.body, { error: "Unauthorized" });
  assert.deepEqual(t.events, []);
});

test("missing profile: 404, no Stripe customer, no session", async () => {
  const t = makeDeps({ profile: null });
  const out = await processCheckoutRequest(t.deps);
  assert.equal(out.status, 404);
  assert.deepEqual(out.body, { error: "Profile not found" });
  assert.equal(t.state.customersCreated, 0);
  assert.equal(t.sessions.length, 0);
});

test("an existing customer id is reused: no new customer, no write, session uses it", async () => {
  const t = makeDeps({ profile: { ...PROFILE_NEW, stripe_customer_id: "cus_existing" } });
  const out = await processCheckoutRequest(t.deps);
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { url: "https://checkout.example/session" });
  assert.equal(t.state.customersCreated, 0);
  assert.equal(t.saved.length, 0);
  assert.deepEqual(t.sessions, [{ customerId: "cus_existing", userId: USER.id }]);
});

test("missing price configuration still returns the original 500 message", async () => {
  const t = makeDeps({ pricing: false });
  const out = await processCheckoutRequest(t.deps);
  assert.equal(out.status, 500);
  assert.deepEqual(out.body, { error: "Stripe pricing not configured" });
  assert.equal(t.sessions.length, 0);
});

test("a Stripe failure returns the generic 500 and creates nothing further", async () => {
  const a = makeDeps({ customerThrows: true });
  const outA = await processCheckoutRequest(a.deps);
  assert.equal(outA.status, 500);
  assert.deepEqual(outA.body, { error: "Failed to create checkout session" });
  assert.equal(a.saved.length, 0);
  assert.equal(a.sessions.length, 0);

  const b = makeDeps({ sessionThrows: true });
  const outB = await processCheckoutRequest(b.deps);
  assert.equal(outB.status, 500);
  assert.deepEqual(outB.body, { error: "Failed to create checkout session" });
});

// ---- the new persistence guarantees ----

test("new customer: saved on the VERIFIED user's profile first, and only then is the session created", async () => {
  const t = makeDeps();
  const out = await processCheckoutRequest(t.deps);
  assert.equal(out.status, 200);
  assert.deepEqual(t.events, ["createCustomer", "saveCustomerId", "createCheckoutSession"]);
  assert.deepEqual(t.saved, [[USER.id, NEW_CUSTOMER_ID]]);
  assert.deepEqual(t.sessions, [{ customerId: NEW_CUSTOMER_ID, userId: USER.id }]);
  assert.equal(t.logs.length, 0);
});

test("a transient save failure is retried once and checkout then continues", async () => {
  const t = makeDeps({ saves: [{ rows: null, error: { code: "57014" } }, OK] });
  const out = await processCheckoutRequest(t.deps);
  assert.equal(out.status, 200);
  assert.equal(t.saved.length, 2);
  assert.equal(t.state.customersCreated, 1, "the Stripe customer is not created again on retry");
  assert.equal(t.sessions.length, 1);
  assert.equal(t.logs.length, 1);
});

const FAILING_SAVES: Array<[string, SaveStep]> = [
  ["database error", { rows: null, error: { code: "42501" } }],
  ["no error but zero matched rows (empty array)", { rows: [], error: null }],
  ["no error but no rows returned (null)", { rows: null, error: null }],
  ["a row for a different profile", { rows: [{ id: "99999999-9999-4999-8999-999999999999" }], error: null }],
  ["more than one row", { rows: [{ id: USER.id }, { id: USER.id }], error: null }],
  ["the save call throws", new Error("connection reset")],
];

for (const [label, step] of FAILING_SAVES) {
  test(`failed persistence (${label}) prevents Checkout Session creation`, async () => {
    const t = makeDeps({ saves: [step] });
    const out = await processCheckoutRequest(t.deps);

    assert.equal(out.status, 503);
    assert.deepEqual(out.body, { error: BILLING_UNAVAILABLE_MESSAGE });

    // The point of the whole change: no session is created after a failed save.
    assert.equal(t.sessions.length, 0, "no Checkout Session was created");
    assert.ok(!t.events.includes("createCheckoutSession"));

    // It was retried the configured number of times, never more, and the Stripe
    // customer itself was created only once.
    assert.equal(t.saved.length, PERSIST_ATTEMPTS);
    assert.equal(t.state.customersCreated, 1);

    // Every attempt was logged with ids and a reason only.
    assert.equal(t.logs.length, PERSIST_ATTEMPTS);
    const first = t.logs[0].detail as Record<string, unknown>;
    assert.equal(first.userId, USER.id);
    assert.equal(first.customerId, NEW_CUSTOMER_ID);
    assert.equal(first.attempt, 1);
    assert.equal(typeof first.reason, "string");
  });
}

test("the zero-rows case is logged as a distinct, explicit reason", async () => {
  const t = makeDeps({ saves: [{ rows: [], error: null }] });
  await processCheckoutRequest(t.deps);
  const reasons = t.logs.map((l) => (l.detail as { reason: string }).reason);
  assert.deepEqual(reasons, ["no_row_matched", "no_row_matched"]);
});

test("persistence failure logs never contain the email, name or error text", async () => {
  const t = makeDeps({ saves: [new Error("duplicate key value for agent@example.com Alex Agent")] });
  await processCheckoutRequest(t.deps);
  const text = JSON.stringify(t.logs);
  assert.ok(!text.includes("agent@example.com"));
  assert.ok(!text.includes("Alex Agent"));
  assert.ok(!text.includes("duplicate key"));
});

test("the user id used for the save always comes from the verified session user", async () => {
  const other = { id: "22222222-2222-4222-8222-222222222222", email: null };
  const t = makeDeps({ user: other, saves: [{ rows: [{ id: other.id }], error: null }] });
  const out = await processCheckoutRequest(t.deps);
  assert.equal(out.status, 200);
  assert.deepEqual(t.saved, [[other.id, NEW_CUSTOMER_ID]]);
  assert.deepEqual(t.sessions, [{ customerId: NEW_CUSTOMER_ID, userId: other.id }]);
});

// ---- source checks: how the real route and the signup page are wired ----
// These read the files; they do not execute the route (next/server cannot be
// imported by this runner). They pin the properties the orchestration tests assume.

const srcDir = process.env.LF_SRC_DIR as string;
const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8").replace(/\r/g, "");

test("checkout route: the only agent_profiles write is the admin-client, id-scoped, row-confirming save", () => {
  const route = read("app/api/stripe/checkout/route.ts");
  assert.equal((route.match(/\.update\(/g) || []).length, 1, "exactly one update call");
  assert.match(
    route,
    /getAdminClient\(\)\s*\.from\("agent_profiles"\)\s*\.update\(\{ stripe_customer_id: customerId \}\)\s*\.eq\("id", userId\)\s*\.select\("id"\)/
  );
  assert.equal((route.match(/\.upsert\(|\.insert\(/g) || []).length, 0);
  // the session client only reads the profile
  assert.match(route, /supabase\s*\.from\("agent_profiles"\)\s*\.select\(/);
  assert.ok(!/@\/lib\/supabase\/client/.test(route), "no browser client import");
});

test("checkout route: takes no request, so the user id cannot come from the request body", () => {
  const route = read("app/api/stripe/checkout/route.ts");
  assert.match(route, /export async function POST\(\)/);
  assert.ok(!/\b(req|request)\.(json|formData|text|headers|nextUrl|url)\b/.test(route), "no request data is read");
  assert.match(route, /processCheckoutRequest\(/);
});

test("signup page: no direct profile write, and the signup name metadata is preserved", () => {
  const page = read("app/signup/page.tsx");
  assert.ok(!/from\(\s*["']agent_profiles["']\s*\)/.test(page), "no agent_profiles table access");
  assert.ok(!/\.upsert\(|\.insert\(/.test(page));
  assert.match(page, /options:\s*\{\s*data:\s*\{\s*name\s*\}/, "name still passed as signup metadata");
  assert.match(page, /emailRedirectTo:\s*`\$\{window\.location\.origin\}\/auth\/callback`/);
  assert.match(page, /identities\?\.length === 0/, "existing-account check kept");
  assert.match(page, /\/api\/stripe\/checkout/, "plan=pro redirect kept");
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
