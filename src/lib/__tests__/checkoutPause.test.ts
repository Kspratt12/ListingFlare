import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BILLING_UNAVAILABLE_MESSAGE, processCheckoutRequest, type CheckoutDeps } from "../stripeCheckout";

// Fakes only: no Stripe, no database, no network.
const USER = { id: "11111111-1111-4111-8111-111111111111", email: "agent@example.com" };

function makeDeps(paused: boolean | undefined) {
  const calls: string[] = [];
  const deps: CheckoutDeps = {
    getUser: async () => {
      calls.push("getUser");
      return USER;
    },
    getProfile: async () => {
      calls.push("getProfile");
      return { stripe_customer_id: null, email: "agent@example.com", name: "Alex" };
    },
    createCustomer: async () => {
      calls.push("createCustomer");
      return { id: "cus_x" };
    },
    saveCustomerId: async () => {
      calls.push("saveCustomerId");
      return { rows: [{ id: USER.id }], error: null };
    },
    isPricingConfigured: () => {
      calls.push("isPricingConfigured");
      return true;
    },
    createCheckoutSession: async () => {
      calls.push("createCheckoutSession");
      return { url: "https://checkout.example/session" };
    },
    log: () => {},
  };
  if (paused !== undefined) deps.paused = () => paused;
  return { deps, calls };
}

test("paused: eligible signed-in request gets 503 and no profile read, customer, save or session happens", async () => {
  const t = makeDeps(true);
  const out = await processCheckoutRequest(t.deps);
  assert.equal(out.status, 503);
  assert.deepEqual(out.body, { error: BILLING_UNAVAILABLE_MESSAGE });
  assert.deepEqual(t.calls, ["getUser"]);
});

test("paused: a signed-out request is still 401 (nothing else runs)", async () => {
  const t = makeDeps(true);
  t.deps.getUser = async () => null;
  const out = await processCheckoutRequest(t.deps);
  assert.equal(out.status, 401);
  assert.deepEqual(t.calls, []);
});

test("not paused (false or not supplied): behaviour is unchanged", async () => {
  for (const flag of [false, undefined]) {
    const t = makeDeps(flag);
    const out = await processCheckoutRequest(t.deps);
    assert.equal(out.status, 200);
    assert.deepEqual(t.calls, [
      "getUser",
      "getProfile",
      "createCustomer",
      "saveCustomerId",
      "isPricingConfigured",
      "createCheckoutSession",
    ]);
  }
});

test("route wires the pause to CHECKOUT_PAUSED === \"on\" only", () => {
  const route = fs.readFileSync(path.join(process.env.LF_SRC_DIR as string, "app/api/stripe/checkout/route.ts"), "utf8");
  assert.match(route, /paused:\s*\(\)\s*=>\s*process\.env\.CHECKOUT_PAUSED === "on"/);
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
